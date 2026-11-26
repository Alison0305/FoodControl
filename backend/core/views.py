from django.contrib.auth import authenticate, login, logout
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Jornada, Pago, Pedido, Producto
from .serializers import JornadaSerializer, PagoAnulacionSerializer, PagoRegistroSerializer, PagoSerializer, PedidoSerializer, PedidoWriteSerializer, ProductoSerializer
from .services import anular_pago, cambiar_estado_pedido, eliminar_jornada, filtrar_pedidos, guardar_pedido, registrar_pago
from .validators import validar_jornada_abierta

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'ok', 'message': 'API de FoodControl disponible.'})


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token(request):
    return Response({'csrfToken': get_token(request)})


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_protect
def login_view(request):
    username = request.data.get('username', '')
    password = request.data.get('password', '')

    user = authenticate(request, username=username, password=password)
    if user is None or not user.is_active:
        return Response({'detail': 'Usuario o contraseña incorrectos.'}, status=400)

    login(request, user)
    return Response({'username': user.get_username()})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def logout_view(request):
    logout(request)
    return Response(status=204)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    return Response({'username': request.user.get_username()})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def jornadas(request):
    if request.method == 'GET':
        queryset = Jornada.objects.select_related('creado_por').order_by('-fecha', '-id')
        return Response(JornadaSerializer(queryset, many=True).data)

    serializer = JornadaSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
