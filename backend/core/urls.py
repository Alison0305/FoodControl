from django.urls import path

from .views import (
    abrir_jornada,
    cerrar_jornada,
    csrf_token,
    current_user,
    health_check,
    jornada_detail,
    jornadas,
    login_view,
    logout_view,
    producto_detail,
    productos_jornada,
    activar_producto,
    desactivar_producto,
    pedido_detail,
    pedidos_jornada,
    cambiar_estado_pedido_view,
)

urlpatterns = [
    path('health/', health_check, name='health-check'),
    path('auth/csrf/', csrf_token, name='auth-csrf'),
    path('auth/login/', login_view, name='auth-login'),
    path('auth/logout/', logout_view, name='auth-logout'),
    path('auth/me/', current_user, name='auth-me'),
    path('jornadas/', jornadas, name='jornada-list'),
    path('jornadas/<int:jornada_id>/', jornada_detail, name='jornada-detail'),
    path('jornadas/<int:jornada_id>/cerrar/', cerrar_jornada, name='jornada-cerrar'),
    path('jornadas/<int:jornada_id>/abrir/', abrir_jornada, name='jornada-abrir'),
    path('jornadas/<int:jornada_id>/productos/', productos_jornada, name='producto-list'),
    path('productos/<int:producto_id>/', producto_detail, name='producto-detail'),
    path('productos/<int:producto_id>/activar/', activar_producto, name='producto-activar'),
    path('productos/<int:producto_id>/desactivar/', desactivar_producto, name='producto-desactivar'),
    path('jornadas/<int:jornada_id>/pedidos/', pedidos_jornada, name='pedido-list'),
    path('pedidos/<int:pedido_id>/', pedido_detail, name='pedido-detail'),
    path('pedidos/<int:pedido_id>/estado/', cambiar_estado_pedido_view, name='pedido-estado'),
]
