import os
from django.core.wsgi import get_wsgi_application

# Ajusta la ruta a tu settings.py
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.gestion_credi.settings')

application = get_wsgi_application()