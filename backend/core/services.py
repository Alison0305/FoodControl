from decimal import Decimal
from functools import wraps
import unicodedata

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, OperationalError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import DetallePedido, Jornada, Pago, Pedido, Producto
from .validators import validar_jornada_abierta


def transaccion_monetaria(func):
    @wraps(func)
    def wrapped(*args, **kwargs):
        try:
            with transaction.atomic():
                return func(*args, **kwargs)
        except OperationalError as error:
            if 'locked' not in str(error).lower() and 'busy' not in str(error).lower():
                raise
            raise ValidationError({'detail': 'La operación está siendo procesada. Intente nuevamente.'}) from error
    return wrapped


def subtotal_detalle(detalle):
    return detalle.cantidad * detalle.precio_unitario


def importes_pedido(detalles):
    detalles = list(detalles)
    return sum((subtotal_detalle(detalle) for detalle in detalles), Decimal('0.00')), sum(detalle.cantidad for detalle in detalles)


def estado_pago_pedido(pedido):
    total, pagado, _ = resumen_pago_pedido(pedido)
    if total == Decimal('0.00') or pagado >= total:
        return 'pagado'
    if pagado > Decimal('0.00'):
        return 'parcial'
    return 'pendiente'


def resumen_pago_pedido(pedido):
    total, _ = importes_pedido(pedido.detalles.all())
    pagado = sum((pago.monto for pago in pedido.pagos.all() if pago.estado == Pago.Estado.VIGENTE), Decimal('0.00'))
    return total, pagado, total - pagado


@transaccion_monetaria
def registrar_pago(*, pedido, usuario, monto, metodo, identificador):
    pedido = Pedido.objects.select_related('jornada').prefetch_related('detalles', 'pagos').get(pk=pedido.pk)
    existente = Pago.objects.filter(identificador_idempotencia=identificador).select_related('pedido').first()
    if existente:
        if existente.pedido_id == pedido.id and existente.monto == monto and existente.metodo == metodo:
            return existente
        raise ValidationError({'identificador_idempotencia': 'El identificador ya fue usado con datos diferentes.'})
    try:
        validar_jornada_abierta(pedido.jornada)
    except DjangoValidationError as error:
        raise ValidationError({'detail': error.messages[0]}) from error
    if pedido.estado == Pedido.Estado.CANCELADO:
        raise ValidationError({'detail': 'No se pueden registrar pagos en un pedido cancelado.'})
    _, _, saldo = resumen_pago_pedido(pedido)
    if monto > saldo:
        raise ValidationError({'monto': 'El monto no puede superar el saldo pendiente.'})
    try:
        return Pago.objects.create(pedido=pedido, monto=monto, metodo=metodo, registrado_por=usuario, identificador_idempotencia=identificador)
    except IntegrityError as error:
        existente = Pago.objects.filter(identificador_idempotencia=identificador).first()
        if existente and existente.pedido_id == pedido.id and existente.monto == monto and existente.metodo == metodo:
            return existente
        raise ValidationError({'identificador_idempotencia': 'No se pudo registrar el pago por un conflicto de concurrencia.'}) from error


@transaccion_monetaria
def anular_pago(*, pago, usuario, motivo):
    pago = Pago.objects.select_related('pedido__jornada').get(pk=pago.pk)
    try:
        validar_jornada_abierta(pago.pedido.jornada)
    except DjangoValidationError as error:
        raise ValidationError({'detail': error.messages[0]}) from error
    if pago.estado == Pago.Estado.ANULADO:
        raise ValidationError({'detail': 'El pago ya fue anulado.'})
    updated = Pago.objects.filter(pk=pago.pk, estado=Pago.Estado.VIGENTE).update(estado=Pago.Estado.ANULADO, motivo_anulacion=motivo, anulado_por=usuario, fecha_anulacion=timezone.now())
    if not updated:
        raise ValidationError({'detail': 'El pago fue actualizado por otra operación.'})
    pago.refresh_from_db()
    return pago


