from django.contrib import admin

# Register your models here.
from .models import ProductoFinanciero, DocumentoTipo, RequisitoProductoDocumento, DocumentoAdjunto, Empresa
admin.site.register(ProductoFinanciero)
admin.site.register(DocumentoTipo)
admin.site.register(RequisitoProductoDocumento)
admin.site.register(DocumentoAdjunto)

@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'ruc', 'telefono']
