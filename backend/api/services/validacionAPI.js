
const API_BASE = '/api';

export const validacionAPI = {
  iniciar: (data) =>
    fetch(`${API_BASE}/validacion/iniciar/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).then(res => {
      if (!res.ok) throw new Error('Error en la validación');
      return res.json();
    }),

  obtenerResultado: (solicitudId) =>
    fetch(`${API_BASE}/validacion/resultado/${solicitudId}/`)
      .then(res => {
        if (!res.ok) throw new Error('Error obteniendo resultado');
        return res.json();
      }),

  validarManual: (data) =>
    fetch(`${API_BASE}/validacion/manual/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).then(res => {
      if (!res.ok) throw new Error('Error en validación manual');
      return res.json();
    }),
};