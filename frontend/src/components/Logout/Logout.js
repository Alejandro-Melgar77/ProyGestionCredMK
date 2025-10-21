// src/components/Logout/Logout.js
import React from 'react';
import axios from '../../config/axios';
import Swal from 'sweetalert2';  // ✅ Librería para alertas elegantes
import './Logout.css';

const Logout = () => {
  const handleLogout = async () => {
    // ✅ Mostramos confirmación visual antes de cerrar sesión
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Tu sesión actual se cerrará y deberás volver a iniciar sesión.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar'
    });

    // Si el usuario cancela, no hacer nada
    if (!result.isConfirmed) return;

    try {
      // Opcional: Notificar al backend para invalidar el token
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/auth/logout/`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // ✅ Limpiar tokens del almacenamiento local
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      // ✅ Eliminar token de las cabeceras globales
      delete axios.defaults.headers.common['Authorization'];

      // ✅ Mostrar notificación visual de éxito
      await Swal.fire({
        title: 'Sesión cerrada',
        text: 'Has cerrado sesión correctamente.',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        timer: 1500,
        showConfirmButton: false
      });

      // ✅ Redirigir al login
      window.location.href = '/login';
    }
  };

  return (
    <div className="logout-container">
      <button className="logout-button" onClick={handleLogout}>
        Cerrar Sesión
      </button>
    </div>
  );
};

export default Logout;
