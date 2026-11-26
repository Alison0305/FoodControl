from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import DetallePedido, Pago, Pedido, Producto
from .validators import validar_jornada_abierta


def subtotal_detalle(detalle):
    return detalle.cantidad * detalle.precio_unitario


def importes_pedido(detalles):
    detalles = list(detalles)
    return sum((subtotal_detalle(detalle) for detalle in detalles), Decimal('0.00')), sum(detalle.cantidad for detalle in detalles)


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


@transaction.atomic
def guardar_pedido(*, jornada, usuario, datos, pedido=None):
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
        if pedido.pagos.exists() and nuevas_lineas != lineas_actuales:
            importe_pagado = sum((pago.monto for pago in pedido.pagos.all()), Decimal('0.00'))
            total_propuesto = sum((detail['cantidad'] * (detalles_existentes[detail['producto_id']].precio_unitario if detail['producto_id'] in detalles_existentes else productos[detail['producto_id']].precio) for detail in datos['detalles']), Decimal('0.00'))
            if total_propuesto < importe_pagado:
                raise ValidationError({'detalles': 'El total del pedido no puede ser menor al importe ya pagado.'})
            raise ValidationError({'detalles': 'No se pueden modificar productos ni cantidades de un pedido con pagos registrados.'})
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
