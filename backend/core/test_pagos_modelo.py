from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from .models import Jornada, Pago, Pedido


class PagoModeloTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='pagos_modelo')
        jornada = Jornada.objects.create(nombre='Pagos', fecha=date(2026, 9, 1), creado_por=self.user)
        self.pedido = Pedido.objects.create(jornada=jornada, nombre_cliente='Cliente', tipo='reserva', registrado_por=self.user)

    def test_pago_vigente_predeterminado_e_identificadores_distintos(self):
        first = Pago.objects.create(pedido=self.pedido, monto=Decimal('1.00'), metodo='efectivo', registrado_por=self.user)
        second = Pago.objects.create(pedido=self.pedido, monto=Decimal('2.00'), metodo='qr', registrado_por=self.user)
        self.assertEqual(first.estado, Pago.Estado.VIGENTE)
        self.assertNotEqual(first.identificador_idempotencia, second.identificador_idempotencia)

    def test_validacion_de_datos_de_anulacion(self):
        pago = Pago(pedido=self.pedido, monto=Decimal('1.00'), metodo='efectivo', registrado_por=self.user, estado=Pago.Estado.ANULADO)
        with self.assertRaises(ValidationError):
            pago.full_clean()
        pago = Pago(pedido=self.pedido, monto=Decimal('1.00'), metodo='efectivo', registrado_por=self.user, motivo_anulacion='Error')
        with self.assertRaises(ValidationError):
            pago.full_clean()
