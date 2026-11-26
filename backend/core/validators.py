from django.core.exceptions import ValidationError

from .models import Jornada


def validar_jornada_abierta(jornada):
    if jornada.estado != Jornada.Estado.ABIERTA:
        raise ValidationError('La jornada está cerrada y no admite nuevas operaciones.')
