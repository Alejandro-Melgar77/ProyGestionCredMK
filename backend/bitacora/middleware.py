import re
from django.utils.deprecation import MiddlewareMixin
from .models import LogEntry
from django.contrib.auth import get_user_model

User = get_user_model()

EXCLUDE_PATHS = [
    r"^/admin", r"^/static", r"^/media",
    r"^/api/bitacora",  # evita autorregistrarse
    r"^/favicon\.ico$",
]

def _excluded(path: str) -> bool:
    return any(re.match(p, path) for p in EXCLUDE_PATHS)

def _get_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")

METHOD_TO_ACCION = {
    "POST": LogEntry.Accion.CREAR,
    "PUT": LogEntry.Accion.ACTUALIZAR,
    "PATCH": LogEntry.Accion.ACTUALIZAR,
    "DELETE": LogEntry.Accion.BORRAR,
}

class AuditLogMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        try:
            path = request.path or "/"
            metodo = request.method.upper()

            if _excluded(path):
                return response

            # Detectar inicio de sesión JWT exitoso
            if "/api/auth/login" in path and response.status_code in [200, 201]:
                # Intentar capturar el usuario autenticado por username en payload
                username = None
                if hasattr(request, "data"):
                    username = request.data.get("username") or request.data.get("email")

                usuario_final = None
                if username:
                    usuario_final = User.objects.filter(username=username).first()

                LogEntry.objects.create(
                    usuario=usuario_final,
                    accion=LogEntry.Accion.ACCESO,
                    ruta=path,
                    metodo=metodo,
                    ip=_get_ip(request),
                    estado_http=response.status_code,
                )
                return response

            # Resto de acciones CRUD normales
            accion = METHOD_TO_ACCION.get(metodo)
            if accion:
                LogEntry.objects.create(
                    usuario=request.user if getattr(request, "user", None) and request.user.is_authenticated else None,
                    accion=accion,
                    ruta=path,
                    metodo=metodo,
                    ip=_get_ip(request),
                    estado_http=getattr(response, "status_code", None),
                )
        except Exception as e:
            print(f"[Bitácora]  Error registrando acción: {e}")
        return response
