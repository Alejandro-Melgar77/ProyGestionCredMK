// src/pages/bitacora/BitacoraPage.jsx
import React, { useEffect, useState } from "react";
import api from "../../config/axios";

export default function BitacoraPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get("/api/bitacora/bitacora/");
        if (Array.isArray(res.data)) {
          setLogs(res.data);
        } else {
          setError("Respuesta inesperada del servidor.");
          console.warn("Respuesta inesperada:", res.data);
        }
      } catch (err) {
        console.error("Error al cargar bitácora:", err);
        setError("No se pudo obtener la bitácora. Verifique su autenticación.");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) return <p className="p-4 text-center">Cargando bitácora...</p>;
  if (error)
    return (
      <p className="p-4 text-center text-red-600 font-semibold">{error}</p>
    );

  return (
    <div className="p-6 min-h-screen bg-gray-50 flex flex-col items-center">
      <div className="w-full max-w-7xl bg-white shadow-md rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Registro de Bitácora
        </h2>

        {logs.length === 0 ? (
          <p className="text-center text-gray-500">No hay registros aún.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-100 text-gray-700 font-semibold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Usuario</th>
                  <th className="p-3">Acción</th>
                  <th className="p-3">Ruta</th>
                  <th className="p-3">Método</th>
                  <th className="p-3">IP</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, index) => (
                  <tr
                    key={l.id}
                    className={`${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-blue-50 transition-colors`}
                  >
                    <td className="p-3 text-gray-600">{index + 1}</td>

                    {/* 👇 Ajuste: si no hay usuario, muestra 'Sistema' */}
                    <td className="p-3 font-medium text-gray-800">
                      {l.usuario && l.usuario.trim() !== ""
                        ? l.usuario
                        : "Sistema"}
                    </td>

                    <td className="p-3 text-gray-700">{l.accion}</td>
                    <td className="p-3 text-gray-600 truncate max-w-[200px]">
                      {l.ruta}
                    </td>
                    <td className="p-3 text-gray-700">{l.metodo}</td>
                    <td className="p-3 text-gray-600">{l.ip}</td>

                    <td
                      className={`p-3 font-semibold ${
                        l.estado_http >= 400
                          ? "text-red-500"
                          : l.estado_http >= 300
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {l.estado_http}
                    </td>

                    <td className="p-3 text-gray-700">
                      {new Date(l.creado_en).toLocaleString()}
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
}
