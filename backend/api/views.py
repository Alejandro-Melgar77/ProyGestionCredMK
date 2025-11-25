# backend/api/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone

from django.utils.timezone import now
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
import tempfile
from datetime import date


from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import io
import openpyxl
import json

from .services.plan_pago import generar_plan
from .services.simulador import simular_plan
from .services.validadores import validar_vigencia
from .services.reporte_service import ReporteGenerator, VoiceCommandProcessor

from .models import (
    Rol, Permiso, RolPermiso, UserProfile,
    Cliente, Empleado, SolicitudCredito,
    PlanPago, ProductoFinanciero,
    DocumentoTipo, RequisitoProductoDocumento, DocumentoAdjunto, ValidacionDocumento, ResultadoValidacionIA, TransaccionPago, PlanCuota, Reporte, ConfiguracionReporte, Empresa,
)

from .serializers import (
    # Usuarios
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    UserDetailSerializer, UserProfileSerializer, PublicRegisterSerializer,

    # Roles / Permisos / Bitácora
    RolSerializer, PermisoSerializer, RolPermisoSerializer,

    # Personas
    ClienteSerializer, EmpleadoSerializer,
    ClienteNestedSerializer, EmpleadoNestedSerializer,

    # Solicitudes
    SolicitudCreateSerializer, SolicitudListSerializer, SolicitudDetailSerializer, 

    # Plan pago
    PlanPagoDTO, TransaccionPagoSerializer, CuotaPendienteSerializer, PagoTarjetaSerializer, StripePaymentIntentSerializer, ConfirmarPagoSerializer,

    # Productos / Documentos
    ProductoFinancieroSerializer, DocumentoAdjuntoSerializer, DocumentoTipoSerializer,
    RequisitoProductoDocumentoSerializer, RequisitoProductoDocumentoWriteSerializer,
    ProcesarValidacionSerializer, ValidacionDocumentoSerializer, ResultadoValidacionIASerializer, DocumentoValidacionSerializer,

    ReporteSerializer,
    ConfiguracionReporteSerializer,
    FiltroReporteSerializer, EmpresaSerializer,
)

#Bitacora;
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers_auth import CustomTokenObtainPairSerializer 
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import status

# =========================================================
#                    PERMISOS DE NEGOCIO
# =========================================================
class IsOfficialOrAdmin(permissions.BasePermission):
    """Permite acceso a superuser o a usuarios con rol OFICIAL/ADMIN en UserProfile."""
    def has_permission(self, request, view):
        role = getattr(getattr(request.user, 'userprofile', None), 'rol', None)
        nombre = getattr(role, 'nombre', '').upper() if role else ''
        return bool(
            request.user and request.user.is_authenticated and
            (request.user.is_superuser or nombre in ('OFICIAL', 'ADMIN'))
        )
    
