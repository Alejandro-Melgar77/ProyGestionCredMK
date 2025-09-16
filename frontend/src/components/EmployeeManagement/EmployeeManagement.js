import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EmployeeManagement.css';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    departamento: '',
    puede_aprobar: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/users/empleados/');
      setEmployees(response.data.results || response.data);
    } catch (error) {
      setError('Error al cargar los empleados');
      console.error('Fetch employees error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const filteredEmployees = employees.filter(employee => {
    // Fallback a los datos de usuario si no hay registro en Empleado
    const userInfo = employee.empleado_info?.user_info || {
      username: employee.username,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      is_active: employee.is_active
    };
    const empInfo = employee.empleado_info || {};

    const matchesSearch =
      userInfo.username?.toLowerCase().includes(filters.search.toLowerCase()) ||
      userInfo.first_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      userInfo.last_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      empInfo.codigo_empleado?.includes(filters.search);

    const matchesDepartamento =
      !filters.departamento || empInfo.departamento === filters.departamento;

    const matchesPuedeAprobar =
      filters.puede_aprobar === '' ||
      (filters.puede_aprobar === 'true' && empInfo.puede_aprobar_creditos) ||
      (filters.puede_aprobar === 'false' && !empInfo.puede_aprobar_creditos);

    return matchesSearch && matchesDepartamento && matchesPuedeAprobar;
  });

  if (isLoading) {
    return <div className="loading">Cargando empleados...</div>;
  }

  return (
    <div className="employee-management-container">
      <h2>Gestión de Personal</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="filters">
        <input
          type="text"
          name="search"
          placeholder="Buscar por nombre, usuario o código"
          value={filters.search}
          onChange={handleFilterChange}
          className="search-input"
        />

        <select name="departamento" value={filters.departamento} onChange={handleFilterChange}>
          <option value="">Todos los departamentos</option>
          <option value="CREDITO">Crédito</option>
          <option value="ADMIN">Administración</option>
          <option value="TESORERIA">Tesorería</option>
          <option value="ATENCION">Atención al Cliente</option>
        </select>

        <select name="puede_aprobar" value={filters.puede_aprobar} onChange={handleFilterChange}>
          <option value="">Todos los empleados</option>
          <option value="true">Puede aprobar créditos</option>
          <option value="false">No puede aprobar créditos</option>
        </select>
      </div>

      <div className="employees-list">
        <h3>Lista de Empleados</h3>

        {filteredEmployees.length === 0 ? (
          <p>No hay empleados registrados</p>
        ) : (
          <table className="employees-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Usuario</th>
                <th>Nombre Completo</th>
                <th>Email</th>
                <th>Departamento</th>
                <th>Salario</th>
                <th>Supervisor</th>
                <th>Aprobar Créditos</th>
                <th>Límite Aprobación</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(employee => {
                const userInfo = employee.empleado_info?.user_info || {
                  username: employee.username,
                  first_name: employee.first_name,
                  last_name: employee.last_name,
                  email: employee.email,
                  is_active: employee.is_active
                };
                const empInfo = employee.empleado_info || {};

                return (
                  <tr key={employee.id}>
                    <td>{empInfo.codigo_empleado || '-'}</td>
                    <td>{userInfo.username}</td>
                    <td>{`${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || '-'}</td>
                    <td>{userInfo.email}</td>
                    <td>
                      <span className={`dept ${empInfo.departamento?.toLowerCase() || ''}`}>
                        {empInfo.departamento || '-'}
                      </span>
                    </td>
                    <td>{empInfo.salario ? `$${empInfo.salario}` : '-'}</td>
                    <td>
                      <span className={`badge ${empInfo.es_supervisor ? 'supervisor' : 'regular'}`}>
                        {empInfo.es_supervisor ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${empInfo.puede_aprobar_creditos ? 'approver' : 'non-approver'}`}>
                        {empInfo.puede_aprobar_creditos ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td>{empInfo.limite_aprobacion ? `$${empInfo.limite_aprobacion}` : '-'}</td>
                    <td>
                      <span className={`status ${userInfo.is_active ? 'active' : 'inactive'}`}>
                        {userInfo.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default EmployeeManagement;
