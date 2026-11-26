from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

from .models import DetallePedido, Jornada, Pago, Pedido, Producto


class PedidosApiTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.user = get_user_model().objects.create_user(username='pedidos', password='secreta')
        self.client.force_login(self.user)
        self.jornada = Jornada.objects.create(nombre='Venta', fecha=date(2026, 7, 1), creado_por=self.user)
        self.plato = Producto.objects.create(jornada=self.jornada, nombre='Plato', tipo='plato', precio=Decimal('20.00'))
        self.bebida = Producto.objects.create(jornada=self.jornada, nombre='Bebida', tipo='bebida', precio=Decimal('5.00'))

    def post(self, url, data):
        token = self.client.get(reverse('auth-csrf')).cookies['csrftoken'].value
        return self.client.post(url, data, content_type='application/json', HTTP_X_CSRFTOKEN=token)

    def patch(self, url, data):
        token = self.client.get(reverse('auth-csrf')).cookies['csrftoken'].value
        return self.client.patch(url, data, content_type='application/json', HTTP_X_CSRFTOKEN=token)

    def data(self, **changes):
        data = {'nombre_cliente': 'Ana', 'tipo': 'reserva', 'observaciones': '', 'detalles': [{'producto_id': self.plato.id, 'cantidad': 2}, {'producto_id': self.bebida.id, 'cantidad': 1}]}
        data.update(changes)
        return data

    def test_crea_reserva_con_precios_historicos_usuario_y_estado(self):
        response = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data())
        self.assertEqual(response.status_code, 201)
        pedido = Pedido.objects.get()
        self.assertEqual(pedido.estado, Pedido.Estado.EN_ESPERA)
        self.assertEqual(pedido.registrado_por, self.user)
        self.assertEqual(DetallePedido.objects.get(producto=self.plato).precio_unitario, Decimal('20.00'))

    def test_ventas_directas_tienen_identificadores_distintos(self):
        first = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data(tipo='venta_directa', detalles=[{'producto_id': self.plato.id, 'cantidad': 1}]))
        second = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data(tipo='venta_directa', detalles=[{'producto_id': self.plato.id, 'cantidad': 1}]))
        self.assertNotEqual(first.json()['id'], second.json()['id'])

    def test_rechaza_datos_invalidos_e_inactivos(self):
        self.plato.activo = False; self.plato.save()
        for data in (self.data(nombre_cliente=' '), self.data(detalles=[]), self.data(detalles=[{'producto_id': self.bebida.id, 'cantidad': 0}]), self.data(detalles=[{'producto_id': self.bebida.id, 'cantidad': 1}, {'producto_id': self.bebida.id, 'cantidad': 1}]), self.data(detalles=[{'producto_id': self.plato.id, 'cantidad': 1}])):
            self.assertEqual(self.post(reverse('pedido-list', args=[self.jornada.id]), data).status_code, 400)
        self.assertEqual(Pedido.objects.count(), 0)

    def test_rechaza_producto_de_otra_jornada_y_jornada_cerrada(self):
        other = Jornada.objects.create(nombre='Otra', fecha=date(2026, 7, 2), creado_por=self.user)
        other_product = Producto.objects.create(jornada=other, nombre='Otro', tipo='plato', precio=Decimal('1.00'))
        self.assertEqual(self.post(reverse('pedido-list', args=[self.jornada.id]), self.data(detalles=[{'producto_id': other_product.id, 'cantidad': 1}])).status_code, 400)
        self.jornada.estado = 'cerrada'; self.jornada.save()
        self.assertEqual(self.post(reverse('pedido-list', args=[self.jornada.id]), self.data()).status_code, 400)

    def test_edita_conservando_precio_y_rechaza_estado_final(self):
        created = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data()).json()
        self.plato.precio = Decimal('30.00'); self.plato.save()
        response = self.patch(reverse('pedido-detail', args=[created['id']]), self.data(nombre_cliente='Ana María', detalles=[{'producto_id': self.plato.id, 'cantidad': 3}]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(DetallePedido.objects.get(producto=self.plato).precio_unitario, Decimal('20.00'))
        pedido = Pedido.objects.get(); pedido.estado = Pedido.Estado.ENTREGADO; pedido.save()
        self.assertEqual(self.patch(reverse('pedido-detail', args=[pedido.id]), self.data()).status_code, 400)

    def test_lista_por_jornada_y_protecciones_http(self):
        created = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data()).json()
        other = Jornada.objects.create(nombre='Otra', fecha=date(2026, 7, 2), creado_por=self.user)
        self.assertEqual(len(self.client.get(reverse('pedido-list', args=[other.id])).json()), 0)
        self.assertEqual(self.client.get(reverse('pedido-detail', args=[created['id']])).status_code, 200)
        self.assertEqual(self.client.get(reverse('pedido-detail', args=[99999])).status_code, 404)
        self.assertEqual(self.client.post(reverse('pedido-list', args=[self.jornada.id]), self.data()).status_code, 403)

    def test_observaciones_opcionales_y_campos_protegidos(self):
        data = self.data(observaciones='Sin cebolla'); data.pop('observaciones')
        created = self.post(reverse('pedido-list', args=[self.jornada.id]), data).json()
        pedido = Pedido.objects.get()
        self.assertEqual(pedido.observaciones, '')
        pedido.observaciones = 'Sin cebolla'; pedido.save()
        update = self.data(nombre_cliente='Ana actualizada'); update.pop('observaciones')
        self.assertEqual(self.patch(reverse('pedido-detail', args=[created['id']]), update).status_code, 200)
        pedido.refresh_from_db(); self.assertEqual(pedido.observaciones, 'Sin cebolla')
        self.assertEqual(self.patch(reverse('pedido-detail', args=[pedido.id]), self.data(estado='entregado')).status_code, 400)

    def test_rechaza_cantidades_decimales_y_fuera_de_rango(self):
        for cantidad in (-1, 1.5, 2147483648):
            response = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data(detalles=[{'producto_id': self.plato.id, 'cantidad': cantidad}]))
            self.assertEqual(response.status_code, 400)

    def test_precios_historicos_productos_desactivados_y_pagos(self):
        created = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data(detalles=[{'producto_id': self.plato.id, 'cantidad': 1}])).json()
        pedido = Pedido.objects.get(); self.plato.activo = False; self.plato.precio = Decimal('50.00'); self.plato.save()
        self.assertEqual(self.patch(reverse('pedido-detail', args=[pedido.id]), self.data(detalles=[{'producto_id': self.plato.id, 'cantidad': 2}])).status_code, 200)
        self.assertEqual(DetallePedido.objects.get().precio_unitario, Decimal('20.00'))
        Pago.objects.create(pedido=pedido, monto=Decimal('1.00'), metodo='efectivo', registrado_por=self.user)
        response = self.patch(reverse('pedido-detail', args=[pedido.id]), self.data(detalles=[{'producto_id': self.plato.id, 'cantidad': 3}]))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Pago.objects.filter(pedido=pedido).count(), 1)

    def test_ignora_precios_manipulados_y_revierte_creacion_intermedia(self):
        response = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data(detalles=[{'producto_id': self.plato.id, 'cantidad': 1, 'precio_unitario': '0.01'}]))
        self.assertEqual(response.status_code, 201)
        self.assertEqual(DetallePedido.objects.get().precio_unitario, Decimal('20.00'))
        self.bebida.activo = False; self.bebida.save()
        response = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data(nombre_cliente='Otra', detalles=[{'producto_id': self.plato.id, 'cantidad': 1}, {'producto_id': self.bebida.id, 'cantidad': 1}]))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Pedido.objects.count(), 1)

    def test_revierte_edicion_si_falla_despues_de_actualizar_detalle(self):
        created = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data(nombre_cliente='Original', detalles=[{'producto_id': self.plato.id, 'cantidad': 1}])).json()
        self.bebida.activo = False; self.bebida.save()

        response = self.patch(reverse('pedido-detail', args=[created['id']]), self.data(nombre_cliente='Modificado', detalles=[{'producto_id': self.plato.id, 'cantidad': 4}, {'producto_id': self.bebida.id, 'cantidad': 1}]))

        self.assertEqual(response.status_code, 400)
        pedido = Pedido.objects.get(pk=created['id'])
        self.assertEqual(pedido.nombre_cliente, 'Original')
        self.assertEqual(list(pedido.detalles.values_list('producto_id', 'cantidad')), [(self.plato.id, 1)])

    def test_calcula_subtotales_total_y_cantidad_con_precision_decimal(self):
        self.plato.precio = Decimal('25.00'); self.plato.save()
        response = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data(detalles=[{'producto_id': self.plato.id, 'cantidad': 3}, {'producto_id': self.bebida.id, 'cantidad': 2}]))
        data = response.json()
        self.assertEqual(data['total'], '85.00')
        self.assertEqual(data['cantidad_total'], 5)
        self.assertEqual([detail['subtotal'] for detail in data['detalles']], ['75.00', '10.00'])
        self.plato.precio = Decimal('30.00'); self.plato.save()
        detail = self.client.get(reverse('pedido-detail', args=[data['id']])).json()
        self.assertEqual(detail['total'], '85.00')

    def test_centavos_cero_nuevos_productos_y_pago_superior_al_total(self):
        self.plato.precio = Decimal('0.10'); self.plato.save()
        self.bebida.precio = Decimal('0.00'); self.bebida.save()
        created = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data(detalles=[{'producto_id': self.plato.id, 'cantidad': 3}, {'producto_id': self.bebida.id, 'cantidad': 1}])).json()
        self.assertEqual(created['total'], '0.30')
        self.assertEqual(created['detalles'][1]['subtotal'], '0.00')
        pedido = Pedido.objects.get(pk=created['id'])
        Pago.objects.create(pedido=pedido, monto=Decimal('0.30'), metodo='efectivo', registrado_por=self.user)
        response = self.patch(reverse('pedido-detail', args=[pedido.id]), self.data(detalles=[{'producto_id': self.plato.id, 'cantidad': 2}]))
        self.assertEqual(response.status_code, 400)
        self.assertIn('importe ya pagado', response.json()['detalles'])
        self.assertEqual(Pago.objects.filter(pedido=pedido).count(), 1)

    def test_busqueda_filtros_estado_pago_y_ordenamiento(self):
        first = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data(nombre_cliente='José Castro', tipo='reserva', detalles=[{'producto_id': self.plato.id, 'cantidad': 1}])).json()
        second = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data(nombre_cliente='Mabel Castro', tipo='venta_directa', detalles=[{'producto_id': self.bebida.id, 'cantidad': 3}])).json()
        pedido = Pedido.objects.get(pk=second['id'])
        Pago.objects.create(pedido=pedido, monto=Decimal('5.00'), metodo='efectivo', registrado_por=self.user)
        url = reverse('pedido-list', args=[self.jornada.id])
        self.assertEqual([item['id'] for item in self.client.get(f'{url}?busqueda=jose').json()], [first['id']])
        self.assertEqual([item['id'] for item in self.client.get(f'{url}?busqueda=%23{first["id"]}').json()], [first['id']])
        self.assertEqual(self.client.get(f'{url}?busqueda=999999999999999999999').json(), [])
        self.assertEqual([item['id'] for item in self.client.get(f'{url}?tipo=venta_directa&estado_pago=parcial').json()], [second['id']])
        self.assertEqual(self.client.get(f'{url}?orden=invalido').status_code, 400)

    def test_listado_no_mezcla_jornadas_y_pedidos_gratuitos_pagados(self):
        self.plato.precio = Decimal('0.00'); self.plato.save()
        free = self.post(reverse('pedido-list', args=[self.jornada.id]), self.data(detalles=[{'producto_id': self.plato.id, 'cantidad': 1}])).json()
        other = Jornada.objects.create(nombre='Otra', fecha=date(2026, 8, 1), creado_por=self.user)
        self.assertEqual(self.client.get(f'{reverse("pedido-list", args=[self.jornada.id])}?estado_pago=pagado').json()[0]['id'], free['id'])
        self.assertEqual(self.client.get(reverse('pedido-list', args=[other.id])).json(), [])
