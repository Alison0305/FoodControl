from django.core.exceptions import ValidationError

from .models import Jornada, Producto


def validar_jornada_abierta(jornada):
    if jornada.estado != Jornada.Estado.ABIERTA:
        raise ValidationError('La jornada está cerrada y no admite nuevas operaciones.')


def productos_activos_de_jornada(jornada):
    return Producto.objects.filter(jornada=jornada, activo=True)
