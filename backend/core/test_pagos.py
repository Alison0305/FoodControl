from datetime import date
from decimal import Decimal
from threading import Barrier, Thread
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.db import close_old_connections, connections
from django.db.migrations.executor import MigrationExecutor
from django.test import Client, TransactionTestCase, TestCase
from django.urls import reverse
from rest_framework.exceptions import ValidationError

from .models import DetallePedido, Jornada, Pago, Pedido, Producto
from .services import cambiar_estado_pedido, guardar_pedido, registrar_pago


class PagosApiTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.user = get_user_model().objects.create_user(username='pagos_api', password='secreta')
        self.client.force_login(self.user)
        self.jornada = Jornada.objects.create(nombre='Pagos', fecha=date(2026, 10, 1), creado_por=self.user)
        self.producto = Producto.objects.create(jornada=self.jornada, nombre='Menú', tipo='plato', precio=Decimal('100.00'))
        self.pedido = Pedido.objects.create(jornada=self.jornada, nombre_cliente='Ana', tipo='reserva', registrado_por=self.user)
        DetallePedido.objects.create(pedido=self.pedido, producto=self.producto, cantidad=1, precio_unitario=Decimal('100.00'))

    def post(self, url, data):
        token = self.client.get(reverse('auth-csrf')).cookies['csrftoken'].value
        return self.client.post(url, data, content_type='application/json', HTTP_X_CSRFTOKEN=token)

    def pago(self, monto, metodo='efectivo', identificador=None):
        return self.post(reverse('pago-list', args=[self.pedido.id]), {
            'monto': monto, 'metodo': metodo, 'identificador_idempotencia': str(identificador or uuid4()),
        })

    def test_registra_efectivo_qr_adelanto_y_pago_mixto(self):
        first = self.pago('40.00', 'qr')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.json()['monto'], '40.00')
        self.assertEqual(self.pago('60.00', 'efectivo').status_code, 201)
        resumen = self.client.get(reverse('pago-list', args=[self.pedido.id])).json()['pedido']
        self.assertEqual(resumen['total_pagado'], '100.00')
        self.assertEqual(resumen['saldo_pendiente'], '0.00')
        self.assertEqual(resumen['estado_pago'], 'pagado')

    def test_centavos_y_montos_invalidos(self):
        self.assertEqual(self.pago('33.33').status_code, 201)
        resumen = self.client.get(reverse('pago-list', args=[self.pedido.id])).json()['pedido']
        self.assertEqual(resumen['saldo_pendiente'], '66.67')
        for monto in ('0.00', '-1.00', '1.001', '66.68'):
            self.assertEqual(self.pago(monto).status_code, 400)

    def test_idempotencia_y_conflicto_de_datos(self):
        identificador = uuid4()
        first = self.pago('40.00', identificador=identificador)
        second = self.pago('40.00', identificador=identificador)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(Pago.objects.count(), 1)
        self.assertEqual(self.pago('41.00', identificador=identificador).status_code, 400)
        otro = Pedido.objects.create(jornada=self.jornada, nombre_cliente='Otro', tipo='reserva', registrado_por=self.user)
        DetallePedido.objects.create(pedido=otro, producto=self.producto, cantidad=1, precio_unitario=Decimal('100.00'))
        response = self.post(reverse('pago-list', args=[otro.id]), {'monto': '40.00', 'metodo': 'efectivo', 'identificador_idempotencia': str(identificador)})
        self.assertEqual(response.status_code, 400)

    def test_anulacion_historial_saldo_y_cancelacion(self):
        pago = self.pago('40.00').json()
        url = reverse('pago-anular', args=[pago['id']])
        self.assertEqual(self.post(url, {'motivo_anulacion': '   '}).status_code, 400)
        self.assertEqual(self.post(url, {'motivo_anulacion': 'Cobro duplicado'}).status_code, 200)
        self.assertEqual(self.post(url, {'motivo_anulacion': 'Otra vez'}).status_code, 400)
        historial = self.client.get(reverse('pago-list', args=[self.pedido.id])).json()
        self.assertEqual(len(historial['pagos']), 1)
        self.assertEqual(historial['pagos'][0]['estado'], 'anulado')
        self.assertEqual(historial['pedido']['saldo_pendiente'], '100.00')
        self.assertEqual(self.post(reverse('pedido-estado', args=[self.pedido.id]), {'estado': 'cancelado'}).status_code, 200)

    def test_reutiliza_uuid_anulado_sin_reactivar_ni_duplicar(self):
        identificador = uuid4()
        pago = self.pago('40.00', identificador=identificador).json()
        self.assertEqual(self.post(reverse('pago-anular', args=[pago['id']]), {'motivo_anulacion': 'Error'}).status_code, 200)
        repeated = self.pago('40.00', identificador=identificador)
        self.assertEqual(repeated.status_code, 201)
        self.assertEqual(Pago.objects.count(), 1)
        self.assertEqual(Pago.objects.get().estado, Pago.Estado.ANULADO)

    def test_estado_operativo_jornada_y_autenticacion_csrf(self):
        self.assertEqual(self.post(reverse('pedido-estado', args=[self.pedido.id]), {'estado': 'en_preparacion'}).status_code, 200)
        self.assertEqual(self.post(reverse('pedido-estado', args=[self.pedido.id]), {'estado': 'entregado'}).status_code, 200)
        self.assertEqual(self.pago('40.00').status_code, 201)
        self.jornada.estado = Jornada.Estado.CERRADA; self.jornada.save()
        self.assertEqual(self.pago('1.00').status_code, 400)
        pago = Pago.objects.get()
        self.assertEqual(self.post(reverse('pago-anular', args=[pago.id]), {'motivo_anulacion': 'Error'}).status_code, 400)
        anonymous = Client(enforce_csrf_checks=True)
        self.assertEqual(anonymous.post(reverse('pago-list', args=[self.pedido.id]), {}, content_type='application/json').status_code, 403)
        self.assertEqual(self.client.post(reverse('pago-list', args=[self.pedido.id]), {}, content_type='application/json').status_code, 403)

    def test_rechaza_cancelado_y_edicion_bajo_importe_pagado(self):
        self.assertEqual(self.pago('80.00').status_code, 201)
        data = {'nombre_cliente': 'Ana', 'tipo': 'reserva', 'observaciones': '', 'detalles': [{'producto_id': self.producto.id, 'cantidad': 0}]}
        self.assertEqual(self.client.patch(reverse('pedido-detail', args=[self.pedido.id]), data, content_type='application/json', HTTP_X_CSRFTOKEN=self.client.get(reverse('auth-csrf')).cookies['csrftoken'].value).status_code, 400)
        self.pedido.estado = Pedido.Estado.CANCELADO; self.pedido.save()
        self.assertEqual(self.pago('1.00').status_code, 400)


class PagosConcurrenciaTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.user = get_user_model().objects.create_user(username='pagos_concurrentes')
        jornada = Jornada.objects.create(nombre='Concurrente', fecha=date(2026, 10, 2), creado_por=self.user)
        producto = Producto.objects.create(jornada=jornada, nombre='Menú', tipo='plato', precio=Decimal('100.00'))
        self.pedido = Pedido.objects.create(jornada=jornada, nombre_cliente='Ana', tipo='reserva', registrado_por=self.user)
        DetallePedido.objects.create(pedido=self.pedido, producto=producto, cantidad=1, precio_unitario=Decimal('100.00'))
        self.producto = producto

    def run_concurrently(self, *operations):
        barrier = Barrier(len(operations))
        results = []

        def run(operation):
            close_old_connections()
            try:
                barrier.wait()
                operation()
                results.append('ok')
            except ValidationError:
                results.append('conflicto')
            finally:
                connections['default'].close()

        threads = [Thread(target=run, args=(operation,)) for operation in operations]
        for thread in threads: thread.start()
        for thread in threads: thread.join()
        return results

    def test_pagos_simultaneos_no_sobrepagan(self):
        def cobrar(metodo):
            pedido = Pedido.objects.get(pk=self.pedido.id)
            user = get_user_model().objects.get(pk=self.user.id)
            registrar_pago(pedido=pedido, usuario=user, monto=Decimal('80.00'), metodo=metodo, identificador=uuid4())

        results = self.run_concurrently(lambda: cobrar('efectivo'), lambda: cobrar('qr'))
        total = sum(Pago.objects.filter(pedido=self.pedido, estado=Pago.Estado.VIGENTE).values_list('monto', flat=True), Decimal('0.00'))
        self.assertLessEqual(total, Decimal('100.00'))
        self.assertIn('ok', results)
        self.assertEqual(len(results), 2)

    def test_cobro_y_cancelacion_simultaneos_no_dejan_pago_en_pedido_cancelado(self):
        def cobrar():
            registrar_pago(pedido=Pedido.objects.get(pk=self.pedido.id), usuario=get_user_model().objects.get(pk=self.user.id), monto=Decimal('80.00'), metodo='efectivo', identificador=uuid4())

        def cancelar():
            cambiar_estado_pedido(Pedido.objects.get(pk=self.pedido.id), Pedido.Estado.CANCELADO)

        self.run_concurrently(cobrar, cancelar)
        pedido = Pedido.objects.get(pk=self.pedido.id)
        pagos_vigentes = Pago.objects.filter(pedido=pedido, estado=Pago.Estado.VIGENTE).exists()
        self.assertFalse(pedido.estado == Pedido.Estado.CANCELADO and pagos_vigentes)

    def test_cobro_y_edicion_simultaneos_no_reducen_total_bajo_pago(self):
        producto_menor = Producto.objects.create(jornada=self.pedido.jornada, nombre='Menú menor', tipo='plato', precio=Decimal('50.00'))
        datos = {
            'nombre_cliente': self.pedido.nombre_cliente,
            'tipo': self.pedido.tipo,
            'observaciones': '',
            'detalles': [{'producto_id': producto_menor.id, 'cantidad': 1}],
        }

        def cobrar():
            registrar_pago(pedido=Pedido.objects.get(pk=self.pedido.id), usuario=get_user_model().objects.get(pk=self.user.id), monto=Decimal('80.00'), metodo='qr', identificador=uuid4())

        def editar():
            guardar_pedido(jornada=Jornada.objects.get(pk=self.pedido.jornada_id), usuario=get_user_model().objects.get(pk=self.user.id), datos=datos, pedido=Pedido.objects.get(pk=self.pedido.id))

        self.run_concurrently(cobrar, editar)
        pedido = Pedido.objects.prefetch_related('detalles', 'pagos').get(pk=self.pedido.id)
        total = sum((detalle.cantidad * detalle.precio_unitario for detalle in pedido.detalles.all()), Decimal('0.00'))
        pagado = sum((pago.monto for pago in pedido.pagos.all() if pago.estado == Pago.Estado.VIGENTE), Decimal('0.00'))
        self.assertGreaterEqual(total, pagado)


