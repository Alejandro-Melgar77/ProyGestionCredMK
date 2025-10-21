from django.contrib import admin
from .models import LogEntry

@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    list_display = ("creado_en", "usuario", "accion", "ruta", "metodo", "estado_http", "ip")
    list_filter = ("accion", "metodo", "estado_http", "creado_en")
    search_fields = ("ruta", "usuario__username", "ip")
    date_hierarchy = "creado_en"
