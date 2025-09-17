import React, { useState, useEffect } from 'react';
import axios from '../../config/axios';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
    is_active: true,
    rol_id: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/users/');
      setUsers(response.data);
    } catch (err) {
      setError('Error al cargar los usuarios');
      console.error('Fetch users error:', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/roles/');
      setRoles(response.data);
    } catch (err) {
      console.error('Fetch roles error:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (editingUser) {
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        await axios.put(`http://localhost:8000/api/users/${editingUser.id}/`, payload);
      } else {
        await axios.post('http://localhost:8000/api/users/', {
          ...formData,
          rol_id: formData.rol_id,
          password2: formData.password2
        });
      }

      setFormData({
        username: '',
        email: '',
        password: '',
        password2: '',
        first_name: '',
        last_name: '',
        is_active: true,
        rol_id: ''
      });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      if (err.response?.data) {
        const messages = Object.entries(err.response.data)
          .map(([field, msgs]) => `${field}: ${msgs.join(' ')}`)
          .join(' | ');
        setError(messages);
      } else {
        setError('Error al guardar el usuario');
      }
      console.error('Save user error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user) => {
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      password2: '',
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      rol_id: user.rol_id || ''
    });
    setEditingUser(user);
    setError('');
  };

  const handleDelete = async (userId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        await axios.delete(`http://localhost:8000/api/users/${userId}/`);
        fetchUsers();
      } catch (err) {
        setError('Error al eliminar el usuario');
        console.error('Delete user error:', err);
      }
    }
  };

  const cancelEdit = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      password2: '',
      first_name: '',
      last_name: '',
      is_active: true,
      rol_id: ''
    });
    setEditingUser(null);
    setError('');
  };

  return (
    <div className="user-management-container">
      <h2>Gestión de Usuarios</h2>

      {error && <div className="error-message">{error}</div>}

      <form className="user-form" onSubmit={handleSubmit}>
        <h3>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="username">Usuario:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="first_name">Nombre:</label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="last_name">Apellido:</label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="rol_id">Rol:</label>
          <select
            id="rol_id"
            name="rol_id"
            value={formData.rol_id}
            onChange={handleChange}
            required
          >
            <option value="">-- Seleccione un rol --</option>
            {roles.map((rol) => (
              <option key={rol.id} value={rol.id}>{rol.nombre}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="password">
              {editingUser
                ? 'Nueva Contraseña (dejar en blanco para no cambiar)'
                : 'Contraseña:'}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!editingUser}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password2">Confirmar Contraseña:</label>
            <input
              type="password"
              id="password2"
              name="password2"
              value={formData.password2}
              onChange={handleChange}
              required={!editingUser}
            />
          </div>

          <div className="form-group checkbox-group">
            <label htmlFor="is_active">Usuario Activo:</label>
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="save-button" disabled={isLoading}>
            {isLoading ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear'}
          </button>

          {editingUser && (
            <button type="button" className="cancel-button" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="users-list">
        <h3>Lista de Usuarios</h3>

        {users.length === 0 ? (
          <p>No hay usuarios registrados</p>
        ) : (
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre Completo</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || '-'}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`status ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button className="edit-button" onClick={() => handleEdit(user)}>
                        Editar
                      </button>
                      <button className="delete-button" onClick={() => handleDelete(user.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