class PagoMigracionTests(TransactionTestCase):
    migrate_from = ('core', '0001_initial')
    migrate_to = ('core', '0002_pago_anulaciones_idempotencia')

    def test_migracion_conserva_pagos_y_asigna_uuid_distintos(self):
        executor = MigrationExecutor(connections['default'])
        executor.migrate([self.migrate_from])
        old_apps = executor.loader.project_state([self.migrate_from]).apps
        User = old_apps.get_model('auth', 'User')
        JornadaOld = old_apps.get_model('core', 'Jornada')
        ProductoOld = old_apps.get_model('core', 'Producto')
        PedidoOld = old_apps.get_model('core', 'Pedido')
        PagoOld = old_apps.get_model('core', 'Pago')
        user = User.objects.create(username='migracion_pago')
        jornada = JornadaOld.objects.create(nombre='Legado', fecha=date(2026, 10, 3), creado_por_id=user.id)
        producto = ProductoOld.objects.create(jornada_id=jornada.id, nombre='Menú', tipo='plato', precio=Decimal('10.00'))
        pedido = PedidoOld.objects.create(jornada_id=jornada.id, nombre_cliente='Ana', tipo='reserva', registrado_por_id=user.id)
        PagoOld.objects.create(pedido_id=pedido.id, monto=Decimal('1.00'), metodo='efectivo', registrado_por_id=user.id)
        PagoOld.objects.create(pedido_id=pedido.id, monto=Decimal('2.00'), metodo='qr', registrado_por_id=user.id)
        executor = MigrationExecutor(connections['default'])
        executor.migrate([self.migrate_to])
        PagoNuevo = executor.loader.project_state([self.migrate_to]).apps.get_model('core', 'Pago')
        pagos = list(PagoNuevo.objects.order_by('monto'))
        self.assertEqual([pago.monto for pago in pagos], [Decimal('1.00'), Decimal('2.00')])
        self.assertEqual([pago.estado for pago in pagos], ['vigente', 'vigente'])
        self.assertNotEqual(pagos[0].identificador_idempotencia, pagos[1].identificador_idempotencia)
