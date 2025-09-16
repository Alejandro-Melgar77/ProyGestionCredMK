import React from 'react';
//import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      <div className="dashboard-cards">
        <div className="card">
          <h3>Usuarios Registrados</h3>
          <p>25</p>
        </div>
        <div className="card">
          <h3>Solicitudes de Crédito</h3>
          <p>142</p>
        </div>
        <div className="card">
          <h3>Roles Configurados</h3>
          <p>5</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;