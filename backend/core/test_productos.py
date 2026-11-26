from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

from .models import DetallePedido, Jornada, Pedido, Producto
from .validators import productos_activos_de_jornada


class ProductosApiTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.user = get_user_model().objects.create_user(
            username='menu_usuario',
            password='contrasena-segura',
        )
        self.client.force_login(self.user)
        self.jornada = Jornada.objects.create(
            nombre='Venta principal',
            fecha=date(2026, 6, 1),
            creado_por=self.user,
        )

    def csrf_token(self):
        response = self.client.get(reverse('auth-csrf'))
        return response.cookies['csrftoken'].value

    def post(self, url, data=None):
        return self.client.post(url, data or {}, HTTP_X_CSRFTOKEN=self.csrf_token())

    def patch(self, url, data):
        return self.client.patch(url, data, content_type='application/json', HTTP_X_CSRFTOKEN=self.csrf_token())

    def delete(self, url):
        return self.client.delete(url, HTTP_X_CSRFTOKEN=self.csrf_token())

    def crear_producto(self, **overrides):
        data = {'nombre': 'Sopa de maní', 'tipo': Producto.Tipo.PLATO, 'precio': '15.00'}
        data.update(overrides)
        return self.post(reverse('producto-list', args=[self.jornada.id]), data)

    def test_crea_platos_y_bebidas_activos(self):
        plato_response = self.crear_producto()
        bebida_response = self.crear_producto(nombre='Refresco', tipo=Producto.Tipo.BEBIDA, precio='5.00')

        self.assertEqual(plato_response.status_code, 201)
        self.assertEqual(bebida_response.status_code, 201)
        self.assertTrue(plato_response.json()['activo'])
        self.assertEqual(bebida_response.json()['tipo'], Producto.Tipo.BEBIDA)

    def test_lista_consulta_e_independencia_entre_jornadas(self):
        producto = Producto.objects.create(jornada=self.jornada, nombre='Plato', tipo=Producto.Tipo.PLATO, precio=Decimal('12.00'))
        otra_jornada = Jornada.objects.create(nombre='Otra venta', fecha=date(2026, 6, 2), creado_por=self.user)
        Producto.objects.create(jornada=otra_jornada, nombre='Bebida ajena', tipo=Producto.Tipo.BEBIDA, precio=Decimal('4.00'))

        list_response = self.client.get(reverse('producto-list', args=[self.jornada.id]))
        detail_response = self.client.get(reverse('producto-detail', args=[producto.id]))

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual([item['id'] for item in list_response.json()], [producto.id])
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()['jornada'], self.jornada.id)

    def test_filtra_por_tipo_y_estado_activo(self):
        plato = Producto.objects.create(jornada=self.jornada, nombre='Plato', tipo=Producto.Tipo.PLATO, precio=Decimal('12.00'))
        Producto.objects.create(jornada=self.jornada, nombre='Bebida', tipo=Producto.Tipo.BEBIDA, precio=Decimal('4.00'), activo=False)

        type_response = self.client.get(f"{reverse('producto-list', args=[self.jornada.id])}?tipo=plato")
        active_response = self.client.get(f"{reverse('producto-list', args=[self.jornada.id])}?activo=true")
        inactive_response = self.client.get(f"{reverse('producto-list', args=[self.jornada.id])}?activo=false")

        self.assertEqual([item['id'] for item in type_response.json()], [plato.id])
        self.assertEqual([item['id'] for item in active_response.json()], [plato.id])
        self.assertEqual(len(inactive_response.json()), 1)
        self.assertEqual(list(productos_activos_de_jornada(self.jornada)), [plato])

    def test_edita_nombre_y_precio_sin_alterar_precio_historico(self):
        producto = Producto.objects.create(jornada=self.jornada, nombre='Plato', tipo=Producto.Tipo.PLATO, precio=Decimal('12.00'))
        pedido = Pedido.objects.create(
            jornada=self.jornada,
            nombre_cliente='Cliente',
            tipo=Pedido.Tipo.VENTA_DIRECTA,
            registrado_por=self.user,
        )
        detalle = DetallePedido.objects.create(pedido=pedido, producto=producto, cantidad=1, precio_unitario=Decimal('12.00'))

        response = self.patch(reverse('producto-detail', args=[producto.id]), {'nombre': 'Plato especial', 'precio': '15.50'})

        self.assertEqual(response.status_code, 200)
        producto.refresh_from_db()
        detalle.refresh_from_db()
        self.assertEqual(producto.nombre, 'Plato especial')
        self.assertEqual(producto.precio, Decimal('15.50'))
        self.assertEqual(detalle.precio_unitario, Decimal('12.00'))

    def test_rechaza_datos_invalidos_y_acepta_precio_cero(self):
        empty_response = self.crear_producto(nombre='   ')
        negative_response = self.crear_producto(precio='-0.01')
        precision_response = self.crear_producto(precio='1.999')
        type_response = self.crear_producto(tipo='postre')
        zero_response = self.crear_producto(nombre='Agua', tipo=Producto.Tipo.BEBIDA, precio='0.00')

        self.assertEqual(empty_response.status_code, 400)
        self.assertEqual(negative_response.status_code, 400)
        self.assertEqual(precision_response.status_code, 400)
        self.assertEqual(type_response.status_code, 400)
        self.assertEqual(zero_response.status_code, 201)
        self.assertEqual(zero_response.json()['precio'], '0.00')

    def test_activa_y_desactiva_producto(self):
        producto = Producto.objects.create(jornada=self.jornada, nombre='Plato', tipo=Producto.Tipo.PLATO, precio=Decimal('12.00'))

        deactivate_response = self.post(reverse('producto-desactivar', args=[producto.id]))
        activate_response = self.post(reverse('producto-activar', args=[producto.id]))

        self.assertEqual(deactivate_response.status_code, 200)
        self.assertFalse(deactivate_response.json()['activo'])
        self.assertEqual(activate_response.status_code, 200)
        self.assertTrue(activate_response.json()['activo'])

    def test_elimina_producto_sin_pedidos_y_rechaza_con_pedidos(self):
        removable = Producto.objects.create(jornada=self.jornada, nombre='Bebida', tipo=Producto.Tipo.BEBIDA, precio=Decimal('4.00'))
        protected = Producto.objects.create(jornada=self.jornada, nombre='Plato', tipo=Producto.Tipo.PLATO, precio=Decimal('12.00'))
        pedido = Pedido.objects.create(jornada=self.jornada, nombre_cliente='Cliente', tipo=Pedido.Tipo.RESERVA, registrado_por=self.user)
        DetallePedido.objects.create(pedido=pedido, producto=protected, cantidad=1, precio_unitario=Decimal('12.00'))

        delete_response = self.delete(reverse('producto-detail', args=[removable.id]))
        protected_response = self.delete(reverse('producto-detail', args=[protected.id]))

        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(Producto.objects.filter(pk=removable.id).exists())
        self.assertEqual(protected_response.status_code, 409)
        self.assertIn('Puede desactivarlo', protected_response.json()['detail'])

    def test_rechaza_operaciones_y_cambios_de_jornada_cerrada(self):
        self.jornada.estado = Jornada.Estado.CERRADA
        self.jornada.save(update_fields=['estado'])
        producto = Producto.objects.create(jornada=self.jornada, nombre='Plato', tipo=Producto.Tipo.PLATO, precio=Decimal('12.00'))

        create_response = self.crear_producto(nombre='Nuevo')
        edit_response = self.patch(reverse('producto-detail', args=[producto.id]), {'nombre': 'Cambio'})
        deactivate_response = self.post(reverse('producto-desactivar', args=[producto.id]))
        delete_response = self.delete(reverse('producto-detail', args=[producto.id]))

        self.assertEqual(create_response.status_code, 400)
        self.assertEqual(edit_response.status_code, 400)
        self.assertEqual(deactivate_response.status_code, 400)
        self.assertEqual(delete_response.status_code, 400)

    def test_rechaza_cambio_de_jornada_y_acceso_no_autenticado_o_sin_csrf(self):
        producto = Producto.objects.create(jornada=self.jornada, nombre='Plato', tipo=Producto.Tipo.PLATO, precio=Decimal('12.00'))
        otra_jornada = Jornada.objects.create(nombre='Otra venta', fecha=date(2026, 6, 2), creado_por=self.user)
        change_response = self.patch(reverse('producto-detail', args=[producto.id]), {'jornada': otra_jornada.id})
        anonymous = Client(enforce_csrf_checks=True)
        unauthenticated_response = anonymous.get(reverse('producto-list', args=[self.jornada.id]))
        csrf_response = self.client.post(
            reverse('producto-list', args=[self.jornada.id]),
            {'nombre': 'Sin CSRF', 'tipo': Producto.Tipo.PLATO, 'precio': '10.00'},
        )

        self.assertEqual(change_response.status_code, 400)
        self.assertEqual(unauthenticated_response.status_code, 403)
        self.assertEqual(csrf_response.status_code, 403)
        producto.refresh_from_db()
        self.assertEqual(producto.jornada, self.jornada)

    def test_rechaza_cambio_directo_del_estado(self):
        producto = Producto.objects.create(jornada=self.jornada, nombre='Plato', tipo=Producto.Tipo.PLATO, precio=Decimal('12.00'))

        response = self.patch(reverse('producto-detail', args=[producto.id]), {'activo': False})

        self.assertEqual(response.status_code, 400)
        producto.refresh_from_db()
        self.assertTrue(producto.activo)

    def test_retorna_404_para_recursos_inexistentes(self):
        list_response = self.client.get(reverse('producto-list', args=[99999]))
        detail_response = self.client.get(reverse('producto-detail', args=[99999]))

        self.assertEqual(list_response.status_code, 404)
        self.assertEqual(detail_response.status_code, 404)
