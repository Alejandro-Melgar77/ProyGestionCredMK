from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from .models import LogEntry
from .middleware import _get_ip
from django.contrib.auth import get_user_model

User = get_user_model()


@receiver(user_logged_in)
def on_login(sender, request, user, **kwargs):
    """
    Registra el inicio de sesión en la bitácora con usuario siempre válido.
    """
    try:
        # Intentar asegurar una instancia válida de usuario
        if isinstance(user, User):
            usuario_final = user
        else:
            # Si por alguna razón el user no es instancia válida, intentar buscarlo
            username = getattr(user, "username", None)
            usuario_final = User.objects.filter(username=username).first()

        # Si no se encuentra usuario válido, registrar como "Sistema"
        if not usuario_final:
            usuario_final = None
            username_display = "Sistema"
        else:
            username_display = usuario_final.username

        LogEntry.objects.create(
            usuario=usuario_final,
            accion=LogEntry.Accion.ACCESO,
            ruta=(request.path or "/api/auth/login/"),
            metodo=(request.method if request else "POST"),
            ip=_get_ip(request) if request else None,
            estado_http=200,
        )

        print(f"[Bitácora] ✅ Inicio de sesión registrado para usuario: {username_display}")

    except Exception as e:
        print(f"[Bitácora] ⚠️ Error registrando login: {e}")
        pass


@receiver(user_logged_out)
def on_logout(sender, request, user, **kwargs):
    """
    Registra el cierre de sesión en la bitácora.
    """
    try:
        usuario_final = user if isinstance(user, User) else None
        username_display = getattr(user, "username", "Sistema")

        LogEntry.objects.create(
            usuario=usuario_final,
            accion=LogEntry.Accion.CERRAR_SESION,
            ruta=(request.path or "/api/auth/logout/"),
            metodo=(request.method if request else "POST"),
            ip=_get_ip(request) if request else None,
            estado_http=200,
        )

        print(f"[Bitácora] ✅ Cierre de sesión registrado para usuario: {username_display}")

    except Exception as e:
        print(f"[Bitácora] ⚠️ Error registrando logout: {e}")
        pass
