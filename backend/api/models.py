from django.db import models
from django.contrib.auth.models import User
import uuid
from decimal import Decimal


# Tus modelos existentes
class Rol(models.Model):
    nombre = models.CharField(max_length=80, unique=True)
    descripcion = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return self.nombre


class Permiso(models.Model):
    nombre = models.CharField(max_length=80, unique=True)
    descripcion = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return self.nombre


class RolPermiso(models.Model):
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE)
    permiso = models.ForeignKey(Permiso, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        unique_together = (('rol', 'permiso'),)

    def __str__(self):
        return f"{self.rol.nombre} - {self.permiso.nombre}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    rol = models.ForeignKey(Rol, on_delete=models.SET_NULL, null=True, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {self.rol.nombre if self.rol else 'Sin rol'}"


class Bitacora(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    tipo_accion = models.CharField(max_length=50)
    ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.usuario.username} - {self.tipo_accion} - {self.created_at}"


# Nuevos modelos sugeridos por la IA
class Cliente(models.Model):
    TIPOS_DOCUMENTO = [
        ('CI', 'Cédula de Identidad'),
        ('PAS', 'Pasaporte'),
        ('NIT', 'NIT'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    tipo_documento = models.CharField(max_length=3, choices=TIPOS_DOCUMENTO, default='CI')
    numero_documento = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=20)
    direccion = models.TextField()
    fecha_nacimiento = models.DateField(null=True, blank=True)
    ocupacion = models.CharField(max_length=100, blank=True)
    ingresos_mensuales = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    puntuacion_crediticia = models.IntegerField(default=0)
    es_cliente_preferencial = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'clientes'
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.numero_documento}"


class Empleado(models.Model):
    DEPARTAMENTOS = [
        ('CREDITO', 'Crédito'),
        ('ADMIN', 'Administración'),
        ('TESORERIA', 'Tesorería'),
        ('ATENCION', 'Atención al Cliente'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    codigo_empleado = models.CharField(max_length=10, unique=True)
    departamento = models.CharField(max_length=20, choices=DEPARTAMENTOS)
    fecha_contratacion = models.DateField()
    salario = models.DecimalField(max_digits=10, decimal_places=2)
    es_supervisor = models.BooleanField(default=False)
    puede_aprobar_creditos = models.BooleanField(default=False)
    limite_aprobacion = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    class Meta:
        db_table = 'empleados'
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.codigo_empleado}"
    
    def save(self, *args, **kwargs):
        if not self.codigo_empleado:
            self.codigo_empleado = str(uuid.uuid4())[:10].upper()
        super().save(*args, **kwargs)


class SolicitudCredito(models.Model):
    ESTADOS = [
        ('DRAFT', 'Borrador'),
        ('ENVIADA', 'Enviada'),
        ('EVALUADA', 'Evaluada'),
        ('APROBADA', 'Aprobada'),
        ('RECHAZADA', 'Rechazada'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cliente = models.ForeignKey('api.Cliente', on_delete=models.PROTECT, related_name='solicitudes')
    oficial = models.ForeignKey('api.Empleado', on_delete=models.SET_NULL, null=True, blank=True, related_name='solicitudes')
    monto = models.DecimalField(max_digits=14, decimal_places=2)
    plazo_meses = models.PositiveIntegerField()
    tasa_nominal_anual = models.DecimalField(max_digits=7, decimal_places=4)  # ej. 24.0000
    moneda = models.CharField(max_length=10, default='BOB')
    estado = models.CharField(max_length=10, choices=ESTADOS, default='ENVIADA')
    
    TIPO_TRABAJADOR = [('PUBLICO','Público'),('PRIVADO','Privado'),('INDEPENDIENTE','Independiente')]
    TIPO_CREDITO = [('PERSONAL','Personal'),('VEHICULAR','Vehicular'),('HIPOTECARIO','Hipotecario'),('PYME','Micro/Pequeña Empresa')]
    producto = models.ForeignKey('ProductoFinanciero', on_delete=models.PROTECT, null=True, blank=True)
    tipo_credito = models.CharField(max_length=20, choices=TIPO_CREDITO, default='PERSONAL')
    tipo_trabajador = models.CharField(max_length=20, choices=TIPO_TRABAJADOR, default='PRIVADO')
    # evaluación
    score_riesgo = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    observacion_evaluacion = models.TextField(blank=True, null=True)
    fecha_evaluacion = models.DateTimeField(null=True, blank=True)
    # decisión
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'solicitudes_credito'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.cliente} | {self.monto} {self.moneda} | {self.estado}"


class PlanPago(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    solicitud = models.ForeignKey(
    SolicitudCredito,
    on_delete=models.CASCADE,
    related_name='plan',
    to_field='id',         # referencia explícita al campo UUID
    db_column='solicitud_id'  # nombre de columna en la BD
    )
    metodo = models.CharField(max_length=20, default='frances')
    moneda = models.CharField(max_length=10, default='BOB')
    primera_cuota_fecha = models.DateField()
    total_capital = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal('0.00'))
    total_interes = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal('0.00'))
    total_cuotas = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal('0.00'))
    redondeo_ajuste_total = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal('0.00'))
    generado_por = models.ForeignKey(User, on_delete=models.PROTECT)
    generado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'plan_pago'

