// src/services/productos.js
import api from "../config/axios";

// Lista de productos (CU18 lectura)
export async function getProductos() {
  const { data } = await api.get("/api/productos/");
  return data;
}

// Requisitos por producto + tipo trabajador (para previsualizar checklist)
export async function getRequisitos(productoId, tipoTrabajador) {
  const { data } = await api.get(`/api/productos/${productoId}/requisitos/`, {
    params: { tipo_trabajador: tipoTrabajador },
  });
  // data: [{ documento:{codigo,nombre,vigencia_dias}, obligatorio }, ...]
  return data;
}
