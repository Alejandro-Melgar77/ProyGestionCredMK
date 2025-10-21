from rest_framework import viewsets, filters
from rest_framework.permissions import IsAdminUser
from .models import LogEntry
from .serializers import LogEntrySerializer

class LogEntryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Solo lectura
    """
    queryset = LogEntry.objects.all().select_related("usuario")
    serializer_class = LogEntrySerializer
    permission_classes = [IsAdminUser]  #######
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["usuario__username", "accion", "ruta", "ip"]
    ordering_fields = ["creado_en", "accion", "usuario"]
    ordering = ["-creado_en"]
