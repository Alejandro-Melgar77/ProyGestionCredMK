# --- Etapa 1: Construcción (Build Stage) ---
# Usa una imagen de Node.js como base para la construcción
FROM node:19-alpine AS builder

# Establece el directorio de trabajo
WORKDIR /app

# Copia package.json y package-lock.json e instala dependencias
COPY package.json ./
COPY package-lock.json ./
# O usa COPY yarn.lock si usas yarn
RUN npm install 

# Copia el resto del código fuente del frontend
COPY . .

# Construye la aplicación React para producción
RUN npm run build

# --- Etapa 2: Servido (Serve Stage) ---
# Usa una imagen oficial ligera de Nginx para servir los archivos estáticos
FROM nginx:alpine

# Copia la configuración personalizada de Nginx (si la tienes, si no, omite esta línea)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Elimina los archivos de configuración por defecto (si estás usando un conf personalizado)
# RUN rm /etc/nginx/conf.d/default.conf

# Copia los archivos estáticos generados desde la etapa de construcción a la ubicación de Nginx
# Asume que el comando 'npm run build' genera archivos en una carpeta 'build'
COPY --from=builder /app/build /usr/share/nginx/html

# Expone el puerto 80, que es el puerto por defecto de Nginx
EXPOSE 80

# El comando por defecto de Nginx ya está configurado para ejecutarse.
CMD ["nginx", "-g", "daemon off;"]