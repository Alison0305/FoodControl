from django.urls import path

from .views import csrf_token, current_user, health_check, login_view, logout_view

urlpatterns = [
    path('health/', health_check, name='health-check'),
    path('auth/csrf/', csrf_token, name='auth-csrf'),
    path('auth/login/', login_view, name='auth-login'),
    path('auth/logout/', logout_view, name='auth-logout'),
    path('auth/me/', current_user, name='auth-me'),
]
