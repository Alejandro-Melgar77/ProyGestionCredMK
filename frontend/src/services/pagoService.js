// services/pagoService.js - DEBE tener esto:
import api from '../config/axios';

export const pagoService = {
  async getCuotasPendientes() {
    console.log('📋 Obteniendo cuotas pendientes...');
    try {
      // ✅ ESTA LÍNEA DEBE DECIR /api/pagos/...
      const response = await api.get('/api/pagos/cuotas-pendientes/');
      console.log('✅ Cuotas obtenidas:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Error al obtener cuotas:', error.response?.data);
      throw error;
    }
  },

  async crearPaymentIntent(data) {
    console.log('📤 Enviando datos al backend:', data);
    try {
      // ✅ ESTA LÍNEA DEBE DECIR /api/pagos/...
      const response = await api.post('/api/pagos/crear-payment-intent/', data);
      console.log('📥 Respuesta del backend:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Error en crearPaymentIntent:', error.response?.data);
      throw error;
    }
  },

  async confirmarPago(data) {
    console.log('✅ Confirmando pago:', data);
    try {
      // ✅ ESTA LÍNEA DEBE DECIR /api/pagos/...
      const response = await api.post('/api/pagos/confirmar-pago/', data);
      console.log('📦 Pago confirmado:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Error al confirmar pago:', error.response?.data);
      throw error;
    }
  },

  async getHistorialPagos(params = {}) {
    try {
      // ✅ ESTA LÍNEA DEBE DECIR /api/pagos/...
      const response = await api.get('/api/pagos/historial/', { params });
      return response;
    } catch (error) {
      console.error('❌ Error al obtener historial:', error.response?.data);
      throw error;
    }
  }
};