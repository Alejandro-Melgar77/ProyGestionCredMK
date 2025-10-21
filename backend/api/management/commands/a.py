# backend/api/management/commands/a.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta
from api.models import (
    Cliente, Empleado, SolicitudCredito, ProductoFinanciero, 
    PlanPago, PlanCuota, UserProfile, Rol
)

class Command(BaseCommand):
    help = "Crea datos de prueba para cuotas pendientes"

    def handle(self, *args, **kwargs):
        self.stdout.write("Creando datos de prueba para cuotas pendientes...")

        # Crear rol cliente
        rol_cliente, created = Rol.objects.get_or_create(
            nombre='Cliente',
            defaults={'descripcion': 'Rol para clientes del sistema'}
        )
        
        # Crear usuario cliente
        usuario_cliente, created = User.objects.get_or_create(
            id='20',
            defaults={
                'email': 'cliente@test.com',
                'first_name': 'Juan',
                'last_name': 'Pérez'
            }
        )
        usuario_cliente.set_password('password123')
        usuario_cliente.save()
        
        # Crear perfil de usuario
        user_profile, created = UserProfile.objects.get_or_create(
            user=usuario_cliente,
            defaults={'rol': rol_cliente}
        )
        
        # Crear cliente
        cliente, created = Cliente.objects.get_or_create(
            user=usuario_cliente,
            defaults={
                'tipo_documento': 'CI',
                'numero_documento': '1234567',
                'telefono': '77777777',
                'direccion': 'Av. Test #123',
                'fecha_nacimiento': datetime(1985, 5, 15).date(),
                'ocupacion': 'Ingeniero',
                'ingresos_mensuales': Decimal('15000.00')
            }
        )
        
        # Crear producto financiero
        producto, created = ProductoFinanciero.objects.get_or_create(
            codigo='PERSONAL_001',
            defaults={
                'nombre': 'Préstamo Personal Estándar',
                'tipo': 'PERSONAL',
                'tasa_nominal_anual_min': Decimal('12.0000'),
                'tasa_nominal_anual_max': Decimal('24.0000'),
                'plazo_min': 6,
                'plazo_max': 36,
                'monto_min': Decimal('1000.00'),
                'monto_max': Decimal('50000.00'),
                'metodo_amortizacion_default': 'frances',
                'activo': True
            }
        )
        
        # Crear solicitud de crédito
        solicitud = SolicitudCredito.objects.create(
            cliente=cliente,
            monto=Decimal('10000.00'),
            plazo_meses=12,
            tasa_nominal_anual=Decimal('18.0000'),
            moneda='BOB',
            estado='APROBADA',
            tipo_credito='PERSONAL',
            tipo_trabajador='PRIVADO',
            producto=producto,
            score_riesgo=Decimal('75.50'),
            fecha_aprobacion=timezone.now()
        )
        
        # Crear plan de pago
        plan = PlanPago.objects.create(
            solicitud=solicitud,
            metodo='frances',
            moneda='BOB',
            primera_cuota_fecha=datetime.now().date() + timedelta(days=15),
            total_capital=Decimal('10000.00'),
            total_interes=Decimal('983.00'),
            total_cuotas=Decimal('10983.00'),
            generado_por=usuario_cliente
        )
        
        # Crear cuotas
        cuotas = [
            {
                'nro_cuota': 1,
                'fecha_vencimiento': datetime.now().date() - timedelta(days=5),
                'capital': Decimal('800.00'),
                'interes': Decimal('150.00'),
                'cuota': Decimal('950.00'),
                'saldo': Decimal('9200.00'),
                'estado': 'PENDIENTE'
            },
            {
                'nro_cuota': 2,
                'fecha_vencimiento': datetime.now().date() + timedelta(days=10),
                'capital': Decimal('820.00'),
                'interes': Decimal('130.00'),
                'cuota': Decimal('950.00'),
                'saldo': Decimal('8380.00'),
                'estado': 'PENDIENTE'
            },
            {
                'nro_cuota': 3,
                'fecha_vencimiento': datetime.now().date() + timedelta(days=40),
                'capital': Decimal('840.00'),
                'interes': Decimal('110.00'),
                'cuota': Decimal('950.00'),
                'saldo': Decimal('7540.00'),
                'estado': 'PENDIENTE'
            }
        ]
        
        for cuota_data in cuotas:
            PlanCuota.objects.create(plan=plan, **cuota_data)
        
        self.stdout.write(self.style.SUCCESS("✅ Datos de prueba creados exitosamente!"))
        self.stdout.write(f"   Cliente: {cliente.user.get_full_name()}")
        self.stdout.write(f"   Usuario: cliente_test / password123")
        self.stdout.write(f"   Cuotas creadas: {len(cuotas)}")
