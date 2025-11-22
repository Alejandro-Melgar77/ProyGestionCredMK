import os
from django.core.wsgi import get_wsgi_application

# Ajusta según tu estructura
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gestion_credi.settings')

# Agregar el path del backend al sys.path
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

application = get_wsgi_application()