from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, AllowAny, BasePermission
from rest_framework.response import Response
from django.http import HttpResponse
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO
from datetime import datetime
from django.utils.timezone import make_aware

from .models import LogEntry
from .serializers import LogEntrySerializer


# --- Permiso personalizado ---
class IsSuperuserOrSuperAdminName(BasePermission):
    """
    Permite acceso al superusuario
    """
    def has_permission(self, request, view):
        return bool(
            request.user and (
                request.user.is_superuser or request.user.username.lower() == "superadmin"
            )
        )


class LogEntryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Solo lectura de registros de bitácora.
    Permite filtrar, ordenar y exportar en PDF.
    """
    queryset = LogEntry.objects.all().select_related("usuario").order_by("-creado_en")
    serializer_class = LogEntrySerializer
    permission_classes = [IsSuperuserOrSuperAdminName]  # personalizado
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["usuario__username", "accion", "ruta", "ip"]
    ordering_fields = ["creado_en", "accion", "usuario"]
    ordering = ["-creado_en"]

    @action(
        detail=False,
        methods=["get"],
        url_path="reporte",
        permission_classes=[AllowAny],  # libre para exportar desde frontend
    )
    def exportar_bitacora_pdf(self, request):
        """
        Exporta los registros de bitácora a un PDF.
        Soporta filtros por fecha: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
        """
        # --- 1) Procesar parámetros GET ---
        desde = request.query_params.get("desde")
        hasta = request.query_params.get("hasta")

        queryset = self.get_queryset()

        if desde or hasta:
            try:
                if desde:
                    fecha_desde = make_aware(datetime.strptime(desde, "%Y-%m-%d"))
                else:
                    fecha_desde = None
                if hasta:
                    fecha_hasta = make_aware(
                        datetime.strptime(hasta, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
                    )
                else:
                    fecha_hasta = None

                if fecha_desde and fecha_hasta:
                    queryset = queryset.filter(creado_en__range=(fecha_desde, fecha_hasta))
                elif fecha_desde:
                    queryset = queryset.filter(creado_en__gte=fecha_desde)
                elif fecha_hasta:
                    queryset = queryset.filter(creado_en__lte=fecha_hasta)
            except Exception as e:
                return Response({"error": f"Formato de fecha inválido: {e}"}, status=400)

        logs = queryset.order_by("-creado_en")

        # --- 2) Crear PDF ---
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
        elements = []

        styles = getSampleStyleSheet()
        titulo = "Registro de Bitácora del Sistema"
        if desde or hasta:
            rango = f" (Filtrado"
            if desde:
                rango += f" desde {desde}"
            if hasta:
                rango += f" hasta {hasta}"
            rango += ")"
            titulo += rango

        elements.append(Paragraph(titulo, styles["Title"]))
        elements.append(Spacer(1, 12))

        data = [["#", "Usuario", "Acción", "Ruta", "Método", "IP", "Estado", "Fecha"]]
        for i, log in enumerate(logs, start=1):
            data.append([
                str(i),
                getattr(log.usuario, "username", "Sistema"),
                log.accion,
                log.ruta,
                log.metodo,
                log.ip or "-",
                str(log.estado_http or "-"),
                log.creado_en.strftime("%d/%m/%Y %H:%M:%S"),
            ])

        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003366")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
            ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ]))

        elements.append(table)
        doc.build(elements)

        pdf = buffer.getvalue()
        buffer.close()

        response = HttpResponse(content_type="application/pdf")
        nombre_archivo = f"bitacora_reporte_{desde or 'inicio'}_{hasta or 'hoy'}.pdf"
        response["Content-Disposition"] = f'attachment; filename="{nombre_archivo}"'
        response.write(pdf)
        return response
