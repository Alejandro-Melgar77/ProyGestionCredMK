// src/services/plan.js
import api from '../config/axios';

/** GET /api/solicitudes/:id/plan-pagos/ */
export async function getPlan(solicitudId) {
  const { data } = await api.get(`/api/solicitudes/${solicitudId}/plan-pagos/`);
  return data;
}

/** POST /api/solicitudes/:id/plan-pagos/generar/?overwrite=true|false */
export async function generarPlan(solicitudId, { overwrite = false } = {}) {
  const qs = overwrite ? '?overwrite=true' : '';
  const { data } = await api.post(`/api/solicitudes/${solicitudId}/plan-pagos/generar/${qs}`);
  return data; // { plan_id: "..." }
}

/** Construye URL absoluta (backend exige slash final en /export/) */
export function getPlanExportUrl(solicitudId, format = 'pdf') {
  const base = api.defaults.baseURL || (import.meta.env?.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000');
  return `${base}/api/solicitudes/${solicitudId}/plan-pagos/export/?format=${format}`;
}

/** Descargar plan (PDF/XLSX) usando axios con token */
export async function downloadPlan(solicitudId, format = 'pdf') {
  // ✅ Usa URL absoluta y correcta
  const url = getPlanExportUrl(solicitudId, format);

  const response = await api.get(url, {
    responseType: 'blob', // para archivos binarios
  });

  // Intenta tomar el nombre desde Content-Disposition
  const dispo = response.headers['content-disposition'] || '';
  let filename = `plan_${solicitudId}.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
  const match = dispo.match(/filename="?([^"]+)"?/i);
  if (match && match[1]) filename = match[1];

  const blob = new Blob([response.data], {
    type: format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf',
  });

  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // liberar URL
  window.URL.revokeObjectURL(link.href);
}
