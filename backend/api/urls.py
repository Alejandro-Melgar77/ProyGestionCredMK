from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'roles', views.RolViewSet)
router.register(r'permisos', views.PermisoViewSet)
router.register(r'rol-permisos', views.RolPermisoViewSet)
router.register(r'user-profiles', views.UserProfileViewSet)
router.register(r'bitacora', views.BitacoraViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/password-reset/', views.UserViewSet.as_view({'post': 'password_reset_request'}), name='password-reset'),
    path('auth/password-reset-confirm/<uidb64>/<token>/', views.UserViewSet.as_view({'post': 'password_reset_confirm'}), name='password-reset-confirm'),
]