from rest_framework import serializers

from .models import Jornada


class JornadaSerializer(serializers.ModelSerializer):
    creado_por = serializers.CharField(source='creado_por.username', read_only=True)
    estado = serializers.CharField(read_only=True)

    class Meta:
        model = Jornada
        fields = ('id', 'nombre', 'fecha', 'estado', 'creado_por', 'fecha_creacion')
        read_only_fields = ('id', 'estado', 'creado_por', 'fecha_creacion')

    def validate_nombre(self, value):
        nombre = value.strip()
        if not nombre:
            raise serializers.ValidationError('El nombre de la jornada es obligatorio.')
        return nombre

    def validate(self, attrs):
        if 'estado' in self.initial_data:
            raise serializers.ValidationError(
                {'estado': 'El estado solo puede cambiarse al abrir o cerrar una jornada.'}
            )

        if self.instance and self.instance.estado == Jornada.Estado.CERRADA:
            if 'nombre' in attrs or 'fecha' in attrs:
                raise serializers.ValidationError(
                    'No se puede editar una jornada cerrada. Reábrala antes de modificarla.'
                )

        return attrs

    def create(self, validated_data):
        return Jornada.objects.create(
            creado_por=self.context['request'].user,
            **validated_data,
        )