@csrf_protect
def jornada_detail(request, jornada_id):
    jornada = get_object_or_404(Jornada.objects.select_related('creado_por'), pk=jornada_id)

    if request.method == 'GET':
        return Response(JornadaSerializer(jornada).data)

    if request.method == 'DELETE':
        try:
            eliminar_jornada(jornada)
        except IntegrityError:
            return Response(
                {'detail': 'No se pudo eliminar la jornada porque existen datos relacionados protegidos.'},
                status=409,
            )
        return Response(status=204)

    serializer = JornadaSerializer(jornada, data=request.data, partial=True, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def cerrar_jornada(request, jornada_id):
    jornada = get_object_or_404(Jornada.objects.select_related('creado_por'), pk=jornada_id)
    if jornada.estado == Jornada.Estado.CERRADA:
        return Response({'detail': 'La jornada ya está cerrada.'}, status=400)

    jornada.estado = Jornada.Estado.CERRADA
    jornada.save(update_fields=['estado'])
    return Response(JornadaSerializer(jornada).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def abrir_jornada(request, jornada_id):
    jornada = get_object_or_404(Jornada.objects.select_related('creado_por'), pk=jornada_id)
    if jornada.estado == Jornada.Estado.ABIERTA:
        return Response({'detail': 'La jornada ya está abierta.'}, status=400)

    jornada.estado = Jornada.Estado.ABIERTA
    jornada.save(update_fields=['estado'])
    return Response(JornadaSerializer(jornada).data)


def validar_jornada_para_modificar(jornada):
    try:
        validar_jornada_abierta(jornada)
    except DjangoValidationError as error:
        return Response({'detail': error.messages[0]}, status=400)
    return None


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def productos_jornada(request, jornada_id):
    jornada = get_object_or_404(Jornada, pk=jornada_id)

    if request.method == 'GET':
        queryset = Producto.objects.filter(jornada=jornada).order_by('nombre', 'id')
        tipo = request.query_params.get('tipo')
        activo = request.query_params.get('activo')
        if tipo:
            if tipo not in Producto.Tipo.values:
                return Response({'tipo': 'El tipo debe ser plato o bebida.'}, status=400)
            queryset = queryset.filter(tipo=tipo)
        if activo:
            if activo not in ('true', 'false'):
                return Response({'activo': 'El estado debe ser true o false.'}, status=400)
            queryset = queryset.filter(activo=activo == 'true')
        return Response(ProductoSerializer(queryset, many=True).data)

    serializer = ProductoSerializer(data=request.data, context={'jornada': jornada})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
@csrf_protect
def producto_detail(request, producto_id):
    producto = get_object_or_404(Producto.objects.select_related('jornada'), pk=producto_id)

    if request.method == 'GET':
        return Response(ProductoSerializer(producto).data)

    if request.method == 'DELETE':
        error = validar_jornada_para_modificar(producto.jornada)
        if error:
            return error
        if producto.detalles.exists():
            return Response(
                {'detail': 'No se puede eliminar un producto con pedidos asociados. Puede desactivarlo en su lugar.'},
                status=409,
            )
        try:
            producto.delete()
        except (IntegrityError, ProtectedError):
            return Response(
                {'detail': 'No se puede eliminar un producto con pedidos asociados. Puede desactivarlo en su lugar.'},
                status=409,
            )
        return Response(status=204)

    serializer = ProductoSerializer(producto, data=request.data, partial=True, context={'jornada': producto.jornada})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def desactivar_producto(request, producto_id):
    producto = get_object_or_404(Producto.objects.select_related('jornada'), pk=producto_id)
    error = validar_jornada_para_modificar(producto.jornada)
    if error:
        return error
    if not producto.activo:
        return Response({'detail': 'El producto ya está inactivo.'}, status=400)
    producto.activo = False
    producto.save(update_fields=['activo'])
    return Response(ProductoSerializer(producto).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def activar_producto(request, producto_id):
    producto = get_object_or_404(Producto.objects.select_related('jornada'), pk=producto_id)
    error = validar_jornada_para_modificar(producto.jornada)
    if error:
        return error
    if producto.activo:
        return Response({'detail': 'El producto ya está activo.'}, status=400)
    producto.activo = True
    producto.save(update_fields=['activo'])
    return Response(ProductoSerializer(producto).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def pedidos_jornada(request, jornada_id):
    jornada = get_object_or_404(Jornada, pk=jornada_id)
    if request.method == 'GET':
        params = {key: request.query_params.get(key, '') for key in ('busqueda', 'tipo', 'estado', 'estado_pago', 'orden')}
        valid = {'tipo': set(Pedido.Tipo.values), 'estado': set(Pedido.Estado.values), 'estado_pago': {'pendiente', 'parcial', 'pagado'}, 'orden': {'recientes', 'antiguos', 'cliente_az', 'cliente_za', 'importe_mayor', 'importe_menor'}}
        for key, values in valid.items():
            if params[key] and params[key] not in values:
                return Response({key: 'Valor de filtro inválido.'}, status=400)
        pedidos = Pedido.objects.filter(jornada=jornada).select_related('registrado_por').prefetch_related('detalles__producto', 'pagos').order_by('-fecha_creacion', '-id')
        pedidos = filtrar_pedidos(pedidos, **params)
        return Response(PedidoSerializer(pedidos, many=True).data)
    serializer = PedidoWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    pedido = guardar_pedido(jornada=jornada, usuario=request.user, datos=serializer.validated_data)
    pedido = Pedido.objects.select_related('registrado_por').prefetch_related('detalles__producto', 'pagos').get(pk=pedido.pk)
    return Response(PedidoSerializer(pedido).data, status=201)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
@csrf_protect
def pedido_detail(request, pedido_id):
    pedido = get_object_or_404(Pedido.objects.select_related('jornada', 'registrado_por').prefetch_related('detalles__producto', 'pagos'), pk=pedido_id)
    if request.method == 'GET':
        return Response(PedidoSerializer(pedido).data)
    serializer = PedidoWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    pedido = guardar_pedido(jornada=pedido.jornada, usuario=request.user, datos=serializer.validated_data, pedido=pedido)
    pedido = Pedido.objects.select_related('registrado_por').prefetch_related('detalles__producto', 'pagos').get(pk=pedido.pk)
    return Response(PedidoSerializer(pedido).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def cambiar_estado_pedido_view(request, pedido_id):
    pedido = get_object_or_404(Pedido.objects.select_related('jornada', 'registrado_por').prefetch_related('detalles__producto', 'pagos'), pk=pedido_id)
    estado = request.data.get('estado')
    if estado not in Pedido.Estado.values:
        return Response({'estado': 'El estado solicitado no es válido.'}, status=400)
    pedido = cambiar_estado_pedido(pedido, estado)
    pedido = Pedido.objects.select_related('registrado_por').prefetch_related('detalles__producto', 'pagos').get(pk=pedido.pk)
    return Response(PedidoSerializer(pedido).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def pagos_pedido(request, pedido_id):
    pedido = get_object_or_404(Pedido.objects.select_related('jornada').prefetch_related('detalles__producto', 'pagos__registrado_por', 'pagos__anulado_por'), pk=pedido_id)
    if request.method == 'GET':
        return Response({'pedido': PedidoSerializer(pedido).data, 'pagos': PagoSerializer(pedido.pagos.all().order_by('fecha_pago', 'id'), many=True).data})
    serializer = PagoRegistroSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    pago = registrar_pago(pedido=pedido, usuario=request.user, monto=serializer.validated_data['monto'], metodo=serializer.validated_data['metodo'], identificador=serializer.validated_data['identificador_idempotencia'])
    return Response(PagoSerializer(pago).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def anular_pago_view(request, pago_id):
    pago = get_object_or_404(Pago.objects.select_related('pedido__jornada'), pk=pago_id)
    serializer = PagoAnulacionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    pago = anular_pago(pago=pago, usuario=request.user, motivo=serializer.validated_data['motivo_anulacion'])
    return Response(PagoSerializer(pago).data)
