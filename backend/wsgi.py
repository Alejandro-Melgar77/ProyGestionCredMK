import os
from django.core.wsgi import get_wsgi_application

# Ajusta al path de tu settings.py
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gestion_credi.settings')

application = get_wsgi_application()