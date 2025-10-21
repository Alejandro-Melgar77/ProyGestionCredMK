// src/config/axios.js
import axios from "axios";

// Base de la API (no incluir "/api" aquí)
const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000";

// Crear instancia
const api = axios.create({
  baseURL: API_BASE,
});

// ============================================================
// 🔹 Interceptor de REQUEST → Agrega token a cada solicitud
// ============================================================
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("access_token") || localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// 🔹 Interceptor de RESPONSE → Manejo global y refresh token
// ============================================================
api.interceptors.response.use(
  (response) => {
    // ✅ 1) Desempaqueta automáticamente los resultados paginados del backend
    if (
      response.data &&
      typeof response.data === "object" &&
      "results" in response.data &&
      Array.isArray(response.data.results)
    ) {
      // Devuelve directamente el array, pero conserva info de paginación
      return {
        ...response,
        data: response.data.results,
        pagination: {
          count: response.data.count,
          next: response.data.next,
          previous: response.data.previous,
        },
      };
    }

    return response;
  },

  // ✅ 2) Manejo de errores y refresco automático del token
  async (error) => {
    const originalRequest = error.config;

    // Evita bucle infinito de reintento
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh =
        localStorage.getItem("refresh_token") ||
        localStorage.getItem("refresh");

      if (refresh) {
        try {
          const res = await axios.post(`${API_BASE}/api/auth/refresh/`, {
            refresh,
          });
          const newAccess = res.data.access;
          localStorage.setItem("access_token", newAccess);
          api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch (err) {
          console.warn("⚠️ Token expirado: redirigiendo al login.");
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }

    // ============================================================
    // 🔹 Manejo global de errores HTTP
    // ============================================================
    if (error.response) {
      const status = error.response.status;

      switch (status) {
        case 400:
          console.warn(
            "Error 400:",
            error.response.data.detail || "Solicitud incorrecta."
          );
          alert(
            error.response.data.detail ||
              "La solicitud contiene errores o datos inválidos."
          );
          break;

        case 401:
          console.warn("⛔ No autorizado: redirigiendo al login.");
          alert(
            "Sesión expirada o no autorizada. Por favor, inicia sesión nuevamente."
          );
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
          break;

        case 403:
          console.warn("🚫 Acceso denegado: sin permisos suficientes.");
          alert("No tenés permisos para realizar esta acción.");
          break;

        case 404:
          console.warn("📭 Recurso no encontrado:", error.config?.url);
          break;

        case 500:
          console.error("💥 Error interno del servidor:", error.response);
          alert("Error interno del servidor. Por favor, intenta más tarde.");
          break;

        default:
          console.warn("❓ Error desconocido:", error.response);
          alert("Ocurrió un error inesperado. Intente nuevamente.");
      }
    } else if (error.request) {
      // Error de red o timeout
      console.error("🌐 Error de conexión con el servidor:", error.message);
      alert("No se pudo conectar con el servidor. Verifique su conexión.");
    }

    return Promise.reject(error);
  }
);

// ============================================================
// 🔹 Utilidades de manejo de tokens
// ============================================================
export function setTokenPair({ access, refresh }) {
  if (access) localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
}

export function clearTokenPair() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export default api;
