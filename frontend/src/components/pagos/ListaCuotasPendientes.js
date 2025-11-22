// components/pagos/ListaCuotasPendientes.js
import React, { useState, useEffect } from 'react';
import { pagoService } from '../../services/pagoService';
import FormularioPagoStripe from './FormularioPagoStripe';

const ListaCuotasPendientes = () => {
  const [cuotas, setCuotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null);

  useEffect(() => {
    cargarCuotasPendientes();
  }, []);

  const cargarCuotasPendientes = async () => {
    try {
      setLoading(true);
      const response = await pagoService.getCuotasPendientes();
      setCuotas(response.data);
    } catch (error) {
      setError('Error al cargar las cuotas pendientes');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarCuota = (cuota) => {
    setCuotaSeleccionada(cuota);
  };

  const handlePagoExitoso = () => {
    setCuotaSeleccionada(null);
    cargarCuotasPendientes(); // Recargar lista
  };

  if (loading) return <div className="loading">Cargando cuotas pendientes...</div>;

  return (
    <div className="cuotas-pendientes">
      <h2>📋 Cuotas Pendientes de Pago</h2>
      
      {error && <div className="alert alert-error">{error}</div>}

      {cuotas.length === 0 ? (
        <div className="empty-state">
          <p>🎉 ¡No tienes cuotas pendientes!</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="cuotas-table">
            <thead>
              <tr>
                <th># Cuota</th>
                <th>Producto</th>
                <th>Monto (BOB)</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {cuotas.map(cuota => {
                const diasVencimiento = cuota.dias_vencimiento;
                const estaVencida = diasVencimiento < 0;
                
                return (
                  <tr key={cuota.id} className={estaVencida ? 'vencida' : ''}>
                    <td>{cuota.nro_cuota}</td>
                    <td>{cuota.producto_info.nombre}</td>
                    <td>
                      <strong>Bs. {parseFloat(cuota.cuota).toFixed(2)}</strong>
                      <div className="desglose">
                        <small>Capital: Bs. {parseFloat(cuota.capital).toFixed(2)}</small>
                        <small>Interés: Bs. {parseFloat(cuota.interes).toFixed(2)}</small>
                      </div>
                    </td>
                    <td>
                      {new Date(cuota.fecha_vencimiento).toLocaleDateString()}
                      {estaVencida && (
                        <div className="badge badge-danger">Vencida</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${estaVencida ? 'badge-danger' : 'badge-warning'}`}>
                        {estaVencida ? `Vencida hace ${Math.abs(diasVencimiento)} días` : `Vence en ${diasVencimiento} días`}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => seleccionarCuota(cuota)}
                        className="btn btn-primary btn-sm"
                      >
                        💳 Pagar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {cuotaSeleccionada && (
        <FormularioPagoStripe 
          cuota={cuotaSeleccionada}
          onCancelar={() => setCuotaSeleccionada(null)}
          onExitoso={handlePagoExitoso}
        />
      )}
    </div>
  );
};

export default ListaCuotasPendientes;