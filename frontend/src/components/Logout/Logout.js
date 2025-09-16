// src/components/Logout/Logout.js
import React from 'react';
import axios from '../../config/axios';
import './Logout.css';

const Logout = ({ onLogoutSuccess }) => {
  const handleLogout = async () => {
    try {
      // Opcional: Hacer una llamada al backend para invalidar el token
      await axios.post('http://localhost:8000/api/auth/logout/', {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Limpiar tokens del almacenamiento local
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // Eliminar el token de las cabeceras de axios
      delete axios.defaults.headers.common['Authorization'];
      
      // Notificar el logout exitoso
      onLogoutSuccess();
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