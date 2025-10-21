# backend/api/management/commands/seed_initial_data.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Rol, UserProfile, Cliente
from django.core.management import call_command

class Command(BaseCommand):
    help = "Carga datos iniciales: roles, usuarios y fixture de productos/requisitos"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("🚀 Iniciando carga de datos base..."))

        # === 1. Roles base ===
        roles = ["Administrador", "Oficial de Crédito", "Cliente"]
        for r in roles:
            Rol.objects.get_or_create(nombre=r)
        self.stdout.write(self.style.SUCCESS(f"✅ Roles creados: {', '.join(roles)}"))

        # === 2. Usuario administrador del sistema ===
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "first_name": "Administrador",
                "last_name": "Sistema",
                "email": "admin@demo.com",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin_user.set_password("admin123")
            admin_user.save()
            self.stdout.write(self.style.SUCCESS("👑 Usuario administrador creado (admin / admin123)"))
        else:
            self.stdout.write(self.style.WARNING("👑 Usuario administrador ya existente."))

        rol_admin = Rol.objects.get(nombre="Administrador")
        UserProfile.objects.get_or_create(user=admin_user, rol=rol_admin)

        # === 3. Crear 3 clientes ===
        rol_cliente = Rol.objects.get(nombre="Cliente")
        clientes_data = [
            ("carlos", "Carlos", "Rojas", "carlos@demo.com"),
            ("maria", "María", "Pérez", "maria@demo.com"),
            ("luis", "Luis", "Fernández", "luis@demo.com"),
        ]

        for username, first, last, email in clientes_data:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "email": email,
                    "is_staff": False,
                },
            )
            if created:
                user.set_password("cliente123")
                user.save()
                self.stdout.write(self.style.SUCCESS(f"👤 Cliente {username} creado (contraseña: cliente123)"))
            else:
                self.stdout.write(self.style.WARNING(f"👤 Cliente {username} ya existe."))

            UserProfile.objects.get_or_create(user=user, rol=rol_cliente)
            Cliente.objects.get_or_create(user=user, ci=f"10{user.id:04d}", telefono="70000000")

        # === 4. Cargar fixture de productos y requisitos ===
        self.stdout.write(self.style.WARNING("📦 Cargando fixture productos_requisitos.json ..."))
        call_command("loaddata", "api/fixtures/productos_requisitos.json")

        self.stdout.write(self.style.SUCCESS("✅ Datos base cargados exitosamente."))
