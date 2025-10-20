import React, { useEffect, useState } from 'react';
import axios from '../../config/axios';

export default function SolicitudList() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({}); // Para controlar qué solicitud se está procesando

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/solicitudes/', { withCredentials: true });
      setRows(data); 
      setError('');
    } catch (e) { 
      setError('No se pudieron cargar las solicitudes'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, []);

  // NUEVA FUNCIÓN: Evaluación automática con IA
  const evaluarAutomatico = async (id) => {
    setProcessing(prev => ({ ...prev, [id]: true }));
    
    try {
      // 1. Iniciar validación automática con IA
      const validationResponse = await axios.post(
        '/api/validacion/iniciar/', 
        { 
          solicitud_id: id, 
          usar_ia: true 
        }, 
        { withCredentials: true }
      );

      if (validationResponse.status === 200) {
        // 2. Obtener resultados de la validación
        const resultResponse = await axios.get(
          `/api/validacion/resultado/${id}/`,
          { withCredentials: true }
        );

        const { analisis_ia, solicitud } = resultResponse.data;

        if (analisis_ia) {
          // 3. Actualizar la solicitud con el score de riesgo obtenido de la IA
          await axios.patch(
            `/api/solicitudes/${id}/evaluar/`, 
            { 
              score_riesgo: parseFloat(analisis_ia.score_global),
              observacion_evaluacion: `Evaluación automática con IA. Recomendación: ${analisis_ia.recomendacion}. Factores de riesgo: ${analisis_ia.factores_riesgo.join(', ')}`
            }, 
            { withCredentials: true }
          );

          alert(`✅ Evaluación automática completada\nScore: ${(analisis_ia.score_global * 100).toFixed(1)}%\nRecomendación: ${analisis_ia.recomendacion}`);
        }
      }

      // Recargar la lista para mostrar los cambios
      await load();
      
    } catch (error) {
      console.error('Error en evaluación automática:', error);
      alert('❌ Error al realizar la evaluación automática. Verifica que la solicitud tenga documentos adjuntos.');
    } finally {
      setProcessing(prev => ({ ...prev, [id]: false }));
    }
  };

  // FUNCIÓN MANTENIDA: Evaluación manual (para casos especiales)
  const evaluarManual = async (id) => {
    const score = prompt('Score de riesgo (0-100):', '70');
    const obs = prompt('Observación:', '');
    if (score == null) return;
    
    try {
      await axios.patch(
        `/api/solicitudes/${id}/evaluar/`, 
        { 
          score_riesgo: Number(score) / 100, // Convertir a decimal
          observacion_evaluacion: obs 
        }, 
        { withCredentials: true }
      );
      load();
    } catch (error) {
      alert('Error al evaluar manualmente');
    }
  };

  const decidir = async (id, decision) => {
    try {
      await axios.post(
        `/api/solicitudes/${id}/decidir/`, 
        { decision }, 
        { withCredentials: true }
      );
      load();
    } catch (error) {
      alert('Error al tomar decisión');
    }
  };

  // Función para ver documentos de una solicitud
  const verDocumentos = async (id) => {
    try {
      const response = await axios.get(
        `/api/solicitudes/${id}/documentos/checklist/`,
        { withCredentials: true }
      );
      
      const documentos = response.data;
      const documentosInfo = documentos.map(doc => 
        `${doc.nombre}: ${doc.recibido ? '✅ Recibido' : '❌ Faltante'} ${doc.valido !== null ? (doc.valido ? '✓ Válido' : '✗ Inválido') : ''}`
      ).join('\n');
      
      alert(`Documentos de la solicitud:\n\n${documentosInfo}`);
    } catch (error) {
      alert('Error al cargar documentos');
    }
  };

  if (loading) return <div className="p-4">Cargando solicitudes…</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Solicitudes de Crédito</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plazo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tasa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score Riesgo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {r.id.slice(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {r.cliente_nombre}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {parseFloat(r.monto).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {r.plazo_meses} meses
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {r.tasa_nominal_anual}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${r.estado === 'APROBADA' ? 'bg-green-100 text-green-800' : 
                      r.estado === 'RECHAZADA' ? 'bg-red-100 text-red-800' : 
                      r.estado === 'EVALUADA' ? 'bg-blue-100 text-blue-800' : 
                      'bg-yellow-100 text-yellow-800'}`}>
                    {r.estado}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {r.score_riesgo ? (
                    <span className={`font-semibold ${
                      r.score_riesgo >= 0.7 ? 'text-green-600' : 
                      r.score_riesgo >= 0.5 ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {(r.score_riesgo * 100).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-gray-400">No evaluado</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => verDocumentos(r.id)}
                    className="text-blue-600 hover:text-blue-900 text-xs bg-blue-50 px-2 py-1 rounded"
                    title="Ver documentos"
                  >
                    📋 Docs
                  </button>
                  
                  <button
                    onClick={() => evaluarAutomatico(r.id)}
                    disabled={processing[r.id]}
                    className={`text-xs px-2 py-1 rounded ${
                      processing[r.id] 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {processing[r.id] ? '⏳ Procesando...' : '🤖 Evaluar (IA)'}
                  </button>
                  
                  <button
                    onClick={() => evaluarManual(r.id)}
                    className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                  >
                    ✏️ Manual
                  </button>
                  
                  <button
                    onClick={() => decidir(r.id, 'APROBAR')}
                    disabled={r.estado !== 'EVALUADA' && r.estado !== 'ENVIADA'}
                    className={`text-xs px-2 py-1 rounded ${
                      (r.estado !== 'EVALUADA' && r.estado !== 'ENVIADA') 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    ✅ Aprobar
                  </button>
                  
                  <button
                    onClick={() => decidir(r.id, 'RECHAZAR')}
                    disabled={r.estado !== 'EVALUADA' && r.estado !== 'ENVIADA'}
                    className={`text-xs px-2 py-1 rounded ${
                      (r.estado !== 'EVALUADA' && r.estado !== 'ENVIADA') 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    ❌ Rechazar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda de estados */}
      <div className="text-xs text-gray-600 space-y-1">
        <p><strong>Flujo de trabajo:</strong></p>
        <p>1. Cliente sube documentos requeridos → 2. Oficial hace clic en "🤖 Evaluar (IA)" → 3. Sistema calcula score automáticamente → 4. Oficial aprueba/rechaza</p>
        <p><strong>Score de riesgo:</strong> 🟢 ≥70% (Aprobar) 🟡 50-69% (Revisar) 🔴 {"<50%"} (Rechazar)</p>
      </div>
    </div>
  );
}