class PlanCuota(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(PlanPago, on_delete=models.CASCADE, related_name='cuotas')
    nro_cuenta = models.IntegerField(default=0)  # (opcional) por si usas cuenta
    nro_cuota = models.PositiveIntegerField()
    fecha_vencimiento = models.DateField()
    capital = models.DecimalField(max_digits=16, decimal_places=2)
    interes = models.DecimalField(max_digits=16, decimal_places=2)
    cuota = models.DecimalField(max_digits=16, decimal_places=2)
    saldo = models.DecimalField(max_digits=16, decimal_places=2)
    ajuste_redondeo = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        db_table = 'plan_cuota'
        unique_together = (('plan', 'nro_cuota'),)
        ordering = ['nro_cuota']

# === Productos y Requisitos Documentales ===

class ProductoFinanciero(models.Model):
    TIPOS = [
        ('PERSONAL', 'Personal/Consumo'),
        ('VEHICULAR', 'Vehicular'),
        ('HIPOTECARIO', 'Hipotecario'),
        ('PYME', 'Micro/Pequeña Empresa'),
    ]
    codigo = models.CharField(max_length=30, unique=True)
    nombre = models.CharField(max_length=120)
    tipo = models.CharField(max_length=20, choices=TIPOS)
    tasa_nominal_anual_min = models.DecimalField(max_digits=7, decimal_places=4)
    tasa_nominal_anual_max = models.DecimalField(max_digits=7, decimal_places=4)
    plazo_min = models.PositiveIntegerField()
    plazo_max = models.PositiveIntegerField()
    monto_min = models.DecimalField(max_digits=14, decimal_places=2)
    monto_max = models.DecimalField(max_digits=14, decimal_places=2)
    metodo_amortizacion_default = models.CharField(max_length=20, default='frances')
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'producto_financiero'

    def __str__(self):
        return f'{self.codigo} - {self.nombre}'


class DocumentoTipo(models.Model):
    codigo = models.CharField(max_length=40, unique=True)  # CI, DOMICILIO, BOLETAS_3M, AFP_1M, EXTRACTOS_6M, PROFORMA_VEH, FOLIO_REAL, AVALUO, etc.
    nombre = models.CharField(max_length=120)
    descripcion = models.TextField(blank=True)
    vigencia_dias = models.PositiveIntegerField(null=True, blank=True)  # 30, 60, 90, etc. (None = sin vigencia)

    class Meta:
        db_table = 'documento_tipo'

    def __str__(self):
        return f'{self.codigo} - {self.nombre}'


class RequisitoProductoDocumento(models.Model):
    TRABAJADOR = [('PUBLICO','Público'),('PRIVADO','Privado'),('INDEPENDIENTE','Independiente')]
    producto = models.ForeignKey(ProductoFinanciero, on_delete=models.CASCADE, related_name='requisitos')
    tipo_trabajador = models.CharField(max_length=20, choices=TRABAJADOR)
    documento = models.ForeignKey(DocumentoTipo, on_delete=models.CASCADE)
    obligatorio = models.BooleanField(default=True)

    class Meta:
        db_table = 'req_prod_doc'
        unique_together = (('producto','tipo_trabajador','documento'),)

    def __str__(self):
        return f'{self.producto.codigo} - {self.tipo_trabajador} - {self.documento.codigo}'

class DocumentoAdjunto(models.Model):
    solicitud = models.ForeignKey(SolicitudCredito, on_delete=models.CASCADE, related_name='documentos')
    documento_tipo = models.ForeignKey(DocumentoTipo, on_delete=models.PROTECT)
    archivo = models.FileField(upload_to='solicitudes/%Y/%m/')
    fecha_emision = models.DateField(null=True, blank=True)
    fecha_vencimiento = models.DateField(null=True, blank=True)
    valido = models.BooleanField(default=None, null=True)
    observacion = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'documento_adjunto'

    def __str__(self):
        return f'{self.solicitud_id} - {self.documento_tipo.codigo}'
