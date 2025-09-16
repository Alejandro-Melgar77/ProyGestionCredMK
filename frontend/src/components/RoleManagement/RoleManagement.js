import React, { useState, useEffect } from 'react';
import axios from '../../config/axios';
import './RoleManagement.css';

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [roleForm, setRoleForm] = useState({
    nombre: '',
    descripcion: ''
  });
  const [permissionForm, setPermissionForm] = useState({
    nombre: '',
    descripcion: ''
  });
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole.id);
    }
  }, [selectedRole]);

  const fetchRoles = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/roles/');
      setRoles(response.data);
    } catch (error) {
      setError('Error al cargar los roles');
      console.error('Fetch roles error:', error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/permisos/');
      setPermissions(response.data);
    } catch (error) {
      setError('Error al cargar los permisos');
      console.error('Fetch permissions error:', error);
    }
  };

  const fetchRolePermissions = async (roleId) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/roles/${roleId}/permisos/`);
      setRolePermissions(response.data);
    } catch (error) {
      setError('Error al cargar los permisos del rol');
      console.error('Fetch role permissions error:', error);
    }
  };

  const handleRoleChange = (e) => {
    setRoleForm({
      ...roleForm,
      [e.target.name]: e.target.value
    });
  };

  const handlePermissionChange = (e) => {
    setPermissionForm({
      ...permissionForm,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await axios.post('http://localhost:8000/api/roles/', roleForm);
      setRoleForm({ nombre: '', descripcion: '' });
      fetchRoles();
    } catch (error) {
      setError('Error al crear el rol');
      console.error('Create role error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePermission = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await axios.post('http://localhost:8000/api/permisos/', permissionForm);
      setPermissionForm({ nombre: '', descripcion: '' });
      fetchPermissions();
    } catch (error) {
      setError('Error al crear el permiso');
      console.error('Create permission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPermissionToRole = async (permissionId) => {
    try {
      await axios.post(`http://localhost:8000/api/roles/${selectedRole.id}/permisos/`, {
        permiso_id: permissionId
      });
      fetchRolePermissions(selectedRole.id);
    } catch (error) {
      setError('Error al agregar el permiso al rol');
      console.error('Add permission to role error:', error);
    }
  };

  const handleRemovePermissionFromRole = async (permissionId) => {
    try {
      await axios.delete(`http://localhost:8000/api/roles/${selectedRole.id}/permisos/${permissionId}/`);
      fetchRolePermissions(selectedRole.id);
    } catch (error) {
      setError('Error al eliminar el permiso del rol');
      console.error('Remove permission from role error:', error);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este rol?')) {
      try {
        await axios.delete(`http://localhost:8000/api/roles/${roleId}/`);
        setSelectedRole(null);
        fetchRoles();
      } catch (error) {
        setError('Error al eliminar el rol');
        console.error('Delete role error:', error);
      }
    }
  };

  const handleDeletePermission = async (permissionId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este permiso?')) {
      try {
        await axios.delete(`http://localhost:8000/api/permisos/${permissionId}/`);
        fetchPermissions();
      } catch (error) {
        setError('Error al eliminar el permiso');
        console.error('Delete permission error:', error);
      }
    }
  };

  return (
    <div className="role-management-container">
      <h2>Gestión de Roles y Permisos</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="management-sections">
        <div className="section">
          <h3>Gestión de Roles</h3>
          
          <form className="role-form" onSubmit={handleCreateRole}>
            <div className="form-group">
              <label htmlFor="role-name">Nombre del Rol:</label>
              <input
                type="text"
                id="role-name"
                name="nombre"
                value={roleForm.nombre}
                onChange={handleRoleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="role-description">Descripción:</label>
              <textarea
                id="role-description"
                name="descripcion"
                value={roleForm.descripcion}
                onChange={handleRoleChange}
                rows="3"
              />
            </div>
            
            <button 
              type="submit" 
              className="create-button" 
              disabled={isLoading}
            >
              {isLoading ? 'Creando...' : 'Crear Rol'}
            </button>
          </form>
          
          <div className="list-container">
            <h4>Roles Existentes</h4>
            
            {roles.length === 0 ? (
              <p>No hay roles registrados</p>
            ) : (
              <ul className="items-list">
                {roles.map(role => (
                  <li 
                    key={role.id} 
                    className={`item ${selectedRole?.id === role.id ? 'selected' : ''}`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="item-info">
                      <strong>{role.nombre}</strong>
                      <span>{role.descripcion}</span>
                    </div>
                    <button 
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(role.id);
                      }}
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="section">
          <h3>Gestión de Permisos</h3>
          
          <form className="permission-form" onSubmit={handleCreatePermission}>
            <div className="form-group">
              <label htmlFor="permission-name">Nombre del Permiso:</label>
              <input
                type="text"
                id="permission-name"
                name="nombre"
                value={permissionForm.nombre}
                onChange={handlePermissionChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="permission-description">Descripción:</label>
              <textarea
                id="permission-description"
                name="descripcion"
                value={permissionForm.descripcion}
                onChange={handlePermissionChange}
                rows="3"
              />
            </div>
            
            <button 
              type="submit" 
              className="create-button" 
              disabled={isLoading}
            >
              {isLoading ? 'Creando...' : 'Crear Permiso'}
            </button>
          </form>
          
          <div className="list-container">
            <h4>Permisos Existentes</h4>
            
            {permissions.length === 0 ? (
              <p>No hay permisos registrados</p>
            ) : (
              <ul className="items-list">
                {permissions.map(permission => (
                  <li key={permission.id} className="item">
                    <div className="item-info">
                      <strong>{permission.nombre}</strong>
                      <span>{permission.descripcion}</span>
                    </div>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeletePermission(permission.id)}
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      
      {selectedRole && (
        <div className="role-permissions-section">
          <h3>Permisos del Rol: {selectedRole.nombre}</h3>
          
          <div className="permissions-management">
            <div className="available-permissions">
              <h4>Permisos Disponibles</h4>
              
              {permissions.filter(p => !rolePermissions.some(rp => rp.id === p.id)).length === 0 ? (
                <p>No hay permisos disponibles para agregar</p>
              ) : (
                <ul className="items-list">
                  {permissions
                    .filter(p => !rolePermissions.some(rp => rp.id === p.id))
                    .map(permission => (
                      <li key={permission.id} className="item">
                        <div className="item-info">
                          <strong>{permission.nombre}</strong>
                          <span>{permission.descripcion}</span>
                        </div>
                        <button 
                          className="add-button"
                          onClick={() => handleAddPermissionToRole(permission.id)}
                        >
                          Agregar
                        </button>
                      </li>
                    ))
                  }
                </ul>
              )}
            </div>
            
            <div className="assigned-permissions">
              <h4>Permisos Asignados</h4>
              
              {rolePermissions.length === 0 ? (
                <p>Este rol no tiene permisos asignados</p>
              ) : (
                <ul className="items-list">
                  {rolePermissions.map(permission => (
                    <li key={permission.id} className="item">
                      <div className="item-info">
                        <strong>{permission.nombre}</strong>
                        <span>{permission.descripcion}</span>
                      </div>
                      <button 
                        className="remove-button"
                        onClick={() => handleRemovePermissionFromRole(permission.id)}
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;