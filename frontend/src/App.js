// src/App.js
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import api from "./config/axios";

// Layouts
import Layout from "./components/Layout/Layout";
import AuthLayout from "./components/Auth/AuthLayout";
import RequireAuth from "./components/Auth/RequireAuth";

// Auth
import Login from "./components/Login/Login";
import PasswordReset from "./components/PasswordReset/PasswordReset";

// Gestión
import Dashboard from "./components/Dashboard/Dashboard";
import UserManagement from "./components/UserManagement/UserManagement";
import RoleManagement from "./components/RoleManagement/RoleManagement";
import ClientManagement from "./components/ClientManagement/ClientManagement";
import EmployeeManagement from "./components/EmployeeManagement/EmployeeManagement";

// Solicitudes
import SolicitudesList from "./pages/solicitudes/SolicitudesList";
import SolicitudCreate from "./pages/solicitudes/SolicitudCreate";
import SolicitudDetail from "./pages/solicitudes/SolicitudDetail";
import SolicitudChecklist from "./pages/solicitudes/SolicitudChecklist";
import PlanView from "./pages/solicitudes/PlanView";
import Simulador from "./pages/solicitudes/Simulador";
import InformationValidation from "./components/InformationValidation/InformationValidation";

import ListaCuotasPendientes from './components/pagos/ListaCuotasPendientes';

// Productos
import RequisitosEditor from "./pages/productos/RequisitosEditor";

// Bitácora
import BitacoraPage from "./pages/bitacora/BitacoraPage";

import "./App.css";

function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ✅ Verifica sesión al montar
  useEffect(() => {
    const verify = async () => {
      try {
        const token =
          localStorage.getItem("access_token") ||
          localStorage.getItem("access");
        if (!token) {
          setIsAuthenticated(false);
          return;
        }

        // Consulta al endpoint de perfil
        await api.get("users/me/");
        setIsAuthenticated(true);
      } catch {
        // Limpia tokens si expiran o son inválidos
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    };
    verify();
  }, []);

  // ✅ Maneja login exitoso
  const handleLoginSuccess = (tokens) => {
    if (tokens?.access || tokens?.refresh) {
      localStorage.setItem("access_token", tokens.access);
      localStorage.setItem("refresh_token", tokens.refresh);
    }
    setIsAuthenticated(true);
  };

  return (
    <Router>
      <Routes>
        {/* Root -> Dashboard (protegido) */}
        <Route
          path="/"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <Dashboard />
              </Layout>
            </RequireAuth>
          }
        />

        {/* Públicas */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <AuthLayout>
                <Login onLoginSuccess={handleLoginSuccess} />
              </AuthLayout>
            )
          }
        />
        <Route
          path="/password-reset"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <AuthLayout>
                <PasswordReset />
              </AuthLayout>
            )
          }
        />

        {/* Gestión (protegidas) */}
        <Route
          path="/users"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <UserManagement />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/roles"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <RoleManagement />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/clientes"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <ClientManagement />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/empleados"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <EmployeeManagement />
              </Layout>
            </RequireAuth>
          }
        />

        {/* Simulador (protegido) */}
        <Route
          path="/simulador"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <Simulador />
              </Layout>
            </RequireAuth>
          }
        />

        {/* Solicitudes (protegidas) */}
        <Route
          path="/solicitudes"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <SolicitudesList />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/solicitudes/nueva"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <SolicitudCreate />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/solicitudes/:id"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <SolicitudDetail />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/solicitudes/:id/checklist"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <SolicitudChecklist />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/solicitudes/:id/plan"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <PlanView />
              </Layout>
            </RequireAuth>
          }
        />

        {/* Editor de requisitos (protegido) */}
        <Route
          path="/productos/requisitos"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <RequisitosEditor />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/pagos"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <ListaCuotasPendientes />
              </Layout>
            </RequireAuth>
          }
        />
        {/* Bitácora (protegida) */}
        <Route
          path="/bitacora"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <BitacoraPage />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/validacion/:solicitudId"
          element={
            <RequireAuth authed={isAuthenticated} loading={authLoading}>
              <Layout>
                <InformationValidation />
              </Layout>
            </RequireAuth>
          }
        />
        {/* 404 -> Dashboard o Login según estado */}
        <Route
          path="*"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
