from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = "Comando de prueba"

    def handle(self, *args, **options):
        print("✅ Comando detectado por Django")