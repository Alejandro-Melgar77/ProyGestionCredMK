import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSolicitud, evaluarSolicitud, decidirSolicitud } from '../../services/solicitudes';
import axios from '../../config/axios';

// Servicio para la validación IA
const validacionAPI = {
  iniciar: (data) => axios.post('/api/validacion/iniciar/', data, { withCredentials:true }),
  obtenerResultado: (id) => axios.get(`/api/validacion/resultado/${id}/`, { withCredentials:true }),
};

export default function SolicitudDetail() {
  const { id } = useParams();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Acciones
  const [score, setScore] = useState('');
  const [obs, setObs] = useState('');
  const [errEval, setErrEval] = useState('');
  const [errDec, setErrDec] = useState('');

  // Estados para validación automática
  const [validandoIA, setValidandoIA] = useState(false);
  const [resultadoValidacion, setResultadoValidacion] = useState(null);

  // Cargar solicitud
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSolicitud(id);
      setRow(data);
      setErr('');

      // Si no tiene score_riesgo y está en estado evaluable, ejecutar validación automática
      if (!data.score_riesgo && ['ENVIADA', 'DRAFT', 'EVALUADA'].includes(data.estado)) {
        ejecutarValidacionAutomatica();
      } else if (data.score_riesgo) {
        setScore(data.score_riesgo.toString());
        if (data.observacion_evaluacion) setObs(data.observacion_evaluacion);
      }
    } catch (e) {
      setErr('No se pudo cargar la solicitud.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Ejecutar validación automática
  const ejecutarValidacionAutomatica = async () => {
    try {
      setValidandoIA(true);
      console.log('🔄 Iniciando validación automática...');

      const response = await validacionAPI.iniciar({
        solicitud_id: id,
        usar_ia: true
      });

      console.log('✅ Respuesta del backend:', response.data);

      if (response.data && response.data.solicitud_id) {
        setResultadoValidacion({
          solicitud_id: response.data.solicitud_id,
          estado: response.data.estado || '',
          score_global: parseFloat(response.data.score_global) || 0,
          recomendacion: response.data.recomendacion || '',
          documentos_procesados: parseInt(response.data.documentos_procesados) || 0,
          factores_riesgo: response.data.factores_riesgo || [],
          resultado_ia_id: response.data.resultado_ia_id || null
        });
      } else {
        console.error('❌ Respuesta inválida del servidor:', response.data);
        alert('Error: Respuesta inválida del servidor');
      }
    } catch (error) {
      console.error('❌ Error en validación automática:', error);
      alert('Error al ejecutar la validación automática: ' + error.message);
    } finally {
      setValidandoIA(false);
    }
  };

  // Guardar evaluación
  const doEvaluar = async () => {
    try {
      setErrEval('');
      await evaluarSolicitud(id, {
        score_riesgo: Number(score),
        observacion_evaluacion: obs || '',
      });
      await load();
    } catch (e) {
      setErrEval(String(e?.response?.data?.detail || e));
    }
  };

  // Tomar decisión
  const doDecidir = async (decision) => {
    try {
      setErrDec('');
      await decidirSolicitud(id, decision);
      await load();
    } catch (e) {
      setErrDec(String(e?.response?.data?.detail || e));
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div>Cargando…</div>;
  if (err) return <div style={{ color: 'crimson' }}>{err}</div>;
  if (!row) return <div>No encontrado</div>;

  // Datos del cliente
  const panel = row.cliente_panel || {};
  const nombre =
    panel.nombre ||
    `${row.cliente_info?.user_info?.first_name || ''} ${row.cliente_info?.user_info?.last_name || ''}`.trim() ||
    row.cliente_nombre ||
    `Cliente #${row.cliente}`;
  const email = panel.email || row.cliente_info?.user_info?.email || '';
  const doc = panel.documento || `${row.cliente_info?.tipo_documento || ''} ${row.cliente_info?.numero_documento || ''}`.trim();

  return (
    <div className="wrap">
      <div className="header">
        <div>
          <h2>
            Solicitud <span className="mono">#{row.id}</span>
          </h2>
          <div className="pills">
            <span className={`pill ${row.estado.toLowerCase()}`}>{row.estado}</span>
            <span className="pill neutral">{row.moneda}</span>
            <span className="pill neutral">Creada: {new Date(row.created_at).toLocaleString()}</span>
            {validandoIA && (
              <span className="pill" style={{ background: '#fff3cd', color: '#856404' }}>
                Validando con IA...
              </span>
            )}
            {resultadoValidacion && (
              <span className={`pill ${
                resultadoValidacion.recomendacion === 'APROBAR' ? 'aprobada' :
                resultadoValidacion.recomendacion === 'RECHAZAR' ? 'rechazada' : 'evaluada'
              }`}>
                IA: {resultadoValidacion.recomendacion}
              </span>
            )}
          </div>
        </div>

        <div className="card">
          <h4>Datos del Cliente</h4>
          <div className="grid">
            <div><b>Nombre</b><div>{nombre || '—'}</div></div>
            <div><b>Usuario</b><div>{panel.usuario || row.cliente_info?.user_info?.username || '—'}</div></div>
            <div><b>Email</b><div>{email || '—'}</div></div>
            <div><b>Documento</b><div>{doc || '—'}</div></div>
            <div><b>Teléfono</b><div>{panel.telefono ?? row.cliente_info?.telefono ?? '—'}</div></div>
            <div><b>Dirección</b><div>{panel.direccion ?? row.cliente_info?.direccion ?? '—'}</div></div>
            <div><b>Ocupación</b><div>{panel.ocupacion ?? row.cliente_info?.ocupacion ?? '—'}</div></div>
            <div><b>Ingresos</b><div>
              {panel.ingresos != null
                ? Number(panel.ingresos).toLocaleString()
                : (row.cliente_info?.ingresos_mensuales != null
                    ? Number(row.cliente_info.ingresos_mensuales).toLocaleString()
                    : '—')}
            </div></div>
            <div><b>Puntaje</b><div>{panel.puntaje ?? row.cliente_info?.puntuacion_crediticia ?? '—'}</div></div>
            <div><b>Preferencial</b><div>{(panel.preferencial ?? row.cliente_info?.es_cliente_preferencial) ? 'Sí' : 'No'}</div></div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="card kpis">
          <div>
            <div className="k">Monto</div>
            <div className="v">{row.moneda} {Number(row.monto).toFixed(2)}</div>
          </div>
          <div>
            <div className="k">Plazo</div>
            <div className="v">{row.plazo_meses} meses</div>
          </div>
          <div>
            <div className="k">TNA</div>
            <div className="v">{row.tasa_nominal_anual}%</div>
          </div>
          {resultadoValidacion && (
            <div>
              <div className="k">Score IA</div>
              <div className="v" style={{ 
                color: resultadoValidacion.score_global >= 0.7 ? '#198754' : 
                       resultadoValidacion.score_global >= 0.5 ? '#ffc107' : '#dc3545'
              }}>
                {(resultadoValidacion.score_global * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* Panel de Validación Automática */}
        {validandoIA && (
          <div className="panel" style={{ background: '#fff3cd', border: '1px solid #ffeaa7' }}>
            <h4>🔄 Validación Automática en Progreso</h4>
            <p>Analizando documentos con IA... Esto puede tomar unos segundos.</p>
            <div style={{ height: '4px', background: '#e9ecef', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#0d6efd', width: '100%', animation: 'progress 2s ease-in-out infinite' }}></div>
            </div>
          </div>
        )}

        {/* Resultado de Validación IA */}
        {resultadoValidacion && resultadoValidacion.solicitud_id && (
          <div className="resultado-validacion" style={{ border:'1px solid #ccc', padding:'12px', borderRadius:'8px', marginTop:'12px' }}>
            <h3>📊 Resultado de Validación con IA</h3>
            <p><strong>Recomendación:</strong> {resultadoValidacion.recomendacion || 'No disponible'}</p>
            <p><strong>Score:</strong> {((resultadoValidacion.score_global || 0) * 100).toFixed(2)}%</p>
            <p><strong>Documentos procesados:</strong> {resultadoValidacion.documentos_procesados || 0}</p>
            {resultadoValidacion.factores_riesgo && resultadoValidacion.factores_riesgo.length > 0 && (
              <div>
                <strong>Factores de riesgo:</strong>
                <ul>
                  {resultadoValidacion.factores_riesgo.map((factor, index) => (
                    <li key={index}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}
            <p><strong>Estado:</strong> {resultadoValidacion.estado || 'No disponible'}</p>
          </div>
        )}

        {/* Acciones */}
        <div className="panel">
          <h4>Evaluar (CU13)</h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <button 
              onClick={ejecutarValidacionAutomatica} 
              disabled={validandoIA}
              style={{ 
                background: validandoIA ? '#6c757d' : '#0dcaf0',
                fontSize: '0.9em',
                padding: '6px 12px'
              }}
            >
              {validandoIA ? '🔄 Procesando...' : '🔍 Validar con IA'}
            </button>
            <span style={{ fontSize: '0.8em', color: '#6c757d' }}>
              {validandoIA ? 'Analizando documentos...' : 'Ejecutar validación automática'}
            </span>
          </div>
          <input 
            placeholder="score_riesgo (se completa automáticamente)" 
            value={score} 
            onChange={(e) => setScore(e.target.value)} 
          />
          <input 
            placeholder="observación (se completa automáticamente)" 
            value={obs} 
            onChange={(e) => setObs(e.target.value)} 
          />
          <button onClick={doEvaluar}>Guardar evaluación</button>
          {errEval && <pre className="err">{errEval}</pre>}
        </div>

        <div className="panel">
          <h4>Decidir (CU14)</h4>
          <button onClick={() => doDecidir('APROBAR')}>Aprobar</button>
          <button onClick={() => doDecidir('RECHAZAR')} style={{ background: '#dc3545' }}>Rechazar</button>
          {errDec && <pre className="err">{errDec}</pre>}
        </div>

        <div className="panel">
          <h4>Plan de pago (CU15)</h4>
          <Link className="btn" to={`/solicitudes/${id}/plan`}>Abrir plan</Link>
        </div>

        <div className="panel">
          <h4>Documentación (CU19/CU13)</h4>
          <Link className="btn" to={`/solicitudes/${id}/checklist`}>Abrir checklist</Link>
          {row.documentos && (
            <div style={{ fontSize: '0.9em', marginTop: '8px', color: '#6c757d' }}>
              {row.documentos.length} documento(s) adjunto(s)
            </div>
          )}
        </div>

        <div className="panel">
          <h4>Seguimiento (CU16)</h4>
          <Link className="btn" to={`/solicitudes/${id}/seguimiento`}>Ver seguimiento</Link>
        </div>
      </div>

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .wrap { display:grid; gap:16px; }
        .header { display:flex; gap:16px; align-items:flex-start; justify-content:space-between; }
        .mono { font-family: monospace; font-size: .9em; }
        .pills { display:flex; gap:6px; margin-top:6px; flex-wrap:wrap; }
        .pill { padding:4px 8px; border-radius:999px; font-size:.85em; }
        .pill.neutral { background:#eef1f4; color:#334155; }
        .pill.aprobada { background:#d1fae5; color:#065f46; }
        .pill.rechazada { background:#fee2e2; color:#991b1b; }
        .pill.evaluada { background:#fff7ed; color:#9a3412; }
        .pill.enviada { background:#e0e7ff; color:#3730a3; }
        .card { background:#fff; padding:16px; border-radius:12px; }
        .grid { 
          display:grid; 
          grid-template-columns:repeat(2, minmax(220px, 1fr)); 
          gap:12px 24px; 
        }
        .grid > div > div {
          min-width: 0;
          overflow-wrap: anywhere;
          word-break: break-word;
          line-height: 1.25;
        }
        .grid b { display:block; color:#64748b; font-weight:600; font-size:.85rem; }
        .section { display:grid; gap:12px; }
        .panel { background:#fff; padding:12px; border-radius:8px; display:grid; gap:8px; }
        .panel input { padding:8px; border:1px solid #ddd; border-radius:6px; }
        .panel button { background:#0d6efd; color:#fff; border:none; border-radius:6px; padding:8px 10px; }
        .btn { background:#198754;color:#fff;padding:8px 12px;border-radius:6px;text-decoration:none; }
        .err { color:crimson; white-space:pre-wrap; }
        .kpis { display:grid; grid-template-columns: repeat(3, minmax(160px, 1fr)); gap:12px; }
        .k { color:#64748b; font-size:.85rem; }
        .v { font-size:1.15rem; font-weight:700; }
        @media (max-width: 900px) {
          .header { flex-direction:column; }
          .grid { grid-template-columns: 1fr; }
          .kpis { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
