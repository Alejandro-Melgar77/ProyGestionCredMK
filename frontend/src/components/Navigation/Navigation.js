import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from '../../config/axios';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Llamada opcional al backend
      await axios.post('http://localhost:8000/api/auth/logout/', {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      delete axios.defaults.headers.common['Authorization'];
      navigate('/login'); // redirige al login
    }
  };

  return (
    <nav className="navigation">
      <ul>
        <li>
          <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
            Dashboard
          </Link>
        </li>
        <li>
          <Link to="/users" className={location.pathname === '/users' ? 'active' : ''}>
            Usuarios
          </Link>
        </li>
        <li>
          <Link to="/clientes">Clientes</Link>
        </li>
        <li>
          <Link to="/empleados">Empleados</Link>
        </li>
        <li>
          <Link to="/roles" className={location.pathname === '/roles' ? 'active' : ''}>
            Roles y Permisos
          </Link>
        </li>
        <li>
          <button className="logout-button" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;
