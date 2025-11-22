// src/config/axios.js
import axios from "axios";

// Base de la API (detecta entorno)
const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://proygestioncredmk.onrender.com"
    : "http://127.0.0.1:8000");

// Crear instancia
const api = axios.create({
  baseURL: API_BASE,
});

// Interceptor REQUEST
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor RESPONSE
api.interceptors.response.use(
  (response) => {
    if (response.data && "results" in response.data) {
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
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh_token");
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
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export function setTokenPair({ access, refresh }) {
  if (access) localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
}

export function clearTokenPair() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export default api;
