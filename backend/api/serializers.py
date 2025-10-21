from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework.validators import UniqueValidator

# === MODELOS ===
from .models import (
    Rol, Permiso, RolPermiso, UserProfile,
    Cliente, Empleado, SolicitudCredito, PlanPago, PlanCuota,
    ProductoFinanciero, DocumentoTipo, RequisitoProductoDocumento, DocumentoAdjunto, ValidacionDocumento, ResultadoValidacionIA
)

# =========================================================
#                    USUARIOS / PERSONAS
# =========================================================

class ClienteNestedSerializer(serializers.ModelSerializer):
    """Cliente embebido con datos básicos del User."""
    user_info = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = ['id', 'user_info', 'tipo_documento', 'numero_documento',
                  'telefono', 'ingresos_mensuales', 'es_cliente_preferencial']

    def get_user_info(self, obj):
        u = obj.user
        return {
            "id": u.id,
            "username": u.username,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "is_active": u.is_active
        }


class EmpleadoNestedSerializer(serializers.ModelSerializer):
    """Empleado embebido con datos básicos del User."""
    user_info = serializers.SerializerMethodField()

    class Meta:
        model = Empleado
        fields = ['id', 'user_info', 'codigo_empleado', 'departamento',
                  'fecha_contratacion', 'salario', 'es_supervisor',
                  'puede_aprobar_creditos', 'limite_aprobacion']

    def get_user_info(self, obj):
        u = obj.user
        return {
            "username": u.username,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "is_active": u.is_active
        }


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active']
        read_only_fields = ['id']


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Crea User + UserProfile + Cliente (solo si el rol es cliente).
    """
    email = serializers.EmailField(required=True, validators=[UniqueValidator(queryset=User.objects.all())])
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    rol_id = serializers.IntegerField(write_only=True, required=False)
    
    # Agregar campos de cliente
    tipo_documento = serializers.CharField(write_only=True, required=False, allow_blank=True)
    numero_documento = serializers.CharField(write_only=True, required=False, allow_blank=True)
    telefono = serializers.CharField(write_only=True, required=False, allow_blank=True)
    direccion = serializers.CharField(write_only=True, required=False, allow_blank=True)
    fecha_nacimiento = serializers.DateField(write_only=True, required=False, allow_null=True)
    ocupacion = serializers.CharField(write_only=True, required=False, allow_blank=True)
    ingresos_mensuales = serializers.DecimalField(
        write_only=True, 
        required=False, 
        allow_null=True, 
        max_digits=12, 
        decimal_places=2
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'password', 'password2', 'email', 
            'first_name', 'last_name', 'is_active', 'rol_id',
            'tipo_documento', 'numero_documento', 'telefono', 
            'direccion', 'fecha_nacimiento', 'ocupacion', 'ingresos_mensuales'
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        
        # Solo validar número de documento si se va a crear cliente
        rol_id = attrs.get('rol_id')
        if rol_id:
            try:
                rol = Rol.objects.get(pk=rol_id)
                if rol.nombre.lower() == 'cliente':
                    nd = attrs.get('numero_documento')
                    if nd and Cliente.objects.filter(numero_documento=nd).exists():
                        raise serializers.ValidationError({"numero_documento": "Ya existe un cliente con ese número."})
            except Rol.DoesNotExist:
                pass
        
        return attrs

    def create(self, validated_data):
        print("🔍 Validated_data recibido:", validated_data)  # Debug
        
        # --- extrae campos de Cliente ---
        rol_id = validated_data.pop('rol_id', None)
        tipo_documento = validated_data.pop('tipo_documento', None)
        numero_documento = validated_data.pop('numero_documento', None)
        telefono = validated_data.pop('telefono', '')
        direccion = validated_data.pop('direccion', '')
        fecha_nacimiento = validated_data.pop('fecha_nacimiento', None)
        ocupacion = validated_data.pop('ocupacion', '')
        ingresos_mensuales = validated_data.pop('ingresos_mensuales', None)

        validated_data.pop('password2')

        # --- crea usuario ---
        user = User.objects.create_user(**validated_data)

        # --- asigna rol ---
        rol = None
        if rol_id:
            try:
                rol = Rol.objects.get(pk=rol_id)
            except Rol.DoesNotExist:
                rol = None
        
        # Si no hay rol, asignar por defecto según la lógica de negocio
        if not rol:
            rol = Rol.objects.filter(nombre__iexact='Cliente').first()
            if not rol:
                rol = Rol.objects.create(nombre='Cliente', descripcion='Rol por defecto para registro público')

        UserProfile.objects.create(user=user, rol=rol)

        # --- crea Cliente SOLO si el rol es cliente ---
        if rol and rol.nombre.lower() == 'cliente':
            print("🔍 Creando cliente con datos:")  # Debug
            print("  - tipo_documento:", tipo_documento)
            print("  - numero_documento:", numero_documento)
            print("  - telefono:", telefono)
            print("  - direccion:", direccion)
            print("  - fecha_nacimiento:", fecha_nacimiento)
            print("  - ocupacion:", ocupacion)
            print("  - ingresos_mensuales:", ingresos_mensuales)
            
            if not tipo_documento:
                tipo_documento = 'CI'
            if not numero_documento:
                numero_documento = f"AUTO-{user.id}"

            cliente = Cliente.objects.create(
                user=user,
                tipo_documento=tipo_documento,
                numero_documento=numero_documento,
                telefono=telefono or '',
                direccion=direccion or '',
                fecha_nacimiento=fecha_nacimiento,
                ocupacion=ocupacion or '',
                ingresos_mensuales=ingresos_mensuales,
            )
            print("✅ Cliente creado:", cliente.id)  # Debug
        
        return user

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['id'] = instance.id
        return representation


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


# =========================================================
#                 ROLES / PERMISOS / BITÁCORA
# =========================================================

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


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'user_id', 'rol', 'rol_nombre',
                  'telefono', 'created_at', 'updated_at', 'is_deleted']




# =========================================================
#                      CLIENTE / EMPLEADO
# =========================================================

class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')


class ClienteSerializer(serializers.ModelSerializer):
    user_info = UserMiniSerializer(source='user', read_only=True)

    class Meta:
        model = Cliente
        fields = (
            'id', 'user_info', 'tipo_documento', 'numero_documento',
            'telefono', 'direccion', 'fecha_nacimiento', 'ocupacion',
            'ingresos_mensuales', 'fecha_registro', 'puntuacion_crediticia',
            'es_cliente_preferencial'
        )
    def get_user_info(self, obj):
        u = obj.user
        return {
            "id": u.id,
            "username": u.username,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "is_active": u.is_active,
        }


class EmpleadoSerializer(serializers.ModelSerializer):
    user_info = UserSerializer(source='user', read_only=True)
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)

    class Meta:
        model = Empleado
        fields = [
            'id',
            'user',
            'user_info',
            'codigo_empleado',
            'departamento',
            'fecha_contratacion',
            'salario',
            'es_supervisor',
            'puede_aprobar_creditos',
            'limite_aprobacion',
        ]

    def create(self, validated_data):
        # Generar código de empleado si no se proporciona
        if not validated_data.get('codigo_empleado'):
            import uuid
            validated_data['codigo_empleado'] = str(uuid.uuid4())[:10].upper()
        return super().create(validated_data)

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
        empleado = getattr(obj, 'empleado', None)
        if empleado:
            return EmpleadoSerializer(empleado).data
        return None


# =========================================================
#                    SOLICITUD DE CRÉDITO
# =========================================================

class SolicitudCreditoSerializer(serializers.ModelSerializer):
    """
    Versión 'full' para backoffice: incluye FK producto, tipo_credito y tipo_trabajador.
    """
    cliente_info = ClienteSerializer(source='cliente', read_only=True)

    class Meta:
        model = SolicitudCredito
        fields = (
            'id', 'cliente', 'cliente_info', 'oficial',
            'producto', 'tipo_credito', 'tipo_trabajador',
            'monto', 'plazo_meses', 'tasa_nominal_anual', 'moneda',
            'estado', 'score_riesgo',
            'observacion_evaluacion', 'fecha_evaluacion', 'fecha_aprobacion',
            'created_at', 'updated_at'
        )


class SolicitudCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitudCredito
        fields = [
            'id', 'cliente',
            'producto',          # <-- agregar
            'tipo_credito',      # <-- agregar (si tu modelo lo tiene)
            'tipo_trabajador',   # <-- agregar
            'monto', 'plazo_meses', 'tasa_nominal_anual', 'moneda'
        ]

    def validate(self, attrs):
        if attrs['monto'] <= 0:
            raise serializers.ValidationError({"monto": "Debe ser > 0"})
        if attrs['plazo_meses'] < 1:
            raise serializers.ValidationError({"plazo_meses": "Debe ser >= 1"})
        if not attrs.get('producto'):
            raise serializers.ValidationError({"producto": "Requerido"})
        if not attrs.get('tipo_trabajador'):
            raise serializers.ValidationError({"tipo_trabajador": "Requerido"})
        return attrs



class SolicitudListSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.SerializerMethodField()
    oficial_codigo = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudCredito
        fields = ['id', 'cliente', 'cliente_nombre', 'oficial', 'oficial_codigo',
                  'monto', 'plazo_meses', 'tasa_nominal_anual', 'moneda', 'estado', 'created_at']

    def get_cliente_nombre(self, obj):
        try:
            return obj.cliente.user.get_full_name()
        except Exception:
            return ''

    def get_oficial_codigo(self, obj):
        return getattr(obj.oficial, 'codigo_empleado', None)


class SolicitudDetailSerializer(serializers.ModelSerializer):
    """Detalle enriquecido para panel del oficial."""
    cliente_info = ClienteSerializer(source='cliente', read_only=True)
    cliente_user = UserMiniSerializer(source='cliente.user', read_only=True)
    cliente_panel = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudCredito
        fields = (
            'id', 'cliente', 'cliente_info', 'cliente_user', 'cliente_panel',
            'oficial', 'producto', 'tipo_credito', 'tipo_trabajador',
            'monto', 'plazo_meses', 'tasa_nominal_anual', 'moneda',
            'estado', 'score_riesgo', 'observacion_evaluacion',
            'fecha_evaluacion', 'fecha_aprobacion', 'created_at', 'updated_at'
        )

    def get_cliente_panel(self, obj):
        u = obj.cliente.user
        c = obj.cliente
        nombre = (f"{u.first_name} {u.last_name}".strip()) or (u.username or f"Cliente #{c.id}")
        return {
            "nombre": nombre,
            "usuario": u.username,
            "email": u.email,
            "documento": f"{c.tipo_documento} {c.numero_documento}" if c.numero_documento else None,
            "telefono": c.telefono,
            "direccion": c.direccion,
            "ocupacion": c.ocupacion,
            "ingresos": c.ingresos_mensuales,
            "preferencial": c.es_cliente_preferencial,
        }


# =========================================================
#                   PLAN DE PAGO / CUOTAS
# =========================================================

class PlanCuotaDTO(serializers.ModelSerializer):
    class Meta:
        model = PlanCuota
        fields = ['nro_cuota', 'fecha_vencimiento', 'capital', 'interes', 'cuota', 'saldo', 'ajuste_redondeo']


class PlanPagoDTO(serializers.ModelSerializer):
    cuotas = PlanCuotaDTO(many=True, read_only=True)
    solicitud_id = serializers.UUIDField(source='solicitud.id', read_only=True)

    class Meta:
        model = PlanPago
        fields = ['id', 'solicitud_id', 'metodo', 'moneda', 'primera_cuota_fecha',
                  'total_capital', 'total_interes', 'total_cuotas', 'redondeo_ajuste_total', 'cuotas']


# =========================================================
#                REGISTRO PÚBLICO (User+Cliente)
# =========================================================

class PublicRegisterSerializer(serializers.Serializer):
    # User
    username = serializers.CharField(
        validators=[UniqueValidator(queryset=User.objects.all(),
                                    message="El nombre de usuario ya existe.")]
    )
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=User.objects.all(),
                                    message="El email ya está registrado.")]
    )
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    # Cliente
    tipo_documento = serializers.ChoiceField(choices=Cliente.TIPOS_DOCUMENTO)
    numero_documento = serializers.CharField(
        validators=[UniqueValidator(queryset=Cliente.objects.all(),
                                    message="El número de documento ya existe.")]
    )
    telefono = serializers.CharField()
    direccion = serializers.CharField(required=False, allow_blank=True)
    fecha_nacimiento = serializers.DateField(required=False, allow_null=True)
    ocupacion = serializers.CharField(required=False, allow_blank=True)
    ingresos_mensuales = serializers.DecimalField(max_digits=12, decimal_places=2,
                                                  required=False, allow_null=True)

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        return attrs

    def create(self, validated):
        # 1) user
        validated.pop('password2')
        pwd = validated.pop('password')
        username = validated.pop('username')
        email = validated.pop('email')
        first = validated.pop('first_name', '')
        last = validated.pop('last_name', '')

        user = User.objects.create_user(
            username=username, email=email,
            first_name=first, last_name=last,
            password=pwd, is_active=True
        )

        # 2) rol Cliente
        rol_cliente, _ = Rol.objects.get_or_create(
            nombre='Cliente', defaults={'descripcion': 'Rol por defecto de clientes'}
        )
        UserProfile.objects.create(user=user, rol=rol_cliente)

        # 3) cliente
        Cliente.objects.create(user=user, **validated)
        return user

    def to_representation(self, instance):
        return {
            "username": instance.username,
            "email": instance.email,
            "first_name": instance.first_name,
            "last_name": instance.last_name,
            "is_active": instance.is_active,
        }


# =========================================================
#                 DOCUMENTOS / PRODUCTOS (CU18/19)
# =========================================================

class DocumentoTipoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentoTipo
        fields = ['id', 'codigo', 'nombre', 'descripcion', 'vigencia_dias']


class ProductoMiniSerializer(serializers.ModelSerializer):
    """Contexto liviano de producto para listados de requisitos."""
    class Meta:
        model = ProductoFinanciero
        fields = ['id', 'nombre', 'tipo']


class ProductoFinancieroSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductoFinanciero
        fields = [
            'id', 'codigo', 'nombre', 'tipo',
            'tasa_nominal_anual_min', 'tasa_nominal_anual_max',
            'plazo_min', 'plazo_max', 'monto_min', 'monto_max',
            'metodo_amortizacion_default', 'activo'
        ]


# ---------- Requisitos (READ) ----------
class RequisitoProductoDocumentoSerializer(serializers.ModelSerializer):
    """
    READ: devuelve el requisito con documento expandido y (opcional) un mini
    resumen del producto para tablas en el editor.
    """
    documento = DocumentoTipoSerializer()
    producto_info = ProductoMiniSerializer(source='producto', read_only=True)

    class Meta:
        model = RequisitoProductoDocumento
        fields = ['id', 'producto', 'producto_info', 'tipo_trabajador', 'obligatorio', 'documento']
        read_only_fields = ['producto_info']


# ---------- Requisitos (WRITE) ----------
class RequisitoProductoDocumentoWriteSerializer(serializers.ModelSerializer):
    """
    WRITE: acepta IDs planos (producto, documento) para create/update.
    Incluye validación para evitar duplicados por (producto, tipo_trabajador, documento).
    """
    class Meta:
        model = RequisitoProductoDocumento
        fields = ['id', 'producto', 'tipo_trabajador', 'documento', 'obligatorio']

    def validate(self, attrs):
        producto = attrs.get('producto') or getattr(self.instance, 'producto', None)
        tipo = attrs.get('tipo_trabajador') or getattr(self.instance, 'tipo_trabajador', None)
        documento = attrs.get('documento') or getattr(self.instance, 'documento', None)

        if producto and tipo and documento:
            qs = RequisitoProductoDocumento.objects.filter(
                producto=producto, tipo_trabajador=tipo, documento=documento
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"non_field_errors": ["Ya existe este documento para ese producto y tipo de trabajador."]}
                )
        return attrs


class DocumentoAdjuntoSerializer(serializers.ModelSerializer):
    """
    CU19: subir/gestionar adjuntos. 'valido' y 'observacion' se calculan en el ViewSet.
    """
    documento_tipo_info = DocumentoTipoSerializer(source='documento_tipo', read_only=True)

    class Meta:
        model = DocumentoAdjunto
        fields = [
            'id', 'solicitud', 'documento_tipo', 'documento_tipo_info', 'archivo',
            'fecha_emision', 'fecha_vencimiento', 'valido', 'observacion', 'uploaded_at'
        ]
        read_only_fields = ['valido', 'observacion', 'uploaded_at']


# =========================================================
#                CHECKLIST (DTO para front)
# =========================================================

class ChecklistItemSerializer(serializers.Serializer):
    codigo = serializers.CharField()
    nombre = serializers.CharField()
    obligatorio = serializers.BooleanField()
    recibido = serializers.BooleanField()
    valido = serializers.BooleanField(allow_null=True)
    motivo = serializers.CharField(allow_null=True, required=False)

    # extras
    adjunto_id = serializers.IntegerField(allow_null=True, required=False)
    archivo_url = serializers.CharField(allow_null=True, required=False)
    fecha_emision = serializers.DateField(allow_null=True, required=False)
    documento_tipo_id = serializers.IntegerField()

class ValidacionDocumentoSerializer(serializers.ModelSerializer):
    documento_info = serializers.SerializerMethodField()
    validado_por_nombre = serializers.CharField(source='validado_por.username', read_only=True)

    class Meta:
        model = ValidacionDocumento
        fields = '__all__'

    def get_documento_info(self, obj):
        return {
            'id': obj.documento.id,
            'tipo': obj.documento.documento_tipo.nombre,
            'archivo_url': obj.documento.archivo.url if obj.documento.archivo else None
        }

class ResultadoValidacionIASerializer(serializers.ModelSerializer):
    class Meta:
        model = ResultadoValidacionIA
        fields = '__all__'

class ProcesarValidacionSerializer(serializers.Serializer):
    solicitud_id = serializers.UUIDField()
    usar_ia = serializers.BooleanField(default=True)
    criterios_manuales = serializers.JSONField(required=False)

    def validate_solicitud_id(self, value):
        try:
            solicitud = SolicitudCredito.objects.get(id=value)
            return value
        except SolicitudCredito.DoesNotExist:
            raise serializers.ValidationError("Solicitud no encontrada")

class DocumentoValidacionSerializer(serializers.Serializer):
    documento_id = serializers.IntegerField()
    estado = serializers.ChoiceField(choices=ValidacionDocumento.ESTADOS_VALIDACION)
    observaciones = serializers.CharField(required=False, allow_blank=True)
    score_confianza = serializers.FloatField(required=False, min_value=0, max_value=1)