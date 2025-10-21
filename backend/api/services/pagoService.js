// services/pagoService.js
import api from './api';

export const pagoService = {
  getCuotasPendientes: () => {
    return api.get('/pagos/cuotas-pendientes/');
  },

  crearPaymentIntent: (datos) => {
    return api.post('/pagos/crear-payment-intent/', datos);
  },

  confirmarPago: (datos) => {
    return api.post('/pagos/confirmar-pago/', datos);
  },

  getHistorialPagos: (params = {}) => {
    return api.get('/pagos/historial/', { params });
  }
};