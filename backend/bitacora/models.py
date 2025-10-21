from django.conf import settings
from django.db import models

class LogEntry(models.Model):
    class Accion(models.TextChoices):
        ACCESO = "ACCESO", "ACCESO"
        CERRAR_SESION = "CERRAR_SESION", "CERRAR SESIÓN"
        CREAR = "CREAR", "CREAR"
        ACTUALIZAR = "ACTUALIZAR", "ACTUALIZAR"
        BORRAR = "BORRAR", "ELIMINAR"

    # Usuario puede ser nulo (requests anónimos / fallidos)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="bitacora_logs"
    )
    accion = models.CharField(max_length=20, choices=Accion.choices)
    ruta = models.CharField(max_length=512)                 # p.ej. /api/usuarios/
    metodo = models.CharField(max_length=10)                # GET/POST/PUT/PATCH/DELETE
    ip = models.GenericIPAddressField(null=True, blank=True)
    estado_http = models.PositiveIntegerField(null=True, blank=True)

    # Fecha/hora
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bitacora_eventos_v2"  # <- evita conflicto con la tabla existente
        indexes = [
            models.Index(fields=["creado_en"]),
            models.Index(fields=["accion"]),
            models.Index(fields=["ruta"]),
            models.Index(fields=["metodo"]),
        ]
        ordering = ["-creado_en"]

    def __str__(self):
        u = getattr(self.usuario, "username", "anon")
        return f"[{self.creado_en:%Y-%m-%d %H:%M:%S}] {u} {self.accion} {self.ruta}"
