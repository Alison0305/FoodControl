from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

from .models import DetallePedido, Jornada, Pago, Pedido, Producto
from .validators import validar_jornada_abierta


class JornadasApiTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.user = get_user_model().objects.create_user(
            username='vendedor',
            password='contrasena-segura',
        )
        self.client.force_login(self.user)

    def csrf_token(self):
        response = self.client.get(reverse('auth-csrf'))
        return response.cookies['csrftoken'].value

    def post(self, url, data=None):
        return self.client.post(url, data or {}, HTTP_X_CSRFTOKEN=self.csrf_token())

    def patch(self, url, data):
        return self.client.patch(url, data, content_type='application/json', HTTP_X_CSRFTOKEN=self.csrf_token())

    def crear_jornada(self, nombre='Venta familiar', fecha='2026-05-10'):
        return self.post(reverse('jornada-list'), {'nombre': nombre, 'fecha': fecha})

    def test_crea_jornada_asignando_usuario_autenticado(self):
        response = self.crear_jornada()

        self.assertEqual(response.status_code, 201)
        jornada = Jornada.objects.get(pk=response.json()['id'])
        self.assertEqual(jornada.creado_por, self.user)
        self.assertEqual(jornada.estado, Jornada.Estado.ABIERTA)

    def test_lista_y_consulta_jornadas_por_fecha_descendente(self):
        reciente = Jornada.objects.create(nombre='Reciente', fecha=date(2026, 5, 12), creado_por=self.user)
        Jornada.objects.create(nombre='Anterior', fecha=date(2026, 5, 10), creado_por=self.user)

        list_response = self.client.get(reverse('jornada-list'))
        detail_response = self.client.get(reverse('jornada-detail', args=[reciente.id]))

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()[0]['id'], reciente.id)
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()['nombre'], reciente.nombre)

    def test_edita_jornada_abierta(self):
        jornada = Jornada.objects.create(nombre='Original', fecha=date(2026, 5, 10), creado_por=self.user)

        response = self.patch(
            reverse('jornada-detail', args=[jornada.id]),
            {'nombre': 'Venta actualizada', 'fecha': '2026-05-11'},
        )

        self.assertEqual(response.status_code, 200)
        jornada.refresh_from_db()
        self.assertEqual(jornada.nombre, 'Venta actualizada')
        self.assertEqual(jornada.fecha, date(2026, 5, 11))

    def test_rechaza_nombre_vacio_y_fecha_invalida(self):
        empty_name_response = self.crear_jornada(nombre='   ')
        invalid_date_response = self.crear_jornada(fecha='fecha-invalida')

        self.assertEqual(empty_name_response.status_code, 400)
        self.assertIn('nombre', empty_name_response.json())
        self.assertEqual(invalid_date_response.status_code, 400)
        self.assertIn('fecha', invalid_date_response.json())

    def test_cierra_y_reabre_jornada(self):
        jornada = Jornada.objects.create(nombre='Venta', fecha=date(2026, 5, 10), creado_por=self.user)

        close_response = self.post(reverse('jornada-cerrar', args=[jornada.id]))
        jornada.refresh_from_db()
        reopen_response = self.post(reverse('jornada-abrir', args=[jornada.id]))

        self.assertEqual(close_response.status_code, 200)
        self.assertEqual(jornada.estado, Jornada.Estado.CERRADA)
        self.assertEqual(reopen_response.status_code, 200)
        self.assertEqual(reopen_response.json()['estado'], Jornada.Estado.ABIERTA)

    def test_rechaza_edicion_y_operaciones_sobre_jornada_cerrada(self):
        jornada = Jornada.objects.create(
            nombre='Cerrada',
            fecha=date(2026, 5, 10),
            estado=Jornada.Estado.CERRADA,
            creado_por=self.user,
        )

        edit_response = self.patch(reverse('jornada-detail', args=[jornada.id]), {'nombre': 'Cambio'})

        self.assertEqual(edit_response.status_code, 400)
        with self.assertRaisesMessage(Exception, 'La jornada está cerrada'):
            validar_jornada_abierta(jornada)

    def test_elimina_jornada_y_registros_asociados_sin_afectar_otros(self):
        jornada = Jornada.objects.create(nombre='Venta', fecha=date(2026, 5, 10), creado_por=self.user)
        otra_jornada = Jornada.objects.create(nombre='Otra venta', fecha=date(2026, 5, 11), creado_por=self.user)
        producto = Producto.objects.create(
            jornada=jornada,
            nombre='Producto de prueba',
            tipo=Producto.Tipo.PLATO,
            precio=Decimal('10.00'),
        )
        pedido = Pedido.objects.create(
            jornada=jornada,
            nombre_cliente='Cliente de prueba',
            tipo=Pedido.Tipo.VENTA_DIRECTA,
            registrado_por=self.user,
        )
        DetallePedido.objects.create(
            pedido=pedido,
            producto=producto,
            cantidad=1,
            precio_unitario=Decimal('10.00'),
        )
        Pago.objects.create(
            pedido=pedido,
            monto=Decimal('10.00'),
            metodo=Pago.Metodo.EFECTIVO,
            registrado_por=self.user,
        )

        delete_response = self.client.delete(
            reverse('jornada-detail', args=[jornada.id]),
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )

        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(Jornada.objects.filter(pk=jornada.id).exists())
        self.assertFalse(Producto.objects.filter(jornada_id=jornada.id).exists())
        self.assertFalse(Pedido.objects.filter(jornada_id=jornada.id).exists())
        self.assertFalse(DetallePedido.objects.filter(pedido_id=pedido.id).exists())
        self.assertFalse(Pago.objects.filter(pedido_id=pedido.id).exists())
        self.assertTrue(Jornada.objects.filter(pk=otra_jornada.id).exists())
        self.assertTrue(get_user_model().objects.filter(pk=self.user.id).exists())

    def test_rechaza_cambio_directo_de_estado(self):
        jornada = Jornada.objects.create(nombre='Venta', fecha=date(2026, 5, 10), creado_por=self.user)
        state_response = self.patch(reverse('jornada-detail', args=[jornada.id]), {'estado': Jornada.Estado.CERRADA})

        self.assertEqual(state_response.status_code, 400)
        jornada.refresh_from_db()
        self.assertEqual(jornada.estado, Jornada.Estado.ABIERTA)

    def test_rechaza_solicitudes_sin_autenticacion_y_sin_csrf(self):
        anonymous = Client(enforce_csrf_checks=True)
        unauthenticated_response = anonymous.get(reverse('jornada-list'))
        csrf_response = self.client.post(
            reverse('jornada-list'),
            {'nombre': 'Sin CSRF', 'fecha': '2026-05-10'},
        )

        self.assertEqual(unauthenticated_response.status_code, 403)
        self.assertEqual(csrf_response.status_code, 403)