def normalizar_busqueda(value):
    return ''.join(character for character in unicodedata.normalize('NFD', value.strip().casefold()) if unicodedata.category(character) != 'Mn')


def filtrar_pedidos(pedidos, *, busqueda='', tipo='', estado='', estado_pago='', orden='recientes'):
    normalized = normalizar_busqueda(busqueda)
    if normalized.startswith('#'):
        normalized = normalized[1:].strip()
    is_identifier = normalized.isascii() and normalized.isdecimal() and len(normalized) <= 18
    filtered = []
    for pedido in pedidos:
        matches_search = not normalized or (is_identifier and pedido.id == int(normalized)) or (not is_identifier and normalized in normalizar_busqueda(pedido.nombre_cliente))
        if matches_search and (not tipo or pedido.tipo == tipo) and (not estado or pedido.estado == estado) and (not estado_pago or estado_pago_pedido(pedido) == estado_pago):
            filtered.append(pedido)
    if orden == 'antiguos':
        return sorted(filtered, key=lambda pedido: (pedido.fecha_creacion, pedido.id))
    if orden == 'cliente_az':
        return sorted(filtered, key=lambda pedido: (normalizar_busqueda(pedido.nombre_cliente), pedido.fecha_creacion, pedido.id))
    if orden == 'cliente_za':
        return sorted(sorted(filtered, key=lambda pedido: (pedido.fecha_creacion, pedido.id)), key=lambda pedido: normalizar_busqueda(pedido.nombre_cliente), reverse=True)
    if orden in ('importe_mayor', 'importe_menor'):
        return sorted(filtered, key=lambda pedido: (importes_pedido(pedido.detalles.all())[0], pedido.fecha_creacion, pedido.id), reverse=orden == 'importe_mayor')
    return sorted(filtered, key=lambda pedido: (pedido.fecha_creacion, pedido.id), reverse=True)


@transaccion_monetaria
def cambiar_estado_pedido(pedido, nuevo_estado):
    pedido = Pedido.objects.select_related('jornada').prefetch_related('pagos').get(pk=pedido.pk)
    try:
        validar_jornada_abierta(pedido.jornada)
    except DjangoValidationError as error:
        raise ValidationError({'detail': error.messages[0]}) from error
    transitions = {
        Pedido.Estado.EN_ESPERA: {Pedido.Estado.EN_PREPARACION, Pedido.Estado.CANCELADO},
        Pedido.Estado.EN_PREPARACION: {Pedido.Estado.ENTREGADO, Pedido.Estado.CANCELADO},
    }
    if nuevo_estado not in transitions.get(pedido.estado, set()):
        raise ValidationError({'estado': 'La transición de estado solicitada no está permitida.'})
    if nuevo_estado == Pedido.Estado.CANCELADO and pedido.pagos.filter(estado=Pago.Estado.VIGENTE).exists():
        raise ValidationError({'detail': 'No se puede cancelar un pedido con pagos registrados sin resolver.'})
    updates = {'estado': nuevo_estado}
    if nuevo_estado == Pedido.Estado.ENTREGADO:
        updates['fecha_entrega'] = timezone.now()
    query = Pedido.objects.filter(pk=pedido.pk, estado=pedido.estado, jornada__estado=Jornada.Estado.ABIERTA)
    if nuevo_estado == Pedido.Estado.ENTREGADO:
        query = query.filter(fecha_entrega__isnull=True)
    if nuevo_estado == Pedido.Estado.CANCELADO:
        query = query.exclude(pagos__estado=Pago.Estado.VIGENTE)
    try:
        updated = query.update(**updates)
    except OperationalError as error:
        raise ValidationError({'detail': 'No se pudo actualizar el pedido por un conflicto de concurrencia. Intente nuevamente.'}) from error
    if not updated:
        raise ValidationError({'estado': 'El pedido fue actualizado por otra operación. Intente nuevamente.'})
    pedido.refresh_from_db()
    return pedido


