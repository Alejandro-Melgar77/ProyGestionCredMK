from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from bitacora.models import LogEntry
from bitacora.middleware import _get_ip


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializer personalizado para registrar inicio de sesión en Bitácora.
    """

    def validate(self, attrs):
        data = super().validate(attrs)

        try:
            # Aquí el usuario ya fue autenticado
            user = self.user
            request = self.context.get("request")

            LogEntry.objects.create(
                usuario=user,
                accion=LogEntry.Accion.ACCESO,
                ruta="/api/auth/login/",
                metodo="POST",
                ip=_get_ip(request) if request else None,
                estado_http=200,
            )
        except Exception as e:
            print(f"[Bitácora] Error registrando acceso: {e}")

        return data
