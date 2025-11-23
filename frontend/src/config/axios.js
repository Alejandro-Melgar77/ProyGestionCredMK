// src/config/axios.js
import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://proygestioncredmk.onrender.com"
    : "http://127.0.0.1:8000");

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL
});

// REQUEST interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE interceptor
api.interceptors.response.use(
  (response) => {
    // Manejo de paginación DRF
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
          // Ya NO duplicamos /api
          const res = await axios.post(`${API_BASE}/api/auth/refresh/`, {
            refresh,
          });

          const newAccess = res.data.access;

          localStorage.setItem("access_token", newAccess);

          api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;

          return api(originalRequest);
        } catch (err) {
          clearTokenPair();
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
