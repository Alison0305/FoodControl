from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.urls import reverse

from .models import DetallePedido, Jornada, Pago, Pedido, Producto


class HealthCheckTests(TestCase):
    def test_health_check_returns_ok(self):
        response = self.client.get(reverse('health-check'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'ok')


class ModelosNegocioTests(TestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(
            username='operador',
            password='contrasena-segura',
        )
        self.jornada = Jornada.objects.create(
            nombre='Venta de prueba',
            fecha=date(2026, 1, 1),
            creado_por=self.usuario,
        )
        self.producto = Producto.objects.create(
            jornada=self.jornada,
            nombre='Sopa de maní',
            tipo=Producto.Tipo.PLATO,
            precio=Decimal('15.00'),
        )
        self.pedido = Pedido.objects.create(
            jornada=self.jornada,
            nombre_cliente='Cliente de prueba',
            tipo=Pedido.Tipo.RESERVA,
            registrado_por=self.usuario,
        )

    def test_relaciones_de_jornada_y_pedido(self):
        detalle = DetallePedido.objects.create(
            pedido=self.pedido,
            producto=self.producto,
            cantidad=2,
            precio_unitario=Decimal('15.00'),
        )

        self.assertEqual(self.jornada.productos.get(), self.producto)
        self.assertEqual(self.jornada.pedidos.get(), self.pedido)
        self.assertEqual(self.pedido.detalles.get(), detalle)

    def test_producto_y_precios_unitarios_no_aceptan_valores_negativos(self):
        producto = Producto(
            jornada=self.jornada,
            nombre='Producto inválido',
            tipo=Producto.Tipo.BEBIDA,
            precio=Decimal('-0.01'),
        )
        detalle = DetallePedido(
            pedido=self.pedido,
            producto=self.producto,
            cantidad=1,
            precio_unitario=Decimal('-0.01'),
        )

        with self.assertRaises(ValidationError):
            producto.full_clean()
        with self.assertRaises(ValidationError):
            detalle.full_clean()

        with self.assertRaises(IntegrityError), transaction.atomic():
            Producto.objects.create(
                jornada=self.jornada,
                nombre='Producto inválido en base de datos',
                tipo=Producto.Tipo.BEBIDA,
                precio=Decimal('-0.01'),
            )

    def test_cantidad_y_monto_de_pago_deben_ser_mayores_que_cero(self):
        detalle = DetallePedido(
            pedido=self.pedido,
            producto=self.producto,
            cantidad=0,
            precio_unitario=Decimal('15.00'),
        )
        pago = Pago(
            pedido=self.pedido,
            monto=Decimal('0.00'),
            metodo=Pago.Metodo.EFECTIVO,
            registrado_por=self.usuario,
        )

        with self.assertRaises(ValidationError):
            detalle.full_clean()
        with self.assertRaises(ValidationError):
            pago.full_clean()

        with self.assertRaises(IntegrityError), transaction.atomic():
            DetallePedido.objects.create(
                pedido=self.pedido,
                producto=self.producto,
                cantidad=0,
                precio_unitario=Decimal('15.00'),
            )
        with self.assertRaises(IntegrityError), transaction.atomic():
            Pago.objects.create(
                pedido=self.pedido,
                monto=Decimal('0.00'),
                metodo=Pago.Metodo.QR,
                registrado_por=self.usuario,
            )

    def test_detalle_exige_producto_de_la_misma_jornada(self):
        otra_jornada = Jornada.objects.create(
            nombre='Otra venta',
            fecha=date(2026, 1, 2),
            creado_por=self.usuario,
        )
        producto_ajeno = Producto.objects.create(
            jornada=otra_jornada,
            nombre='Refresco',
            tipo=Producto.Tipo.BEBIDA,
            precio=Decimal('5.00'),
        )
        detalle = DetallePedido(
            pedido=self.pedido,
            producto=producto_ajeno,
            cantidad=1,
            precio_unitario=Decimal('5.00'),
        )

        with self.assertRaises(ValidationError) as error:
            detalle.full_clean()

        self.assertIn('producto', error.exception.message_dict)

    def test_detalle_conserva_el_precio_historico(self):
        detalle = DetallePedido.objects.create(
            pedido=self.pedido,
            producto=self.producto,
            cantidad=1,
            precio_unitario=Decimal('15.00'),
        )

        self.producto.precio = Decimal('18.50')
        self.producto.save()
        detalle.refresh_from_db()

        self.assertEqual(detalle.precio_unitario, Decimal('15.00'))

    def test_pedido_admite_multiples_pagos(self):
        Pago.objects.create(
            pedido=self.pedido,
            monto=Decimal('10.00'),
            metodo=Pago.Metodo.EFECTIVO,
            registrado_por=self.usuario,
        )
        Pago.objects.create(
            pedido=self.pedido,
            monto=Decimal('5.00'),
            metodo=Pago.Metodo.QR,
            registrado_por=self.usuario,
        )

        self.assertEqual(self.pedido.pagos.count(), 2)

    def test_detalle_protege_el_producto_historico(self):
        DetallePedido.objects.create(
            pedido=self.pedido,
            producto=self.producto,
            cantidad=1,
            precio_unitario=Decimal('15.00'),
        )

        with self.assertRaises(ProtectedError):
            self.producto.delete()
