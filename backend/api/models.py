from django.db import models
from django.contrib.auth.models import User
import uuid

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
    codigo_empleado = models.CharField(max_length=10, unique=True, default=uuid.uuid4().hex[:10].upper())
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
