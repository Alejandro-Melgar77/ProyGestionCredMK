from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from .models import Rol, Permiso, RolPermiso, UserProfile, Bitacora, Cliente, Empleado
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer, 
    ChangePasswordSerializer, PasswordResetRequestSerializer, 
    PasswordResetConfirmSerializer, RolSerializer, PermisoSerializer,
    RolPermisoSerializer, UserProfileSerializer, BitacoraSerializer,
    ClienteSerializer, EmpleadoSerializer, UserDetailSerializer, ClienteNestedSerializer, EmpleadoNestedSerializer
)
from rest_framework_simplejwt.tokens import RefreshToken


# =========================
# User ViewSet
# =========================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'list':
            return UserDetailSerializer
        return UserSerializer


    # =========================
    # Cambiar contraseña
    # =========================
    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        user = self.get_object()
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {"old_password": ["Contraseña actual incorrecta."]},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            Bitacora.objects.create(
                usuario=request.user,
                tipo_accion="CAMBIO_CONTRASENA",
                ip=self.get_client_ip(request)
            )
            return Response({"message": "Contraseña cambiada exitosamente."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # =========================
    # Reset contraseña
    # =========================
    @action(detail=False, methods=['post'])
    def password_reset_request(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email=email)
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                reset_url = f"{settings.FRONTEND_URL}/password-reset-confirm/{uid}/{token}/"
                send_mail(
                    'Restablecimiento de Contraseña',
                    f'Para restablecer tu contraseña, haz clic en el siguiente enlace: {reset_url}',
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )
                return Response(
                    {"message": "Se ha enviado un enlace para restablecer tu contraseña a tu correo electrónico."},
                    status=status.HTTP_200_OK
                )
            except User.DoesNotExist:
                return Response(
                    {"message": "Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña."},
                    status=status.HTTP_200_OK
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def password_reset_confirm(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None
        if user is not None and default_token_generator.check_token(user, token):
            serializer = PasswordResetConfirmSerializer(data=request.data)
            if serializer.is_valid():
                user.set_password(serializer.validated_data['new_password'])
                user.save()
                return Response({"message": "Contraseña restablecida exitosamente."}, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": "El enlace de restablecimiento es inválido o ha expirado."}, status=status.HTTP_400_BAD_REQUEST)

    # =========================
    # Listar clientes
    # =========================
    @action(detail=False, methods=['get'])
    def clientes(self, request):
        clientes = User.objects.filter(userprofile__rol__nombre__iexact='cliente')
        page = self.paginate_queryset(clientes)
        if page is not None:
            serializer = UserDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = UserDetailSerializer(clientes, many=True)
        return Response(serializer.data)

    # =========================
    # Listar empleados
    # =========================
    @action(detail=False, methods=['get'])
    def empleados(self, request):
        # Traer usuarios con rol "administrador" o "personal_credito"
        empleados = User.objects.filter(userprofile__rol__nombre__in=['administrador', 'personal_credito'])
        
        # Ya no usamos select_related('empleado') porque puede no existir
        serializer = UserDetailSerializer(empleados, many=True)
        return Response(serializer.data)
    # Obtener IP del cliente
    # =========================
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


# =========================
# Cliente y Empleado ViewSets
# =========================
class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [permissions.IsAuthenticated]


class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer
    permission_classes = [permissions.IsAuthenticated]


# =========================
# Resto de viewsets existentes
# =========================
class RolViewSet(viewsets.ModelViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'])
    def permisos(self, request, pk=None):
        rol = self.get_object()
        rol_permisos = RolPermiso.objects.filter(rol=rol)
        serializer = RolPermisoSerializer(rol_permisos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_permiso(self, request, pk=None):
        rol = self.get_object()
        permiso_id = request.data.get('permiso_id')
        try:
            permiso = Permiso.objects.get(id=permiso_id)
            rol_permiso, created = RolPermiso.objects.get_or_create(rol=rol, permiso=permiso)
            if created:
                serializer = RolPermisoSerializer(rol_permiso)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response({"error": "El permiso ya está asignado a este rol."}, status=status.HTTP_400_BAD_REQUEST)
        except Permiso.DoesNotExist:
            return Response({"error": "Permiso no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['delete'])
    def remove_permiso(self, request, pk=None):
        rol = self.get_object()
        permiso_id = request.data.get('permiso_id')
        try:
            permiso = Permiso.objects.get(id=permiso_id)
            rol_permiso = RolPermiso.objects.get(rol=rol, permiso=permiso)
            rol_permiso.delete()
            return Response({"message": "Permiso eliminado del rol exitosamente."}, status=status.HTTP_204_NO_CONTENT)
        except (Permiso.DoesNotExist, RolPermiso.DoesNotExist):
            return Response({"error": "Permiso no encontrado o no asignado a este rol."}, status=status.HTTP_404_NOT_FOUND)


class PermisoViewSet(viewsets.ModelViewSet):
    queryset = Permiso.objects.all()
    serializer_class = PermisoSerializer
    permission_classes = [permissions.IsAuthenticated]


class RolPermisoViewSet(viewsets.ModelViewSet):
    queryset = RolPermiso.objects.all()
    serializer_class = RolPermisoSerializer
    permission_classes = [permissions.IsAuthenticated]


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        with transaction.atomic():
            user_profile = serializer.save()
            Bitacora.objects.create(usuario=self.request.user, tipo_accion="CREAR_PERFIL_USUARIO", ip=self.get_client_ip(self.request))

    def perform_update(self, serializer):
        with transaction.atomic():
            user_profile = serializer.save()
            Bitacora.objects.create(usuario=self.request.user, tipo_accion="ACTUALIZAR_PERFIL_USUARIO", ip=self.get_client_ip(self.request))

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        return x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')


class BitacoraViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Bitacora.objects.all()
    serializer_class = BitacoraSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Bitacora.objects.all()
        return Bitacora.objects.filter(usuario=self.request.user)
