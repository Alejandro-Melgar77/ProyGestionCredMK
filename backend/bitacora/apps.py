from django.apps import AppConfig

class BitacoraConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bitacora"

    def ready(self):
        # Carga los receivers de señales
        import bitacora.signals  # noqa
