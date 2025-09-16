import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ClientManagement.css';

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    tipo_documento: '',
    es_preferencial: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/users/clientes/');
      setClients(response.data.results || response.data);
    } catch (error) {
      setError('Error al cargar los clientes');
      console.error('Fetch clients error:', error);
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

  // Filtrado usando campos directos de la respuesta
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.username?.toLowerCase().includes(filters.search.toLowerCase()) ||
      client.first_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      client.last_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      client.numero_documento?.includes(filters.search);

    const matchesTipoDocumento = 
      !filters.tipo_documento || client.tipo_documento === filters.tipo_documento;

    const matchesPreferencial = 
      filters.es_preferencial === '' ||
      (filters.es_preferencial === 'true' && client.es_cliente_preferencial) ||
      (filters.es_preferencial === 'false' && !client.es_cliente_preferencial);

    return matchesSearch && matchesTipoDocumento && matchesPreferencial;
  });

  if (isLoading) {
    return <div className="loading">Cargando clientes...</div>;
  }

  return (
    <div className="client-management-container">
      <h2>Gestión de Clientes</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="filters">
        <input
          type="text"
          name="search"
          placeholder="Buscar por nombre, usuario o documento"
          value={filters.search}
          onChange={handleFilterChange}
          className="search-input"
        />
        
        <select name="tipo_documento" value={filters.tipo_documento} onChange={handleFilterChange}>
          <option value="">Todos los documentos</option>
          <option value="CI">Cédula de Identidad</option>
          <option value="PAS">Pasaporte</option>
          <option value="NIT">NIT</option>
        </select>
        
        <select name="es_preferencial" value={filters.es_preferencial} onChange={handleFilterChange}>
          <option value="">Todos los clientes</option>
          <option value="true">Clientes preferenciales</option>
          <option value="false">Clientes regulares</option>
        </select>
      </div>
      
      <div className="clients-list">
        <h3>Lista de Clientes</h3>
        
        {filteredClients.length === 0 ? (
          <p>No hay clientes registrados</p>
        ) : (
          <table className="clients-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre Completo</th>
                <th>Email</th>
                <th>Documento</th>
                <th>Teléfono</th>
                <th>Ingresos</th>
                <th>Tipo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(client => (
                <tr key={client.id}>
                  <td>{client.username}</td>
                  <td>{`${client.first_name || ''} ${client.last_name || ''}`.trim() || '-'}</td>
                  <td>{client.email}</td>
                  <td>{client.tipo_documento}: {client.numero_documento}</td>
                  <td>{client.telefono || '-'}</td>
                  <td>{client.ingresos_mensuales ? `$${client.ingresos_mensuales}` : '-'}</td>
                  <td>
                    <span className={`client-type ${client.es_cliente_preferencial ? 'preferential' : 'regular'}`}>
                      {client.es_cliente_preferencial ? 'Preferencial' : 'Regular'}
                    </span>
                  </td>
                  <td>
                    <span className={`status ${client.is_active ? 'active' : 'inactive'}`}>
                      {client.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ClientManagement;
