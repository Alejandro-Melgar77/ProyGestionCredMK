from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework.validators import UniqueValidator
from .models import (
    Rol, Permiso, RolPermiso, UserProfile, Bitacora,
    Cliente, Empleado
)

# =========================
# Serializers de Usuario
# =========================

class ClienteNestedSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = ['id', 'user_info', 'tipo_documento', 'numero_documento',
                  'telefono', 'ingresos_mensuales', 'es_cliente_preferencial']

    def get_user_info(self, obj):
        user = obj.user  # suponiendo que Cliente tiene FK a User
        return {
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "is_active": user.is_active
        }
    
class EmpleadoNestedSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField()

    class Meta:
        model = Empleado
        fields = ['id', 'user_info', 'codigo_empleado', 'departamento',
                  'fecha_contratacion', 'salario', 'es_supervisor', 
                  'puede_aprobar_creditos', 'limite_aprobacion']

    def get_user_info(self, obj):
        user = obj.user  # FK a User
        return {
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "is_active": user.is_active
        }
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active']
        read_only_fields = ['id']


class UserCreateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    rol_id = serializers.IntegerField(write_only=True, required=False)  # <-- Campo para asignar rol

    class Meta:
        model = User
        fields = ['username', 'password', 'password2', 'email', 'first_name', 'last_name', 'is_active', 'rol_id']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        return attrs

    def create(self, validated_data):
        rol_id = validated_data.pop('rol_id', None)
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)

        # Crear UserProfile con rol si se especifica
        if rol_id:
            try:
                rol = Rol.objects.get(pk=rol_id)
                UserProfile.objects.create(user=user, rol=rol)
            except Rol.DoesNotExist:
                pass  # Opcional: podrías lanzar error si el rol no existe
        else:
            # Crear perfil vacío si no se envía rol
            UserProfile.objects.create(user=user)

        return user

class UserUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'is_active']

    def update(self, instance, validated_data):
        instance.username = validated_data.get('username', instance.username)
        instance.email = validated_data.get('email', instance.email)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Las contraseñas no coinciden."})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Las contraseñas no coinciden."})
        return attrs


# =========================
# Serializers de Roles y Permisos
# =========================
class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = '__all__'


class PermisoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permiso
        fields = '__all__'


class RolPermisoSerializer(serializers.ModelSerializer):
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True)
    permiso_nombre = serializers.CharField(source='permiso.nombre', read_only=True)

    class Meta:
        model = RolPermiso
        fields = ['id', 'rol', 'permiso', 'rol_nombre', 'permiso_nombre',
                  'created_at', 'updated_at', 'is_deleted']


# =========================
# Serializers de Perfiles y Bitácora
# =========================
class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'user_id', 'rol', 'rol_nombre',
                  'telefono', 'created_at', 'updated_at', 'is_deleted']


class BitacoraSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True)

    class Meta:
        model = Bitacora
        fields = ['id', 'usuario', 'usuario_nombre',
                  'tipo_accion', 'ip', 'created_at', 'updated_at', 'is_deleted']


# =========================
# Serializers de Cliente y Empleado
# =========================
class ClienteSerializer(serializers.ModelSerializer):
    user_info = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Cliente
        fields = '__all__'


class EmpleadoSerializer(serializers.ModelSerializer):
    user_info = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Empleado
        fields = '__all__'


class UserDetailSerializer(serializers.ModelSerializer):
    cliente_info = serializers.SerializerMethodField()
    empleado_info = serializers.SerializerMethodField()
    rol_nombre = serializers.CharField(source='userprofile.rol.nombre', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active',
                  'rol_nombre', 'cliente_info', 'empleado_info']

    def get_cliente_info(self, obj):
        try:
            cliente = Cliente.objects.get(user=obj)
            return ClienteSerializer(cliente).data
        except Cliente.DoesNotExist:
            return None

    def get_empleado_info(self, obj):
        # Devuelve info del Empleado solo si existe
        empleado = getattr(obj, 'empleado', None)
        if empleado:
            return EmpleadoSerializer(empleado).data
        return None