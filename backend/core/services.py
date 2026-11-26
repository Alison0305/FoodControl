from django.db import transaction

from .models import DetallePedido, Pago, Pedido, Producto


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
