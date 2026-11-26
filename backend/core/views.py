from django.contrib.auth import authenticate, login, logout
from django.shortcuts import get_object_or_404
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Jornada
from .serializers import JornadaSerializer
from .services import eliminar_jornada

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
        eliminar_jornada(jornada)
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
