# Usa la imagen base oficial de Python
FROM python:3.11-slim-buster

# Establece variables de entorno
# PYTHONDONTWRITEBYTECODE=1 previene que Python escriba archivos .pyc en el disco
# PYTHONUNBUFFERED=1 previene el buffer de stdout y stderr
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia los archivos de requerimientos e instala las dependencias
# Se recomienda instalar primero para aprovechar la caché de Docker
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copia el código fuente del proyecto
COPY . .

# Expone el puerto por defecto de Django
EXPOSE 8000

# Comando para iniciar el servidor de Django (ajusta según tu necesidad, 
# se recomienda usar Gunicorn o Waitress para producción)
# Aquí se usa el servidor de desarrollo para fines de ejemplo/test
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]