# =========================================================
#                    Registrar Inicio de Sesion
# =========================================================
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vista personalizada de login (usa serializer que registra el acceso en Bitácora).
    """

    serializer_class = CustomTokenObtainPairSerializer

    def get_serializer_context(self):
        """
        Inyecta el request actual al serializer para poder registrar el acceso correctamente.
        """
        context = super().get_serializer_context()
        context["request"] = self.request
        return context
# =========================================================
#                          USUARIOS
# =========================================================

class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer

# Modificar todas las viewsets existentes para filtrar por empresa
class BaseEmpresaViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
    
        # Si el usuario no tiene perfil, no filtramos por empresa
        perfil = getattr(user, "perfil", None)
    
        if perfil is None or perfil.empresa_id is None:
            # Modo temporal: devuelve TODO sin filtrar
            return super().get_queryset()
    
        # Si sí tiene empresa, se filtra por empresa
        empresa_id = perfil.empresa_id
        return super().get_queryset().filter(empresa_id=empresa_id)
    
    def perform_create(self, serializer):
        # Asignar empresa automáticamente
        empresa_id = self.request.user.perfil.empresa_id
        serializer.save(empresa_id=empresa_id)

class UserViewSet(BaseEmpresaViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['register_public', 'password_reset_request', 'password_reset_confirm']:
            return [AllowAny()]
        return [perm() for perm in self.permission_classes]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        if self.action == 'list':
            return UserDetailSerializer
        return UserSerializer

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        u = request.user
        data = UserSerializer(u).data
        cli = Cliente.objects.filter(user=u).first()
        emp = Empleado.objects.filter(user=u).first()
        data['rol_nombre'] = getattr(getattr(u, 'userprofile', None), 'rol', None) and u.userprofile.rol.nombre
        data['cliente_id'] = cli.id if cli else None
        data['empleado_id'] = emp.id if emp else None
        return Response(data)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register_public(self, request):
        ser = PublicRegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return Response(ser.to_representation(user), status=status.HTTP_201_CREATED)

    # -------- Password --------
    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        user = self.get_object()
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(serializer.validated_data['old_password']):
            return Response({"old_password": ["Contraseña actual incorrecta."]}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        Bitacora.objects.create(
            usuario=request.user,
            tipo_accion="CAMBIO_CONTRASENA",
            ip=self.get_client_ip(request)
        )
        return Response({"message": "Contraseña cambiada exitosamente."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def password_reset_request(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_url = f"{settings.FRONTEND_URL}/password-reset-confirm/{uid}/{token}/"
            send_mail(
                'Restablecimiento de Contraseña',
                f'Para restablecer tu contraseña, haz clic en el siguiente enlace: {reset_url}',
                settings.DEFAULT_FROM_EMAIL, [email], fail_silently=False,
            )
        except User.DoesNotExist:
            pass
        return Response({"message": "Si el email existe, recibirás un enlace para restablecer tu contraseña."}, status=200)

    @action(detail=False, methods=['post'])
    def password_reset_confirm(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is None or not default_token_generator.check_token(user, token):
            return Response({"error": "El enlace es inválido o ha expirado."}, status=400)

        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({"message": "Contraseña restablecida exitosamente."}, status=200)

    def get_client_ip(self, request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        return xff.split(',')[0] if xff else request.META.get('REMOTE_ADDR')
    
# =========================================================
#                    CLIENTE / EMPLEADO
# =========================================================
class ClienteViewSet(BaseEmpresaViewSet):
    queryset = Cliente.objects.select_related('user').all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]

class EmpleadoViewSet(BaseEmpresaViewSet):
    queryset = Empleado.objects.select_related('user').all()
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated]

# =========================================================
#              ROLES / PERMISOS / BITÁCORA
# =========================================================
class RolViewSet(BaseEmpresaViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'])
    def permisos(self, request, pk=None):
        rol = self.get_object()
        ser = RolPermisoSerializer(RolPermiso.objects.filter(rol=rol), many=True)
        return Response(ser.data)

    @action(detail=True, methods=['post'])
    def add_permiso(self, request, pk=None):
        rol = self.get_object()
        permiso_id = request.data.get('permiso_id')
        try:
            permiso = Permiso.objects.get(id=permiso_id)
            rp, created = RolPermiso.objects.get_or_create(rol=rol, permiso=permiso)
            if created:
                return Response(RolPermisoSerializer(rp).data, status=201)
            return Response({"error": "El permiso ya está asignado."}, status=400)
        except Permiso.DoesNotExist:
            return Response({"error": "Permiso no encontrado."}, status=404)

    @action(detail=True, methods=['delete'])
    def remove_permiso(self, request, pk=None):
        rol = self.get_object()
        permiso_id = request.data.get('permiso_id')
        try:
            permiso = Permiso.objects.get(id=permiso_id)
            rp = RolPermiso.objects.get(rol=rol, permiso=permiso)
            rp.delete()
            return Response(status=204)
        except (Permiso.DoesNotExist, RolPermiso.DoesNotExist):
            return Response({"error": "Permiso no encontrado o no asignado."}, status=404)

class PermisoViewSet(BaseEmpresaViewSet):
    queryset = Permiso.objects.all()
    serializer_class = PermisoSerializer
    permission_classes = [IsAuthenticated]

class RolPermisoViewSet(BaseEmpresaViewSet):
    queryset = RolPermiso.objects.all()
    serializer_class = RolPermisoSerializer
    permission_classes = [IsAuthenticated]

class UserProfileViewSet(BaseEmpresaViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]


# =========================================================
#                 SOLICITUDES (CU12/13/14)
# =========================================================
class SolicitudCreditoViewSet(BaseEmpresaViewSet):
    queryset = SolicitudCredito.objects.filter(is_deleted=False)
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return SolicitudCreateSerializer
        if self.action == 'list':
            return SolicitudListSerializer
        return SolicitudDetailSerializer

    def list(self, request, *args, **kwargs):
        qs = super().get_queryset()
        cid = request.query_params.get('cliente')
        if cid:
            qs = qs.filter(cliente=cid)
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(SolicitudListSerializer(page, many=True).data)
        return Response(SolicitudListSerializer(qs, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        self.queryset = (SolicitudCredito.objects
                         .select_related('cliente', 'cliente__user', 'oficial'))
        return super().retrieve(request, *args, **kwargs)

    def perform_create(self, serializer):
        obj = serializer.save()
        if not obj.estado:
            obj.estado = 'ENVIADA'
            obj.save(update_fields=['estado'])

    # ---- CU13: Evaluar ----
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsOfficialOrAdmin])
    def evaluar(self, request, pk=None):
        sol = self.get_object()
        score = request.data.get('score_riesgo')
        obs = request.data.get('observacion_evaluacion', '')
        if score is None:
            return Response({"detail": "score_riesgo requerido"}, status=400)

        sol.score_riesgo = score
        sol.observacion_evaluacion = obs
        sol.fecha_evaluacion = now()
        if sol.estado in ('ENVIADA', 'DRAFT'):
            sol.estado = 'EVALUADA'
        sol.oficial = Empleado.objects.filter(user=request.user).first() or sol.oficial
        sol.save()
        return Response(SolicitudDetailSerializer(sol).data)

    # ---- CU14: Decidir ----
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsOfficialOrAdmin])
    def decidir(self, request, pk=None):
        sol = self.get_object()
        decision = (request.data.get('decision') or '').upper()
        if decision not in ('APROBAR', 'RECHAZAR'):
            return Response({"detail": "decision debe ser APROBAR o RECHAZAR"}, status=400)

        if decision == 'APROBAR':
            sol.estado = 'APROBADA'
            sol.fecha_aprobacion = now()
        else:
            sol.estado = 'RECHAZADA'
            sol.fecha_aprobacion = None

        sol.oficial = Empleado.objects.filter(user=request.user).first() or sol.oficial
        sol.save()
        return Response(SolicitudDetailSerializer(sol).data)

    # ---- Checklist para front ----
    @action(detail=True, methods=['get'], url_path='documentos/checklist')
    def checklist(self, request, pk=None):
        sol = self.get_object()
        if not sol.producto or not sol.tipo_trabajador:
            return Response({'detail': 'Solicitud sin producto o tipo_trabajador'}, status=400)

        reqs = (RequisitoProductoDocumento.objects
                .select_related('documento')
                .filter(producto=sol.producto, tipo_trabajador=sol.tipo_trabajador))

        adjuntos = {a.documento_tipo_id: a for a in sol.documentos.all()}
        items = []
        for r in reqs:
            a = adjuntos.get(r.documento.id)
            items.append({
                'codigo': r.documento.codigo,
                'nombre': r.documento.nombre,
                'obligatorio': r.obligatorio,
                'recibido': bool(a),
                'valido': None if not a else a.valido,
                'motivo': None if not a else (a.observacion or None),
                'adjunto_id': None if not a else a.id,
                'archivo_url': None if not a or not a.archivo else a.archivo.url,
                'fecha_emision': None if not a else a.fecha_emision,
                'documento_tipo_id': r.documento.id,
            })
        return Response(items)

    @action(detail=True, methods=['get'], url_path='seguimiento', permission_classes=[IsAuthenticated])
    def seguimiento(self, request, pk=None):
        sol = self.get_object()
        timeline = [
            {'evento': 'CREADA', 'fecha': sol.created_at},
            {'evento': f'ESTADO_{sol.estado}', 'fecha': sol.updated_at},
        ]
        return Response({'estadoActual': sol.estado, 'timelineEstados': timeline})
    
    @action(detail=True, methods=['get'], url_path='plan-pagos', permission_classes=[IsAuthenticated])
    def plan_pagos(self, request, pk=None):
        try:
            plan = PlanPago.objects.prefetch_related('cuotas').get(solicitud_id=pk)
        except PlanPago.DoesNotExist:
            return Response({"detail": "Plan no encontrado"}, status=404)
        return Response(PlanPagoDTO(plan).data)

    # ---- Exportar plan (PDF/XLSX) ----
    @action(detail=True, methods=['get'], url_path='plan-pagos/export', permission_classes=[IsAuthenticated])
    def export_plan(self, request, pk=None, format=None):
        fmt = (request.query_params.get('format') or 'pdf').lower()
        try:
            plan = (PlanPago.objects
                    .select_related('solicitud')
                    .prefetch_related('cuotas')
                    .get(solicitud_id=pk))
        except PlanPago.DoesNotExist:
            return Response({"detail": "Plan no encontrado"}, status=404)

        if fmt == 'xlsx':
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Plan"
            ws.append(["#", "Vencimiento", "Capital", "Interés", "Cuota", "Saldo"])
            for c in plan.cuotas.all():
                ws.append([
                    c.nro_cuota, str(c.fecha_vencimiento),
                    float(c.capital), float(c.interes),
                    float(c.cuota), float(c.saldo)
                ])
            ws.append([])
            ws.append(["Totales", "", float(plan.total_capital),
                       float(plan.total_interes), float(plan.total_cuotas), ""])
            bio = io.BytesIO()
            wb.save(bio)
            bio.seek(0)
            resp = HttpResponse(
                bio.read(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            resp['Content-Disposition'] = f'attachment; filename=plan_{plan.id}.xlsx'
            return resp

        # PDF
        bio = io.BytesIO()
        c = canvas.Canvas(bio, pagesize=A4)
        w, h = A4
        y = h - 50
        c.setFont("Helvetica-Bold", 12)
        c.drawString(40, y, f"Plan de Pagos – Solicitud {plan.solicitud_id}"); y -= 20
        c.setFont("Helvetica", 10)
        c.drawString(40, y, f"Método: {plan.metodo}  Moneda: {plan.moneda}  Primera cuota: {plan.primera_cuota_fecha}"); y -= 20
        c.drawString(40, y, f"Totales  Capital: {plan.total_capital}  Interés: {plan.total_interes}  Cuotas: {plan.total_cuotas}"); y -= 30
        c.setFont("Helvetica-Bold", 10); c.drawString(40, y, "#  Venc     Capital   Interés   Cuota   Saldo"); y -= 15
        c.setFont("Helvetica", 10)
        for cu in plan.cuotas.all():
            line = f"{cu.nro_cuota:02d} {str(cu.fecha_vencimiento)}  {cu.capital}   {cu.interes}   {cu.cuota}   {cu.saldo}"
            c.drawString(40, y, line); y -= 14
            if y < 60:
                c.showPage(); y = h - 50
        c.save()
        pdf = bio.getvalue()
        resp = HttpResponse(pdf, content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename=plan_{plan.id}.pdf'
        return resp

# =========================================================
#                    PLAN DE PAGO (CU15)
# =========================================================
class PlanPagoGenerateView(BaseEmpresaViewSet):
    permission_classes = [IsAuthenticated, IsOfficialOrAdmin]

    def create(self, request, solicitud_id=None):
        overwrite = str(request.query_params.get('overwrite', 'false')).lower() == 'true'
        try:
            sol = SolicitudCredito.objects.get(pk=solicitud_id, is_deleted=False)
            plan = generar_plan(sol, request.user, overwrite=overwrite)
            return Response({"plan_id": str(plan.id)}, status=201)
        except SolicitudCredito.DoesNotExist:
            return Response({"detail": "Solicitud no encontrada"}, status=404)
        except ValueError as e:
            return Response({"detail": str(e)}, status=409)

class PlanPagoDetailView(BaseEmpresaViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request, solicitud_id=None):
        try:
            plan = (PlanPago.objects
                    .select_related('solicitud')
                    .prefetch_related('cuotas')
                    .get(solicitud_id=solicitud_id))
        except PlanPago.DoesNotExist:
            return Response({"detail": "Plan no encontrado"}, status=404)
        return Response(PlanPagoDTO(plan).data)

# (Ojo: NO hay PlanPagoExportView; la exportación la maneja export_plan de SolicitudCreditoViewSet)

# =========================================================
#                     REGISTRO PÚBLICO
# =========================================================
class PublicRegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        ser = PublicRegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return Response(ser.to_representation(user), status=201)

# =========================================================
#                       CU11: SIMULADOR
# =========================================================
class SimuladorAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        try:
            monto = float(request.data.get('monto'))
            plazo = int(request.data.get('plazo_meses'))
            tna = float(request.data.get('tasa_nominal_anual'))
            primera = request.data.get('primera_cuota_fecha')  # opcional ISO
        except Exception:
            return Response({'detail': 'Parámetros inválidos'}, status=400)
        plan, cuotas = simular_plan(monto, plazo, tna, primera)
        return Response({'resumen': plan, 'cuotas': cuotas})

# =========================================================
#                 CU18: PRODUCTOS / DOCUMENTOS
# =========================================================
class ProductoFinancieroViewSet(BaseEmpresaViewSet):
    queryset = ProductoFinanciero.objects.all()
    serializer_class = ProductoFinancieroSerializer
    #permission_classes = [IsAuthenticated]
    permission_classes = [AllowAny]

    @action(detail=True, methods=['get'], url_path='requisitos', permission_classes=[permissions.AllowAny])
    def requisitos(self, request, pk=None):
        tipo = request.query_params.get('tipo_trabajador')
        if tipo not in ['PUBLICO', 'PRIVADO', 'INDEPENDIENTE']:
            return Response({'detail': 'tipo_trabajador inválido'}, status=400)
        producto = self.get_object()
        reqs = (RequisitoProductoDocumento.objects
                .select_related('documento')
                .filter(producto=producto, tipo_trabajador=tipo))
        data = [{
            'documento': {
                'codigo': r.documento.codigo,
                'nombre': r.documento.nombre,
                'vigencia_dias': r.documento.vigencia_dias
            },
            'obligatorio': r.obligatorio
        } for r in reqs]
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def listar_nombres(self, request):
        """Devuelve una lista de productos para Select"""
        productos = self.get_queryset()
        data = [{"id": p.id, "nombre": p.nombre} for p in productos]
        return Response(data)

class DocumentoTipoViewSet(BaseEmpresaViewSet):
    queryset = DocumentoTipo.objects.all().order_by('nombre')
    serializer_class = DocumentoTipoSerializer
    permission_classes = [IsAuthenticated]

class RequisitoProductoDocumentoViewSet(BaseEmpresaViewSet):
    queryset = RequisitoProductoDocumento.objects.select_related('producto', 'documento').all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return RequisitoProductoDocumentoWriteSerializer
        return RequisitoProductoDocumentoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        prod = self.request.query_params.get('producto')
        tipo = self.request.query_params.get('tipo_trabajador')
        if prod:
            qs = qs.filter(producto_id=prod)
        if tipo in ['PUBLICO', 'PRIVADO', 'INDEPENDIENTE']:
            qs = qs.filter(tipo_trabajador=tipo)
        return qs

# =========================================================
#                 CU19: DOCUMENTOS ADJUNTOS
# =========================================================
class DocumentoAdjuntoViewSet(BaseEmpresaViewSet):
    queryset = DocumentoAdjunto.objects.select_related('documento_tipo', 'solicitud')
    serializer_class = DocumentoAdjuntoSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def create(self, request, *args, **kwargs):
        solicitud_id = request.data.get('solicitud')
        doc_tipo_id = request.data.get('documento_tipo')
        if not solicitud_id or not doc_tipo_id:
            return Response({'detail': 'solicitud y documento_tipo son requeridos'}, status=400)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        adj = serializer.save()

        doc_tipo = adj.documento_tipo
        is_valid, motivo = validar_vigencia(adj.fecha_emision, doc_tipo.vigencia_dias)
        adj.valido = is_valid
        adj.observacion = '' if is_valid else (motivo or '')
        adj.save()

        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(adj).data, status=201, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        adj = serializer.save()

        doc_tipo = adj.documento_tipo
        is_valid, motivo = validar_vigencia(adj.fecha_emision, doc_tipo.vigencia_dias)
        adj.valido = is_valid
        adj.observacion = '' if is_valid else (motivo or '')
        adj.save()
        return Response(self.get_serializer(adj).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        f = instance.archivo
        resp = super().destroy(request, *args, **kwargs)
        try:
            if f and f.storage.exists(f.name):
                f.storage.delete(f.name)
        except Exception:
            pass
        return resp
    
class ValidacionInformacionViewSet(BaseEmpresaViewSet):
    permission_classes = [IsAuthenticated, IsOfficialOrAdmin]
    
    @action(detail=False, methods=['post'], url_path='iniciar')
    def iniciar_validacion(self, request):
        """Inicia la validación automática de documentos usando IA"""
        try:
            print("🔍 Iniciando validación...")  # Debug
            serializer = ProcesarValidacionSerializer(data=request.data)
            
            if not serializer.is_valid():
                print(f"❌ Error en serializer: {serializer.errors}")
                return Response(serializer.errors, status=400)
            
            solicitud_id = serializer.validated_data['solicitud_id']
            usar_ia = serializer.validated_data['usar_ia']
            
            print(f"🔍 Buscando solicitud: {solicitud_id}")
            
            try:
                solicitud = SolicitudCredito.objects.get(id=solicitud_id)
                print(f"✅ Solicitud encontrada: {solicitud.id}")
            except SolicitudCredito.DoesNotExist:
                print("❌ Solicitud no encontrada")
                return Response({'error': 'Solicitud no encontrada'}, status=404)
            
            with transaction.atomic():
                if usar_ia:
                    print("🤖 Procesando con IA...")
                    resultado = self._procesar_con_ia(solicitud, request.user)
                else:
                    print("👨‍💼 Procesando validación manual...")
                    resultado = self._procesar_validacion_manual(solicitud, request.user)
                
                print(f"✅ Resultado: {resultado}")
                return Response(resultado, status=200)
                
        except Exception as e:
            print(f"💥 Error general en iniciar_validacion: {str(e)}")
            import traceback
            print(f"📋 Traceback: {traceback.format_exc()}")
            return Response({'error': f'Error interno del servidor: {str(e)}'}, status=500)
    
    def _procesar_con_ia(self, solicitud, usuario):
        """Versión mejorada que usa análisis detallado por tipo de documento"""
        try:
            from api.services.ia_validation_service import TesseractOCRService, CreditScoringService
            
            ocr_service = TesseractOCRService()
            scoring_service = CreditScoringService()
            
            documentos = DocumentoAdjunto.objects.filter(solicitud=solicitud)
            resultados_documentos = []
            scores_documentos = []
            detailed_analysis = {}
            
            print(f"📄 Procesando {documentos.count()} documentos con análisis mejorado...")
            
            for documento in documentos:
                try:
                    print(f"  🔍 Analizando: {documento.documento_tipo.nombre}")
                    
                    if not documento.archivo:
                        print("    ⚠️ Sin archivo, saltando...")
                        continue
                    
                    # Extraer texto
                    texto_extraido = ocr_service.extract_text_from_document(documento.archivo)
                    
                    # Análisis detallado por tipo de documento
                    doc_analysis = ocr_service.analyze_document_content(
                        documento.documento_tipo, 
                        texto_extraido, 
                        documento.archivo
                    )
                    
                    # Usar el score calculado del análisis detallado
                    score_confianza = doc_analysis['document_score']
                    estado = 'VALIDADO' if score_confianza > 0.6 else 'OBSERVADO'
                    
                    # Crear mensaje de observación basado en el análisis
                    observacion = "Documento válido" if estado == 'VALIDADO' else "Problemas detectados en documento"
                    if doc_analysis['validation_errors']:
                        observacion += f". Errores: {', '.join(doc_analysis['validation_errors'])}"
                    
                    # Guardar validación
                    validacion_doc = ValidacionDocumento.objects.create(
                        documento=documento,
                        estado=estado,
                        score_confianza=score_confianza,
                        observaciones=observacion,
                        campos_extraidos=doc_analysis,
                        validado_por=usuario
                    )
                    
                    resultados_documentos.append(validacion_doc)
                    scores_documentos.append(score_confianza)
                    detailed_analysis[str(documento.documento_tipo.id)] = doc_analysis
                    
                    print(f"    ✅ Análisis completado - Score: {score_confianza}, Estado: {estado}")
                    
                except Exception as e:
                    print(f"    ❌ Error procesando documento: {e}")
                    # En caso de error, score muy bajo
                    validacion_doc = ValidacionDocumento.objects.create(
                        documento=documento,
                        estado='OBSERVADO',
                        score_confianza=0.1,
                        observaciones=f"Error en procesamiento: {str(e)}",
                        validado_por=usuario
                    )
                    resultados_documentos.append(validacion_doc)
                    scores_documentos.append(0.1)
            
            # Calcular score promedio de documentos
            score_promedio = sum(scores_documentos) / len(scores_documentos) if scores_documentos else 0.1
            
            # Preparar datos para scoring crediticio
            solicitud_data = self._preparar_datos_solicitud(solicitud)
            documentos_data = {
                'score_promedio': score_promedio,
                'total_documentos': len(documentos),
                'documentos_validados': len([d for d in resultados_documentos if d.estado == 'VALIDADO']),
                'detailed_analysis': detailed_analysis
            }
            
            print("🧮 Calculando scoring crediticio con análisis mejorado...")
            analisis_riesgo = scoring_service.analyze_credit_risk(solicitud_data, documentos_data)
            
            # Guardar resultado (asegúrate de que el modelo tenga los campos necesarios)
            resultado_data = {
                'solicitud': solicitud,
                'score_global': analisis_riesgo['score_global'],
                'recomendacion': analisis_riesgo['recomendacion'],
                'factores_riesgo': analisis_riesgo['factores_riesgo'],
                'factores_positivos': analisis_riesgo.get('factores_positivos', []),
                'confianza_modelo': analisis_riesgo['confianza_modelo'],
            }
            
            # Solo agregar detalles_analisis si el modelo lo soporta
            if hasattr(ResultadoValidacionIA, 'detalles_analisis'):
                resultado_data['detalles_analisis'] = analisis_riesgo.get('detalles_analisis', {})
            
            resultado_ia = ResultadoValidacionIA.objects.create(**resultado_data)
            
            # Actualizar solicitud
            solicitud.estado = 'EVALUADA'
            solicitud.score_riesgo = analisis_riesgo['score_global'] * 100
            solicitud.save()
            
            return {
                'solicitud_id': str(solicitud.id),
                'estado': 'VALIDACION_COMPLETADA',
                'score_global': analisis_riesgo['score_global'],
                'recomendacion': analisis_riesgo['recomendacion'],
                'documentos_procesados': len(resultados_documentos),
                'factores_riesgo': analisis_riesgo['factores_riesgo'],
                'factores_positivos': analisis_riesgo.get('factores_positivos', []),
                'score_promedio_documentos': score_promedio,
                'resultado_ia_id': resultado_ia.id
            }
            
        except Exception as e:
            print(f"💥 Error en _procesar_con_ia mejorado: {str(e)}")
            import traceback
            print(f"📋 Traceback: {traceback.format_exc()}")
            raise
    
    def _procesar_validacion_manual(self, solicitud, usuario):
        """Procesa validación manual"""
        documentos = DocumentoAdjunto.objects.filter(solicitud=solicitud)
        
        for documento in documentos:
            # Validación manual básica - en una implementación real esto vendría del frontend
            ValidacionDocumento.objects.create(
                documento=documento,
                estado='VALIDADO',
                score_confianza=0.9,
                observaciones='Validado manualmente',
                validado_por=usuario
            )
        
        # Actualizar estado de la solicitud
        solicitud.estado = 'EVALUADA'
        solicitud.save()
        
        return {
            'solicitud_id': str(solicitud.id),
            'estado': 'VALIDACION_MANUAL_COMPLETADA',
            'documentos_procesados': len(documentos)
        }
    
    def _preparar_datos_solicitud(self, solicitud):
        """Prepara datos de la solicitud para el análisis"""
        cliente = solicitud.cliente
        edad = None
        if cliente.fecha_nacimiento:
            from datetime import date
            hoy = date.today()
            edad = hoy.year - cliente.fecha_nacimiento.year - (
                (hoy.month, hoy.day) < (cliente.fecha_nacimiento.month, cliente.fecha_nacimiento.day)
            )
        
        return {
            'monto': float(solicitud.monto),
            'plazo_meses': solicitud.plazo_meses,
            'tipo_credito': solicitud.tipo_credito,
            'tipo_trabajador': solicitud.tipo_trabajador,
            'ingresos_mensuales': float(cliente.ingresos_mensuales) if cliente.ingresos_mensuales else 0,
            'edad': edad or 35,
            'producto': solicitud.producto.nombre if solicitud.producto else 'N/A'
        }
    
    @action(detail=False, methods=['get'], url_path='resultado/(?P<solicitud_id>[^/.]+)')
    def obtener_resultado(self, request, solicitud_id=None):
        """Obtiene el resultado de la validación de una solicitud"""
        try:
            print(f"🔍 Obteniendo resultado para: {solicitud_id}")
            solicitud = SolicitudCredito.objects.get(id=solicitud_id)
            
            validaciones_docs = ValidacionDocumento.objects.filter(
                documento__solicitud=solicitud
            ).select_related('documento', 'documento__documento_tipo', 'validado_por')
            
            resultado_ia = ResultadoValidacionIA.objects.filter(solicitud=solicitud).first()
            
            data = {
                'solicitud': {
                    'id': str(solicitud.id),
                    'estado': solicitud.estado,
                    'cliente': f"{solicitud.cliente.user.first_name} {solicitud.cliente.user.last_name}",
                    'monto': float(solicitud.monto),
                    'score_riesgo': float(solicitud.score_riesgo) if solicitud.score_riesgo else None
                },
                'documentos': ValidacionDocumentoSerializer(validaciones_docs, many=True).data,
                'analisis_ia': ResultadoValidacionIASerializer(resultado_ia).data if resultado_ia else None
            }
            
            return Response(data, status=200)
            
        except SolicitudCredito.DoesNotExist:
            return Response({'error': 'Solicitud no encontrada'}, status=404)
        except Exception as e:
            print(f"💥 Error en obtener_resultado: {str(e)}")
            return Response({'error': str(e)}, status=500)
    
    @action(detail=False, methods=['post'], url_path='manual')
    def validar_manual(self, request):
        """Endpoint para validación manual de documentos individuales"""
        try:
            print("🔍 Iniciando validación manual...")
            serializer = DocumentoValidacionSerializer(data=request.data)
            
            if not serializer.is_valid():
                print(f"❌ Error en serializer: {serializer.errors}")
                return Response(serializer.errors, status=400)
            
            documento = DocumentoAdjunto.objects.get(id=serializer.validated_data['documento_id'])
            
            validacion, created = ValidacionDocumento.objects.update_or_create(
                documento=documento,
                defaults={
                    'estado': serializer.validated_data['estado'],
                    'observaciones': serializer.validated_data.get('observaciones', ''),
                    'score_confianza': serializer.validated_data.get('score_confianza', 0.9),
                    'validado_por': request.user
                }
            )
            
            return Response(ValidacionDocumentoSerializer(validacion).data, status=200)
            
        except DocumentoAdjunto.DoesNotExist:
            return Response({'error': 'Documento no encontrado'}, status=404)
        except Exception as e:
            print(f"💥 Error en validar_manual: {str(e)}")
            return Response({'error': str(e)}, status=500)
class PagoViewSet(BaseEmpresaViewSet):
    # TEMPORAL: Quita la autenticación para testing
    #permission_classes = []  # Esto permite acceso sin autenticación
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='cuotas-pendientes')
    def cuotas_pendientes(self, request):
        """Obtener cuotas pendientes del cliente autenticado"""
        try:
            # TEMPORAL: Para testing, usa el primer cliente
            cliente = Cliente.objects.get(user=request.user)
            
            if not cliente:
                return Response(
                    {'error': 'No hay clientes en la base de datos'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            cuotas = PlanCuota.objects.filter(
                plan__solicitud__cliente=cliente,
                estado='PENDIENTE'
            ).select_related(
                'plan', 
                'plan__solicitud',
                'plan__solicitud__producto'
            ).order_by('fecha_vencimiento')
            
            print(f"📊 Encontradas {cuotas.count()} cuotas para cliente {cliente.id}")
            
            serializer = CuotaPendienteSerializer(cuotas, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            print(f"❌ Error en cuotas_pendientes: {str(e)}")
            return Response(
                {'error': f'Error interno: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    
    @action(detail=False, methods=['post'], url_path='crear-payment-intent')
    @transaction.atomic
    def crear_payment_intent(self, request):
        """Crear un PaymentIntent de Stripe para una cuota"""
        from .services.stripe_service import StripeService
        
        serializer = StripePaymentIntentSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = serializer.validated_data
            cliente = Cliente.objects.get(user=request.user)
            
            # Obtener cuota
            cuota = PlanCuota.objects.get(
                id=data['cuota_id'],
                plan__solicitud__cliente=cliente,
                estado='PENDIENTE'
            )
            
            monto_cuota = float(cuota.cuota)
            
            # Crear transacción pendiente
            transaccion = TransaccionPago.objects.create(
                cuota=cuota,
                monto=monto_cuota,
                estado='PENDIENTE',
                datos_pago={
                    'email_notificacion': data.get('email_notificacion', ''),
                    'metodo': 'stripe_card'
                }
            )
            
            # Crear PaymentIntent en Stripe
            stripe_service = StripeService()
            descripcion = f"Pago cuota {cuota.nro_cuota} - Crédito {cuota.plan.solicitud.id}"
            metadatos = {
                'cuota_id': str(cuota.id),
                'transaccion_id': str(transaccion.id),
                'solicitud_id': str(cuota.plan.solicitud.id),
                'cliente_id': str(cliente.id)
            }
            
            resultado = stripe_service.crear_payment_intent(
                monto=monto_cuota,
                moneda='BOB',  # Bolivianos
                descripcion=descripcion,
                metadatos=metadatos
            )
            
            if resultado['estado'] == 'requiere_confirmacion':
                # Actualizar transacción con datos de Stripe
                transaccion.stripe_payment_intent_id = resultado['id_intento']
                transaccion.stripe_client_secret = resultado['client_secret']
                transaccion.save()
                
                return Response({
                    'estado': 'requiere_confirmacion',
                    'client_secret': resultado['client_secret'],
                    'payment_intent_id': resultado['id_intento'],
                    'monto': resultado['monto'],
                    'moneda': resultado['moneda'],
                    'transaccion_id': str(transaccion.id),
                    'mensaje': 'PaymentIntent creado exitosamente'
                })
            else:
                transaccion.estado = 'FALLIDO'
                transaccion.datos_pago['error'] = resultado.get('mensaje', 'Error al crear pago')
                transaccion.save()
                
                return Response({
                    'estado': 'error',
                    'mensaje': resultado.get('mensaje', 'Error al crear el pago')
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Cliente.DoesNotExist:
            return Response(
                {'error': 'Usuario no tiene perfil de cliente'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        except PlanCuota.DoesNotExist:
            return Response(
                {'error': 'Cuota no encontrada o ya pagada'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error interno del servidor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='confirmar-pago')
    @transaction.atomic
    def confirmar_pago(self, request):
        """Confirmar que un pago de Stripe fue exitoso"""
        from .services.stripe_service import StripeService
        
        serializer = ConfirmarPagoSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = serializer.validated_data
            cliente = Cliente.objects.get(user=request.user)
            
            # Obtener transacción
            transaccion = TransaccionPago.objects.get(
                stripe_payment_intent_id=data['payment_intent_id'],
                cuota__plan__solicitud__cliente=cliente
            )
            
            # Verificar el pago en Stripe
            stripe_service = StripeService()
            resultado = stripe_service.confirmar_payment_intent(data['payment_intent_id'])
            
            if resultado['estado'] == 'aprobado':
                # Pago exitoso
                transaccion.estado = 'EXITOSO'
                transaccion.codigo_autorizacion = resultado['codigo_autorizacion']
                transaccion.datos_pago.update(resultado.get('datos_adicionales', {}))
                
                # Obtener información de la tarjeta
                tarjeta_info = stripe_service.obtener_metodos_pago(data['payment_intent_id'])
                if tarjeta_info:
                    transaccion.datos_pago['tarjeta'] = tarjeta_info.get('tarjeta', {})
                
                transaccion.save()
                
                # Actualizar cuota
                cuota = transaccion.cuota
                cuota.estado = 'PAGADA'
                cuota.fecha_pago = timezone.now()
                cuota.save()
                
                # Registrar en bitácora
                #Bitacora.objects.create(
                #    usuario=request.user,
                #    tipo_accion="PAGO_CUOTA_EXITOSO",
                #    ip=request.META.get('REMOTE_ADDR'),
                #    created_at=timezone.now()
                #)
                
                # Enviar comprobante
                self._enviar_comprobante(cliente, transaccion)
                
                return Response({
                    'estado': 'exitoso',
                    'mensaje': 'Pago confirmado exitosamente',
                    'codigo_autorizacion': transaccion.codigo_autorizacion,
                    'referencia': resultado['referencia'],
                    'fecha_pago': cuota.fecha_pago,
                    'transaccion_id': str(transaccion.id),
                    'tarjeta_info': tarjeta_info
                })
            else:
                return Response({
                    'estado': 'pendiente',
                    'mensaje': resultado.get('mensaje', 'Pago aún no confirmado')
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except TransaccionPago.DoesNotExist:
            return Response(
                {'error': 'Transacción no encontrada'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error interno del servidor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='historial')
    def historial_pagos(self, request):
        """Obtener historial de pagos del cliente"""
        try:
            cliente = Cliente.objects.get(user=request.user)
            
            transacciones = TransaccionPago.objects.filter(
                cuota__plan__solicitud__cliente=cliente
            ).select_related('cuota', 'cuota__plan', 'cuota__plan__solicitud').order_by('-fecha_transaccion')
            
            page = self.paginate_queryset(transacciones)
            if page is not None:
                serializer = TransaccionPagoSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = TransaccionPagoSerializer(transacciones, many=True)
            return Response(serializer.data)
            
        except Cliente.DoesNotExist:
            return Response(
                {'error': 'Usuario no tiene perfil de cliente'}, 
                status=status.HTTP_403_FORBIDDEN
            )
    
    def _enviar_comprobante(self, cliente, transaccion):
        """Enviar comprobante de pago por email"""
        # Implementación básica - expandir según necesidades
        email_destino = transaccion.datos_pago.get('email_notificacion') or cliente.user.email
        
        # Aquí iría la lógica para enviar el email con el comprobante
        # Por ahora solo registro en bitácora
        #Bitacora.objects.create(
        #    usuario=cliente.user,
        #    tipo_accion="COMPROBANTE_ENVIADO",
        #    ip=None,
        #    created_at=timezone.now()
        #)

class ReporteViewSet(BaseEmpresaViewSet):
    queryset = Reporte.objects.all()
    serializer_class = ReporteSerializer
    permission_classes = []  # ⚡ Público temporal

    # 🔥 Filtro por empresa (si viene en el request o autenticación)
    def get_queryset(self):
        qs = super().get_queryset()
        empresa = getattr(self.request, "empresa_actual", None)
        if empresa:
            return qs.filter(empresa=empresa)
        return qs  # Temporal: ver todo si empresa no definida

    def perform_create(self, serializer):
        empresa = getattr(self.request, "empresa_actual", None)
        serializer.save(empresa=empresa)

    # -------------------------------------------------------------
    # 🔥 GENERAR REPORTE
    # -------------------------------------------------------------
    @action(detail=False, methods=['post'])
    def generar_reporte(self, request):
        serializer = FiltroReporteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        filtros = serializer.validated_data
        tipo_reporte = filtros['tipo_reporte']
        formato = filtros['formato']

        # Convertir fechas a cadena para JSON
        def convertir_fechas_a_str(f):
            nuevo = f.copy()
            for campo in ['fecha_inicio', 'fecha_fin']:
                if isinstance(nuevo.get(campo), date):
                    nuevo[campo] = nuevo[campo].isoformat()
            return nuevo

        filtros_serializables = convertir_fechas_a_str(filtros)

        try:
            with transaction.atomic():
                map_funciones = {
                    'creditos': ReporteGenerator.generar_reporte_creditos,
                    'clientes': ReporteGenerator.generar_reporte_clientes,
                    'pagos': ReporteGenerator.generar_reporte_pagos,
                    'riesgo': ReporteGenerator.generar_reporte_riesgo,
                }

                if tipo_reporte not in map_funciones:
                    return Response({'error': 'Tipo de reporte no válido'}, status=400)

                generar = map_funciones[tipo_reporte]
                buffer, filename, content_type = generar(filtros, formato)

                empresa = getattr(request, "empresa_actual", None)
                reporte = Reporte.objects.create(
                    empresa=empresa,
                    nombre=f"Reporte_{tipo_reporte}_{filtros.get('fecha_inicio') or ''}",
                    tipo_reporte=tipo_reporte,
                    formato=formato,
                    filtros=filtros_serializables,
                    generado_por=None
                )

                if formato == 'texto':
                    reporte.contenido_texto = buffer.getvalue().decode('utf-8')
                    reporte.save()

                response = HttpResponse(buffer.getvalue(), content_type=content_type)
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response

        except Exception as e:
            return Response({'error': f"ERROR DETALLADO GENERANDO REPORTE: {str(e)}"}, status=500)

    # -------------------------------------------------------------
    # 🔥 PROCESAR VOZ
    # -------------------------------------------------------------
    @action(detail=False, methods=['post'])
    def procesar_comando_voz(self, request):
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response({'error': 'No se envió ningún archivo de audio'}, status=400)

        try:
            # Instancia de tu nuevo procesador
            processor = VoiceCommandProcessor()
            resultado = processor.process_voice_command(audio_file)
            if not resultado['success']:
                return Response({'error': resultado.get('error', 'Error desconocido')}, status=400)

            filtros = resultado['filters']
            tipo_reporte = filtros['tipo_reporte']
            formato = filtros['formato']

            map_funciones = {
                'creditos': ReporteGenerator.generar_reporte_creditos,
                'clientes': ReporteGenerator.generar_reporte_clientes,
                'pagos': ReporteGenerator.generar_reporte_pagos,
                'riesgo': ReporteGenerator.generar_reporte_riesgo,
            }

            if tipo_reporte not in map_funciones:
                return Response({'error': 'Tipo de reporte no válido'}, status=400)

            generar = map_funciones[tipo_reporte]
            buffer, filename, content_type = generar(filtros, formato)

            # Guardar registro del reporte
            empresa = getattr(request, "empresa_actual", None)
            reporte = Reporte.objects.create(
                empresa=empresa,
                nombre=f"Reporte_{tipo_reporte}_{filtros.get('fecha_inicio') or ''}",
                tipo_reporte=tipo_reporte,
                formato=formato,
                filtros=filtros,
                generado_por=None
            )

            if formato == 'texto':
                reporte.contenido_texto = buffer.getvalue().decode('utf-8')
                reporte.save()

            response = HttpResponse(buffer.getvalue(), content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['x-response-data'] = json.dumps({
                'transcribed_text': resultado['transcribed_text'],
                'filters': filtros,
                'filename': filename,
                'reporte_id': reporte.id
            })
            return response

        except Exception as e:
            return Response({'error': f"ERROR PROCESANDO VOZ: {str(e)}"}, status=500)