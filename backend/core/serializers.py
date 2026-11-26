from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import DetallePedido, Jornada, Pedido, Producto
from .validators import validar_jornada_abierta


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


class ProductoSerializer(serializers.ModelSerializer):
    jornada = serializers.IntegerField(source='jornada_id', read_only=True)
    activo = serializers.BooleanField(read_only=True)

    class Meta:
        model = Producto
        fields = ('id', 'jornada', 'nombre', 'tipo', 'precio', 'activo', 'fecha_creacion')
        read_only_fields = ('id', 'jornada', 'activo', 'fecha_creacion')

    def validate_nombre(self, value):
        nombre = value.strip()
        if not nombre:
            raise serializers.ValidationError('El nombre del producto es obligatorio.')
        return nombre

    def validate(self, attrs):
        if 'jornada' in self.initial_data:
            raise serializers.ValidationError({'jornada': 'No se puede cambiar la jornada de un producto.'})
        if 'activo' in self.initial_data:
            raise serializers.ValidationError(
                {'activo': 'El estado solo puede cambiarse al activar o desactivar un producto.'}
            )

        jornada = self.instance.jornada if self.instance else self.context['jornada']
        try:
            validar_jornada_abierta(jornada)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'detail': error.messages[0]}) from error

        return attrs

    def create(self, validated_data):
        return Producto.objects.create(jornada=self.context['jornada'], **validated_data)


class DetallePedidoSerializer(serializers.ModelSerializer):
    producto_id = serializers.IntegerField(source='producto.id', read_only=True)
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_tipo = serializers.CharField(source='producto.tipo', read_only=True)

    class Meta:
        model = DetallePedido
        fields = ('producto_id', 'producto_nombre', 'producto_tipo', 'cantidad', 'precio_unitario')


class DetallePedidoInputSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField(min_value=1)
    cantidad = serializers.IntegerField(min_value=1, max_value=2147483647)


class PedidoSerializer(serializers.ModelSerializer):
    jornada = serializers.IntegerField(source='jornada_id', read_only=True)
    registrado_por = serializers.CharField(source='registrado_por.username', read_only=True)
    detalles = DetallePedidoSerializer(many=True, read_only=True)

    class Meta:
        model = Pedido
        fields = ('id', 'jornada', 'nombre_cliente', 'tipo', 'estado', 'observaciones', 'registrado_por', 'fecha_creacion', 'detalles')
        read_only_fields = ('id', 'jornada', 'estado', 'registrado_por', 'fecha_creacion', 'detalles')


class PedidoWriteSerializer(serializers.Serializer):
    nombre_cliente = serializers.CharField(max_length=100)
    tipo = serializers.ChoiceField(choices=Pedido.Tipo.choices)
    observaciones = serializers.CharField(required=False, allow_blank=True)
    detalles = DetallePedidoInputSerializer(many=True)

    def validate_nombre_cliente(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El nombre del cliente es obligatorio.')
        return value

    def validate(self, attrs):
        protected = {'jornada', 'estado', 'registrado_por', 'fecha_creacion'} & set(self.initial_data)
        if protected:
            raise serializers.ValidationError({field: 'Este campo no se puede modificar.' for field in protected})
        if not attrs['detalles']:
            raise serializers.ValidationError({'detalles': 'Debe seleccionar al menos un producto.'})
        product_ids = [detail['producto_id'] for detail in attrs['detalles']]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError({'detalles': 'No puede repetir productos en un pedido.'})
        return attrs
