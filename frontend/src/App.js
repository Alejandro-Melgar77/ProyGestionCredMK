// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login/Login';
import Logout from './components/Logout/Logout';
import PasswordReset from './components/PasswordReset/PasswordReset';
import UserManagement from './components/UserManagement/UserManagement';
import RoleManagement from './components/RoleManagement/RoleManagement';
import Dashboard from './components/Dashboard/Dashboard';
import Navigation from './components/Navigation/Navigation';
import './App.css';
import ClientManagement from './components/ClientManagement/ClientManagement';
import EmployeeManagement from './components/EmployeeManagement/EmployeeManagement';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar autenticación al cargar la aplicación
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Configurar axios para incluir el token en las requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verificar si el token es válido
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      // Puedes usar cualquier endpoint que requiera autenticación para verificar el token
      const response = await axios.get('http://localhost:8000/api/users/');
      setIsAuthenticated(true);
      
      // Opcional: Obtener el rol del usuario si es necesario
      // setUserRole(response.data.role);
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      delete axios.defaults.headers.common['Authorization'];
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    // Opcional: Obtener el rol del usuario después del login
    // fetchUserRole();
  };
  const handleLogoutSuccess = () => {
    setIsAuthenticated(false);
    setUserRole(null);
  };

  // Si está cargando, mostrar un spinner o mensaje de carga
  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Sistema de Gestión de Solicitudes de Crédito</h1>
          {isAuthenticated && (
            <div className="header-actions">
              <Logout onLogoutSuccess={handleLogoutSuccess} />
            </div>
          )}
        </header>
        {isAuthenticated && <Navigation />}
        <main className="App-main">
          <Routes>
            {/* Ruta por defecto: redirige a login o dashboard según autenticación */}
            <Route 
              path="/" 
              element={
                isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <Navigate to="/login" replace />
              } 
            />
            
            {/* Ruta de login */}
            <Route 
              path="/login" 
              element={
                isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <Login onLoginSuccess={handleLoginSuccess} />
              } 
            />
            
            {/* Ruta para recuperar contraseña */}
            <Route 
              path="/password-reset" 
              element={
                isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <PasswordReset />
              } 
            />
            
            {/* Rutas protegidas */}
            {isAuthenticated && (
              <>
                <Route 
                  path="/dashboard" 
                  element={<Dashboard />} 
                />
                
                <Route 
                  path="/users" 
                  element={<UserManagement />} 
                />
                
                <Route 
                  path="/roles" 
                  element={<RoleManagement />} 
                />
                <Route path="/clientes" element={<ClientManagement />} />
                <Route path="/empleados" element={<EmployeeManagement />} />
              </>
            )}
            
            {/* Ruta para páginas no encontradas */}
            <Route 
              path="*" 
              element={<div>Página no encontrada</div>} 
            />
          </Routes>
        </main>
        
        <footer className="App-footer">
          <p>&copy; 2023 Sistema de Gestión de Créditos - Grupo 10</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;