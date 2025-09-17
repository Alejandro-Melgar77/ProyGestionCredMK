import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from '../../config/axios';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
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
      navigate('/login');
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-header">
        <h2 className="nav-logo">MiApp</h2>

        {/* Botón hamburguesa */}
        <button 
          className={`menu-toggle ${menuOpen ? 'open' : ''}`} 
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      <ul className={`nav-links ${menuOpen ? 'show' : ''}`}>
        <li>
          <Link 
            to="/dashboard" 
            className={location.pathname === '/dashboard' ? 'active' : ''} 
            onClick={() => setMenuOpen(false)}
          >
            Dashboard
          </Link>
        </li>
        <li>
          <Link 
            to="/users" 
            className={location.pathname === '/users' ? 'active' : ''} 
            onClick={() => setMenuOpen(false)}
          >
            Usuarios
          </Link>
        </li>
        <li>
          <Link to="/clientes" onClick={() => setMenuOpen(false)}>Clientes</Link>
        </li>
        <li>
          <Link to="/empleados" onClick={() => setMenuOpen(false)}>Empleados</Link>
        </li>
        <li>
          <Link 
            to="/roles" 
            className={location.pathname === '/roles' ? 'active' : ''} 
            onClick={() => setMenuOpen(false)}
          >
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
