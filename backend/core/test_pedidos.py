from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

from .models import DetallePedido, Jornada, Pedido, Producto


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
