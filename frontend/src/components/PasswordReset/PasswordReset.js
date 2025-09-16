// src/components/PasswordReset/PasswordReset.js
import React, { useState } from 'react';
import axios from '../../config/axios';
import './PasswordReset.css';

const PasswordReset = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.post('http://localhost:8000/api/auth/password/reset/', {
        email
      });
      
      setMessage('Se ha enviado un enlace para restablecer tu contraseña a tu correo electrónico.');
    } catch (error) {
      setError('Error al solicitar restablecimiento de contraseña. Por favor, verifica tu correo electrónico.');
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="password-reset-container">
      <form className="password-reset-form" onSubmit={handleSubmit}>
        <h2>Recuperar Contraseña</h2>
        
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="email">Correo Electrónico:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="reset-button" 
          disabled={isLoading}
        >
          {isLoading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
        </button>
      </form>
    </div>
  );
};

export default PasswordReset;