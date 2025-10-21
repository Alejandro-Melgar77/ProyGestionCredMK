from rest_framework import serializers
from .models import LogEntry

class LogEntrySerializer(serializers.ModelSerializer):
    usuario = serializers.StringRelatedField()  # muestra username

    class Meta:
        model = LogEntry
        fields = [
            "id", "usuario", "accion", "ruta", "metodo",
            "ip", "estado_http", "creado_en"
        ]