@transaction.atomic
def eliminar_jornada(jornada):
    pagos = Pago.objects.filter(pedido__jornada=jornada)
    detalles = DetallePedido.objects.filter(pedido__jornada=jornada)
    pedidos = Pedido.objects.filter(jornada=jornada)
    productos = Producto.objects.filter(jornada=jornada)

    pagos.delete()
    detalles.delete()
    pedidos.delete()
    productos.delete()
    jornada.delete()


@transaccion_monetaria
def guardar_pedido(*, jornada, usuario, datos, pedido=None):
    jornada = Jornada.objects.get(pk=jornada.pk)
    if pedido:
        pedido = Pedido.objects.select_related('jornada').prefetch_related('detalles__producto', 'pagos').get(pk=pedido.pk)
    try:
        validar_jornada_abierta(jornada)
    except DjangoValidationError as error:
        raise ValidationError({'detail': error.messages[0]}) from error

    if pedido and pedido.estado in (Pedido.Estado.ENTREGADO, Pedido.Estado.CANCELADO):
        raise ValidationError({'detail': 'No se puede editar un pedido entregado o cancelado.'})

    product_ids = [detail['producto_id'] for detail in datos['detalles']]
    productos = {producto.id: producto for producto in Producto.objects.filter(id__in=product_ids)}
    if len(productos) != len(product_ids):
        raise ValidationError({'detalles': 'Uno o más productos no existen.'})
    if any(producto.jornada_id != jornada.id for producto in productos.values()):
        raise ValidationError({'detalles': 'Todos los productos deben pertenecer a la jornada seleccionada.'})

    if pedido is None:
        pedido = Pedido.objects.create(
            jornada=jornada,
            registrado_por=usuario,
            nombre_cliente=datos['nombre_cliente'],
            tipo=datos['tipo'],
            observaciones=datos.get('observaciones', ''),
        )
        detalles_existentes = {}
    else:
        detalles_existentes = {detalle.producto_id: detalle for detalle in pedido.detalles.select_related('producto')}
        nuevas_lineas = {(detail['producto_id'], detail['cantidad']) for detail in datos['detalles']}
        lineas_actuales = {(detalle.producto_id, detalle.cantidad) for detalle in detalles_existentes.values()}
        if nuevas_lineas != lineas_actuales:
            importe_pagado = resumen_pago_pedido(pedido)[1]
            total_propuesto = sum((detail['cantidad'] * (detalles_existentes[detail['producto_id']].precio_unitario if detail['producto_id'] in detalles_existentes else productos[detail['producto_id']].precio) for detail in datos['detalles']), Decimal('0.00'))
            if total_propuesto < importe_pagado:
                raise ValidationError({'detalles': 'El total del pedido no puede ser menor al importe ya pagado.'})
        pedido.nombre_cliente = datos['nombre_cliente']
        pedido.tipo = datos['tipo']
        pedido.observaciones = datos.get('observaciones', pedido.observaciones)
        pedido.save(update_fields=['nombre_cliente', 'tipo', 'observaciones'])

    for detail in datos['detalles']:
        producto = productos[detail['producto_id']]
        existente = detalles_existentes.pop(producto.id, None)
        if existente:
            existente.cantidad = detail['cantidad']
            try:
                existente.full_clean()
            except DjangoValidationError as error:
                raise ValidationError(error.message_dict) from error
            existente.save(update_fields=['cantidad'])
            continue
        if not producto.activo:
            raise ValidationError({'detalles': f'El producto {producto.nombre} está inactivo.'})
        detalle = DetallePedido(pedido=pedido, producto=producto, cantidad=detail['cantidad'], precio_unitario=producto.precio)
        try:
            detalle.full_clean()
        except DjangoValidationError as error:
            raise ValidationError(error.message_dict) from error
        detalle.save()

    if pedido and detalles_existentes:
        DetallePedido.objects.filter(id__in=[detail.id for detail in detalles_existentes.values()]).delete()
    return pedido
