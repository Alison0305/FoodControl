from decimal import Decimal
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class Jornada(models.Model):
    class Estado(models.TextChoices):
        ABIERTA = 'abierta', 'Abierta'
        CERRADA = 'cerrada', 'Cerrada'

    nombre = models.CharField(max_length=100)
    fecha = models.DateField()
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.ABIERTA)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='jornadas_creadas',
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'jornada'
        verbose_name_plural = 'jornadas'

    def __str__(self):
        return f'{self.nombre} ({self.fecha})'


class Producto(models.Model):
    class Tipo(models.TextChoices):
        PLATO = 'plato', 'Plato'
        BEBIDA = 'bebida', 'Bebida'

    jornada = models.ForeignKey(Jornada, on_delete=models.PROTECT, related_name='productos')
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=6, choices=Tipo.choices)
    precio = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'producto'
        verbose_name_plural = 'productos'
        constraints = [
            models.CheckConstraint(condition=Q(precio__gte=0), name='producto_precio_no_negativo'),
        ]

    def __str__(self):
        return self.nombre


class Pedido(models.Model):
    class Tipo(models.TextChoices):
        RESERVA = 'reserva', 'Reserva'
        VENTA_DIRECTA = 'venta_directa', 'Venta directa'

    class Estado(models.TextChoices):
        EN_ESPERA = 'en_espera', 'En espera'
        EN_PREPARACION = 'en_preparacion', 'En preparación'
        ENTREGADO = 'entregado', 'Entregado'
        CANCELADO = 'cancelado', 'Cancelado'

    jornada = models.ForeignKey(Jornada, on_delete=models.PROTECT, related_name='pedidos')
    nombre_cliente = models.CharField(max_length=100)
    tipo = models.CharField(max_length=14, choices=Tipo.choices)
    estado = models.CharField(max_length=14, choices=Estado.choices, default=Estado.EN_ESPERA)
    observaciones = models.TextField(blank=True)
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='pedidos_registrados',
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_entrega = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'pedido'
        verbose_name_plural = 'pedidos'

    def __str__(self):
        return f'Pedido de {self.nombre_cliente}'


class DetallePedido(models.Model):
    pedido = models.ForeignKey(Pedido, on_delete=models.PROTECT, related_name='detalles')
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='detalles')
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    precio_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
    )

    class Meta:
        verbose_name = 'detalle de pedido'
        verbose_name_plural = 'detalles de pedido'
        constraints = [
            models.CheckConstraint(condition=Q(cantidad__gt=0), name='detalle_cantidad_mayor_cero'),
            models.CheckConstraint(
                condition=Q(precio_unitario__gte=0),
                name='detalle_precio_unitario_no_negativo',
            ),
        ]

    def clean(self):
        super().clean()
        if self.pedido_id and self.producto_id:
            if self.pedido.jornada_id != self.producto.jornada_id:
                raise ValidationError(
                    {'producto': 'El producto debe pertenecer a la misma jornada que el pedido.'}
                )

    def __str__(self):
        return f'{self.cantidad} x {self.producto}'


class Pago(models.Model):
    class Estado(models.TextChoices):
        VIGENTE = 'vigente', 'Vigente'
        ANULADO = 'anulado', 'Anulado'
    class Metodo(models.TextChoices):
        EFECTIVO = 'efectivo', 'Efectivo'
        QR = 'qr', 'QR'

    pedido = models.ForeignKey(Pedido, on_delete=models.PROTECT, related_name='pagos')
    monto = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    metodo = models.CharField(max_length=8, choices=Metodo.choices)
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='pagos_registrados',
    )
    fecha_pago = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=8, choices=Estado.choices, default=Estado.VIGENTE)
    motivo_anulacion = models.TextField(blank=True)
    anulado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='pagos_anulados',
        null=True,
        blank=True,
    )
    fecha_anulacion = models.DateTimeField(null=True, blank=True)
    identificador_idempotencia = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    class Meta:
        verbose_name = 'pago'
        verbose_name_plural = 'pagos'
        constraints = [
            models.CheckConstraint(condition=Q(monto__gt=0), name='pago_monto_mayor_cero'),
        ]

    def __str__(self):
        return f'Bs {self.monto} - {self.get_metodo_display()}'

    def clean(self):
        super().clean()
        anulacion = (self.motivo_anulacion, self.anulado_por_id, self.fecha_anulacion)
        if self.estado == self.Estado.VIGENTE and any(anulacion):
            raise ValidationError('Un pago vigente no puede contener datos de anulación.')
        if self.estado == self.Estado.ANULADO and not all(anulacion):
            raise ValidationError('Un pago anulado requiere motivo, usuario y fecha de anulación.')
