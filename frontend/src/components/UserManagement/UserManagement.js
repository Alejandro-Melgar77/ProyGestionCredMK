import React, { useState, useEffect } from "react";
import axios from "../../config/axios";
import "./UserManagement.css";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    first_name: "",
    last_name: "",
    is_active: true,
    rol_id: "",
  });
  const [clienteData, setClienteData] = useState({
    tipo_documento: "CI",
    numero_documento: "",
    telefono: "",
    direccion: "",
    fecha_nacimiento: "",
    ocupacion: "",
    ingresos_mensuales: "",
  });
  const [empleadoData, setEmpleadoData] = useState({
    codigo_empleado: "",
    departamento: "ATENCION",
    fecha_contratacion: "",
    salario: "",
    es_supervisor: false,
    puede_aprobar_creditos: false,
    limite_aprobacion: "",
  });
  const [clienteData, setClienteData] = useState({
    tipo_documento: 'CI',
    numero_documento: '',
    telefono: '',
    direccion: '',
    fecha_nacimiento: '',
    ocupacion: '',
    ingresos_mensuales: ''
  });
  const [empleadoData, setEmpleadoData] = useState({
    codigo_empleado: '',
    departamento: 'ATENCION',
    fecha_contratacion: '',
    salario: '',
    es_supervisor: false,
    puede_aprobar_creditos: false,
    limite_aprobacion: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const addDebug = (message) => {
    console.log(`🔍 DEBUG: ${message}`);
    setDebugInfo(
      (prev) => prev + `\n${new Date().toLocaleTimeString()}: ${message}`
    );
  };

 const fetchUsers = async () => {
    try {
      addDebug('Iniciando fetchUsers...');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/users/`);
      addDebug(`fetchUsers exitoso, ${response.data.length} usuarios cargados`);
      setUsers(response.data);
    } catch (err) {
      const errorMsg = `Error en fetchUsers: ${err.response?.status || err.message}`;
      addDebug(errorMsg);
      setError('Error al cargar los usuarios');
      console.error('Fetch users error:', err);
    }
  };

  const fetchRoles = async () => {
    try {
      addDebug('Iniciando fetchRoles...');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/roles/`);
      addDebug(`fetchRoles exitoso, ${response.data.length} roles cargados`);
      setRoles(response.data);
    } catch (err) {
      addDebug(`Error en fetchRoles: ${err.response?.status || err.message}`);
      console.error('Fetch roles error:', err);
    }
  };

  const getSelectedRol = () => {
    return roles.find((rol) => rol.id === parseInt(formData.rol_id));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleClienteChange = (e) => {
    const { name, value, type, checked } = e.target;
    setClienteData({
      ...clienteData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleEmpleadoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEmpleadoData({
      ...empleadoData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const generateEmployeeCode = () => {
    return "EMP" + Math.random().toString(36).substr(2, 7).toUpperCase();
  };

  const prepareUserPayload = () => {
    const selectedRol = getSelectedRol();
    const rolNombre = selectedRol ? selectedRol.nombre.toLowerCase() : "";

    const payload = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      password2: formData.password2,
      first_name: formData.first_name,
      last_name: formData.last_name,
      is_active: formData.is_active,
      rol_id: parseInt(formData.rol_id),
    };

    // Solo agregar datos de cliente si el rol es cliente
    if (rolNombre === "cliente") {
      Object.assign(payload, {
        telefono: clienteData.telefono,
        tipo_documento: clienteData.tipo_documento,
        numero_documento: clienteData.numero_documento,
        direccion: clienteData.direccion,
        fecha_nacimiento: clienteData.fecha_nacimiento,
        ocupacion: clienteData.ocupacion,
        ingresos_mensuales: clienteData.ingresos_mensuales
          ? parseFloat(clienteData.ingresos_mensuales)
          : null,
      });
    }

    addDebug(`Payload usuario preparado para rol: ${rolNombre}`);
    return payload;
  };

  const prepareEmpleadoPayload = (userId) => {
    const payload = {
      user: parseInt(userId),
      codigo_empleado: empleadoData.codigo_empleado || generateEmployeeCode(),
      departamento: empleadoData.departamento,
      fecha_contratacion: empleadoData.fecha_contratacion,
      salario: empleadoData.salario ? parseFloat(empleadoData.salario) : 0,
      es_supervisor: Boolean(empleadoData.es_supervisor),
      puede_aprobar_creditos: Boolean(empleadoData.puede_aprobar_creditos),
    };

    if (empleadoData.limite_aprobacion) {
      payload.limite_aprobacion = parseFloat(empleadoData.limite_aprobacion);
    }

    addDebug(`Payload empleado preparado: ${JSON.stringify(payload)}`);
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setError('');
    setDebugInfo('Iniciando proceso de creación...\n');

    try {
      const selectedRol = getSelectedRol();
      addDebug(`Rol seleccionado: ${selectedRol?.nombre || "Ninguno"}`);

      if (editingUser) {
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        await axios.put(
          `http://localhost:8000/api/users/${editingUser.id}/`,
          payload
        );
        // Modo edición
        addDebug('Modo edición activado');
        const updatePayload = {
          username: formData.username,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          is_active: formData.is_active
        };
        
        addDebug(`Actualizando usuario ${editingUser.id}...`);
        await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/users/${editingUser.id}/`, updatePayload);
        addDebug('Usuario actualizado exitosamente');
        
        // Actualizar datos adicionales según el rol
        if (selectedRol) {
          const rolNombre = selectedRol.nombre.toLowerCase();
          
          if (rolNombre === 'cliente' && editingUser.cliente_info) {
            addDebug('Actualizando datos de cliente...');
            await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/clientes/${editingUser.cliente_info.id}/`, {
              ...clienteData,
              telefono: clienteData.telefono
            });
          } else if (rolNombre !== 'administrador' && rolNombre !== 'cliente' && editingUser.empleado_info) {
            addDebug('Actualizando datos de empleado...');
            await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/empleados/${editingUser.empleado_info.id}/`, empleadoData);
          }
        }
      } else {
        // Modo creación
        addDebug('Modo creación activado');
        const createPayload = prepareUserPayload();
        
        addDebug('Creando usuario...');
        const userResponse = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/users/`, createPayload);
        const user = userResponse.data;
        addDebug(`Usuario creado exitosamente - ID: ${user.id}`);

        // Para roles que no son cliente, crear empleado si es necesario
        if (selectedRol) {
          const rolNombre = selectedRol.nombre.toLowerCase();
          addDebug(`Procesando rol: ${rolNombre}`);
          
          if (rolNombre !== 'cliente' && rolNombre !== 'administrador') {
            addDebug('Creando registro de empleado...');
            
            // Verificar que el usuario se creó correctamente
            try {
              const userCheck = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/users/${user.id}/`);
              addDebug(`Usuario verificado: ${userCheck.data.username}`);
            } catch (checkError) {
              addDebug(`ERROR verificando usuario: ${checkError.message}`);
            }

            // Crear empleado
            const empleadoPayload = prepareEmpleadoPayload(user.id);
            
            addDebug('Enviando datos de empleado al servidor...');
            const empleadoResponse = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/empleados/`, empleadoPayload);
            addDebug(`Empleado creado exitosamente - ID: ${empleadoResponse.data.id}`);
          } else {
            addDebug(`No se requiere creación adicional para rol: ${rolNombre}`);
          }
        }
      }

      addDebug('Proceso completado exitosamente');
      resetForms();
      fetchUsers();
    } catch (err) {
      addDebug(`ERROR: ${err.message}`);
      
      if (err.response) {
        addDebug(`Status: ${err.response.status}`);
        addDebug(`Datos error: ${JSON.stringify(err.response.data)}`);
        
        if (err.response.status === 401) {
          setError('Error de autenticación. Por favor, verifica que estés logueado.');
        } else if (err.response.status === 400) {
          let errorMessages = '';
          if (typeof err.response.data === 'object') {
            errorMessages = Object.entries(err.response.data)
              .map(([field, msgs]) => {
                if (Array.isArray(msgs)) {
                  return `${field}: ${msgs.join(', ')}`;
                }
                return `${field}: ${msgs}`;
              })
              .join(' | ');
          } else {
            errorMessages = err.response.data;
          }
          setError(`Error en los datos: ${errorMessages}`);
        } else {
          setError(`Error del servidor: ${err.response.status}`);
        }
      } else if (err.request) {
        setError('No se pudo conectar con el servidor');
      } else {
        await axios.post("http://localhost:8000/api/users/", {
          ...formData,
          rol_id: formData.rol_id,
          password2: formData.password2,
        });
      }

      setFormData({
        username: "",
        email: "",
        password: "",
        password2: "",
        first_name: "",
        last_name: "",
        is_active: true,
        rol_id: "",
      });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      if (err.response?.data) {
        const messages = Object.entries(err.response.data)
          .map(([field, msgs]) => `${field}: ${msgs.join(" ")}`)
          .join(" | ");
        setError(messages);
      } else {
        setError("Error al guardar el usuario");
      }
      console.error("Save user error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user) => {
        setError('Error inesperado');
      }
      
      console.error('Save user error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForms = () => {
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
    setClienteData({
      tipo_documento: 'CI',
      numero_documento: '',
      telefono: '',
      direccion: '',
      fecha_nacimiento: '',
      ocupacion: '',
      ingresos_mensuales: ''
    });
    setEmpleadoData({
      codigo_empleado: '',
      departamento: 'ATENCION',
      fecha_contratacion: '',
      salario: '',
      es_supervisor: false,
      puede_aprobar_creditos: false,
      limite_aprobacion: ''
    });
    setEditingUser(null);
  };

  const handleEdit = async (user) => {
    addDebug(`Editando usuario: ${user.username}`);
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      password2: "",
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      rol_id: user.rol_id || "",
      rol_id: user.userprofile?.rol_id || ''
    });

    setEditingUser(user);
    setError("");
    setError('');

    // Cargar datos adicionales según el rol
    try {
      if (user.rol_nombre?.toLowerCase() === 'cliente' && user.cliente_info) {
        setClienteData({
          tipo_documento: user.cliente_info.tipo_documento || 'CI',
          numero_documento: user.cliente_info.numero_documento || '',
          telefono: user.cliente_info.telefono || '',
          direccion: user.cliente_info.direccion || '',
          fecha_nacimiento: user.cliente_info.fecha_nacimiento || '',
          ocupacion: user.cliente_info.ocupacion || '',
          ingresos_mensuales: user.cliente_info.ingresos_mensuales || ''
        });
      } else if (user.rol_nombre?.toLowerCase() !== 'administrador' && user.empleado_info) {
        setEmpleadoData({
          codigo_empleado: user.empleado_info.codigo_empleado || '',
          departamento: user.empleado_info.departamento || 'ATENCION',
          fecha_contratacion: user.empleado_info.fecha_contratacion || '',
          salario: user.empleado_info.salario || '',
          es_supervisor: user.empleado_info.es_supervisor || false,
          puede_aprobar_creditos: user.empleado_info.puede_aprobar_creditos || false,
          limite_aprobacion: user.empleado_info.limite_aprobacion || ''
        });
      }
    } catch (err) {
      addDebug(`Error cargando datos adicionales: ${err.message}`);
      console.error('Error loading additional data:', err);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
      try {
        addDebug(`Eliminando usuario ID: ${userId}`);
        await axios.delete(
          `${process.env.REACT_APP_API_BASE_URL}/api/users/${userId}/`
        );
        fetchUsers();
      } catch (err) {
        setError("Error al eliminar el usuario");
        console.error("Delete user error:", err);
      }
    }
  };

  const cancelEdit = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      password2: "",
      first_name: "",
      last_name: "",
      is_active: true,
      rol_id: "",
    });
    setEditingUser(null);
    setError("");
    addDebug('Editación cancelada');
    resetForms();
    setError('');
  };

  const selectedRol = getSelectedRol();
  const rolNombre = selectedRol ? selectedRol.nombre.toLowerCase() : "";

  return (
    <div className="user-management-container">
      <h2>Gestión de Usuarios</h2>

      {error && <div className="error-message">{error}</div>}

      {/* Panel de Debug (puedes ocultarlo en producción) */}
      <details
        style={{
          marginBottom: "20px",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "5px",
        }}
      >
        <summary>Información de Debug</summary>
        <pre
          style={{
            background: "#f5f5f5",
            padding: "10px",
            borderRadius: "5px",
            fontSize: "12px",
            maxHeight: "200px",
            overflow: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {debugInfo || "No hay información de debug aún..."}
        </pre>
        <button
          onClick={() => setDebugInfo("")}
          style={{ marginTop: "10px", padding: "5px 10px" }}
        >
          Limpiar Debug
        </button>
      </details>

      <form className="user-form" onSubmit={handleSubmit}>
        <h3>{editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}</h3>

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
              <option key={rol.id} value={rol.id}>
                {rol.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Campos para Cliente */}
        {rolNombre === "cliente" && (
          <div className="additional-fields">
            <h4>Datos del Cliente</h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tipo_documento">Tipo de Documento:</label>
                <select
                  id="tipo_documento"
                  name="tipo_documento"
                  value={clienteData.tipo_documento}
                  onChange={handleClienteChange}
                  required
                >
                  <option value="CI">Cédula de Identidad</option>
                  <option value="PAS">Pasaporte</option>
                  <option value="NIT">NIT</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="numero_documento">Número de Documento:</label>
                <input
                  type="text"
                  id="numero_documento"
                  name="numero_documento"
                  value={clienteData.numero_documento}
                  onChange={handleClienteChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="telefono">Teléfono:</label>
                <input
                  type="text"
                  id="telefono"
                  name="telefono"
                  value={clienteData.telefono}
                  onChange={handleClienteChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="fecha_nacimiento">Fecha de Nacimiento:</label>
                <input
                  type="date"
                  id="fecha_nacimiento"
                  name="fecha_nacimiento"
                  value={clienteData.fecha_nacimiento}
                  onChange={handleClienteChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ocupacion">Ocupación:</label>
                <input
                  type="text"
                  id="ocupacion"
                  name="ocupacion"
                  value={clienteData.ocupacion}
                  onChange={handleClienteChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="ingresos_mensuales">Ingresos Mensuales:</label>
                <input
                  type="number"
                  id="ingresos_mensuales"
                  name="ingresos_mensuales"
                  value={clienteData.ingresos_mensuales}
                  onChange={handleClienteChange}
                  step="0.01"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="direccion">Dirección:</label>
              <textarea
                id="direccion"
                name="direccion"
                value={clienteData.direccion}
                onChange={handleClienteChange}
                required
              />
            </div>
          </div>
        )}

        {/* Campos para Empleado (cuando no es cliente ni administrador) */}
        {selectedRol &&
          rolNombre !== "cliente" &&
          rolNombre !== "administrador" && (
            <div className="additional-fields">
              <h4>Datos del Empleado</h4>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="codigo_empleado">Código de Empleado:</label>
                  <input
                    type="text"
                    id="codigo_empleado"
                    name="codigo_empleado"
                    value={empleadoData.codigo_empleado}
                    onChange={handleEmpleadoChange}
                    placeholder="Se generará automáticamente si se deja vacío"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="departamento">Departamento:</label>
                  <select
                    id="departamento"
                    name="departamento"
                    value={empleadoData.departamento}
                    onChange={handleEmpleadoChange}
                    required
                  >
                    <option value="CREDITO">Crédito</option>
                    <option value="ADMIN">Administración</option>
                    <option value="TESORERIA">Tesorería</option>
                    <option value="ATENCION">Atención al Cliente</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fecha_contratacion">
                    Fecha de Contratación:
                  </label>
                  <input
                    type="date"
                    id="fecha_contratacion"
                    name="fecha_contratacion"
                    value={empleadoData.fecha_contratacion}
                    onChange={handleEmpleadoChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="salario">Salario:</label>
                  <input
                    type="number"
                    id="salario"
                    name="salario"
                    value={empleadoData.salario}
                    onChange={handleEmpleadoChange}
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="limite_aprobacion">
                    Límite de Aprobación:
                  </label>
                  <input
                    type="number"
                    id="limite_aprobacion"
                    name="limite_aprobacion"
                    value={empleadoData.limite_aprobacion}
                    onChange={handleEmpleadoChange}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label htmlFor="es_supervisor">
                    <input
                      type="checkbox"
                      id="es_supervisor"
                      name="es_supervisor"
                      checked={empleadoData.es_supervisor}
                      onChange={handleEmpleadoChange}
                    />
                    Es Supervisor
                  </label>
                </div>
                <div className="form-group checkbox-group">
                  <label htmlFor="puede_aprobar_creditos">
                    <input
                      type="checkbox"
                      id="puede_aprobar_creditos"
                      name="puede_aprobar_creditos"
                      checked={empleadoData.puede_aprobar_creditos}
                      onChange={handleEmpleadoChange}
                    />
                    Puede Aprobar Créditos
                  </label>
                </div>
              </div>
            </div>
          )}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="password">
              {editingUser
                ? "Nueva Contraseña (dejar en blanco para no cambiar)"
                : "Contraseña:"}
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
            {isLoading ? "Guardando..." : editingUser ? "Actualizar" : "Crear"}
          </button>

          {editingUser && (
            <button
              type="button"
              className="cancel-button"
              onClick={cancelEdit}
            >
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
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>
                      {`${user.first_name || ""} ${
                        user.last_name || ""
                      }`.trim() || "-"}
                    </td>
                    <td>{user.email}</td>
                    <td>{user.rol_nombre || "-"}</td>
                    <td>
                      <span
                        className={`status ${
                          user.is_active ? "active" : "inactive"
                        }`}
                      >
                        {user.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="edit-button"
                        onClick={() => handleEdit(user)}
                      >
                        Editar
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(user.id)}
                      >
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
