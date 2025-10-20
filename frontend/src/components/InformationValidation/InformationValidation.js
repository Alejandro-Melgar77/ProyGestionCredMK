import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../config/axios';
import './InformationValidation.css';

import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';

import { CheckCircle, Warning, Error, PlayArrow, Refresh, Visibility } from '@mui/icons-material';

const InformationValidation = () => {
  const { solicitudId } = useParams();

  const [validacionData, setValidacionData] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');

  const cargarResultadoValidacion = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/validacion/resultado/${solicitudId}/`);
      setValidacionData(response.data);
    } catch (err) {
      console.error('Error cargando validación:', err);
      setError('No se pudo cargar la validación');
    } finally {
      setLoading(false);
    }
  };

  const iniciarValidacion = async (usarIA = true) => {
    setProcessing(true);
    setError('');
    try {
      const response = await axios.post('/validacion/iniciar/', {
        solicitud_id: solicitudId,
        usar_ia: usarIA,
      });
      setResultado(response.data);
      setDialogOpen(true);
      await cargarResultadoValidacion();
    } catch (err) {
      console.error('Error iniciando validación:', err);
      setError('Error al iniciar la validación');
    } finally {
      setProcessing(false);
    }
  };

  const validarDocumentoManual = async (documentoId, estado, observaciones = '') => {
    try {
      await axios.post('/validacion/manual/', {
        documento_id: documentoId,
        estado,
        observaciones,
        score_confianza: estado === 'VALIDADO' ? 0.9 : 0.3,
      });
      await cargarResultadoValidacion();
    } catch (err) {
      console.error('Error validando documento:', err);
      setError('No se pudo validar el documento');
    }
  };

  useEffect(() => {
    cargarResultadoValidacion();
  }, [solicitudId]);

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'VALIDADO': return 'success';
      case 'OBSERVADO': return 'warning';
      case 'RECHAZADO': return 'error';
      default: return 'default';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'VALIDADO': return <CheckCircle />;
      case 'OBSERVADO': return <Warning />;
      case 'RECHAZADO': return <Error />;
      default: return <Visibility />;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.5) return 'warning';
    return 'error';
  };

  const getRecomendacionColor = (recomendacion) => {
    switch (recomendacion) {
      case 'APROBAR': return 'success';
      case 'REVISAR_MANUAL': return 'warning';
      case 'RECHAZAR': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <LinearProgress style={{ width: '100%' }} />
      </Box>
    );
  }

  return (
    <div className="information-validation-container">
      <h2>Validación de Información - CU13</h2>
      {error && <div className="error-message">{error}</div>}

      <Card className="control-card">
        <CardContent>
          <Grid container spacing={2} className="control-grid">
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => iniciarValidacion(true)}
                disabled={processing}
                startIcon={processing ? <Refresh /> : <PlayArrow />}
              >
                {processing ? 'Procesando...' : 'Validación Automática con IA'}
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                color="secondary"
                fullWidth
                onClick={() => iniciarValidacion(false)}
                disabled={processing}
                startIcon={<CheckCircle />}
              >
                Validación Manual
              </Button>
            </Grid>
          </Grid>

          {processing && (
            <Box className="processing-box">
              <LinearProgress />
              <Typography align="center">Procesando documentos con IA...</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {validacionData && (
        <Grid container spacing={3}>
          {/* Análisis IA */}
          {validacionData.analisis_ia && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">Análisis de Inteligencia Artificial</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2">Score Global</Typography>
                      <Chip
                        label={`${(validacionData.analisis_ia.score_global * 100).toFixed(1)}%`}
                        color={getScoreColor(validacionData.analisis_ia.score_global)}
                        variant="outlined"
                        size="medium"
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2">Recomendación</Typography>
                      <Chip
                        label={validacionData.analisis_ia.recomendacion}
                        color={getRecomendacionColor(validacionData.analisis_ia.recomendacion)}
                        size="medium"
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2">Confianza Modelo</Typography>
                      <Typography variant="h6" color="primary">
                        {(validacionData.analisis_ia.confianza_modelo * 100).toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2">Factores de Riesgo</Typography>
                      <Typography variant="h6" color={validacionData.analisis_ia.factores_riesgo.length > 0 ? 'error' : 'success'}>
                        {validacionData.analisis_ia.factores_riesgo.length}
                      </Typography>
                    </Grid>
                  </Grid>
                  {validacionData.analisis_ia.factores_riesgo.length > 0 && (
                    <Box className="riesgo-list">
                      {validacionData.analisis_ia.factores_riesgo.map((factor, idx) => (
                        <Alert key={idx} severity="warning">{factor}</Alert>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Tabla Documentos */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6">Documentos Validados</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Score Confianza</TableCell>
                        <TableCell>Observaciones</TableCell>
                        <TableCell>Validado por</TableCell>
                        <TableCell>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {validacionData.documentos.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>{doc.documento_info?.tipo}</TableCell>
                          <TableCell>
                            <Chip
                              label={doc.estado}
                              color={getEstadoColor(doc.estado)}
                              icon={getEstadoIcon(doc.estado)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${((doc.score_confianza || 0) * 100).toFixed(1)}%`}
                              color={getScoreColor(doc.score_confianza || 0)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{doc.observaciones || '-'}</TableCell>
                          <TableCell>{doc.validado_por_nombre || 'Sistema'}</TableCell>
                          <TableCell>
                            <Tooltip title="Ver">
                              <IconButton size="small"><Visibility /></IconButton>
                            </Tooltip>
                            <Tooltip title="Validar">
                              <IconButton size="small" color="success" onClick={() => validarDocumentoManual(doc.documento_info.id, 'VALIDADO')}><CheckCircle /></IconButton>
                            </Tooltip>
                            <Tooltip title="Observar">
                              <IconButton size="small" color="warning" onClick={() => validarDocumentoManual(doc.documento_info.id, 'OBSERVADO', 'Revisión manual')}><Warning /></IconButton>
                            </Tooltip>
                            <Tooltip title="Rechazar">
                              <IconButton size="small" color="error" onClick={() => validarDocumentoManual(doc.documento_info.id, 'RECHAZADO')}><Error /></IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Dialog Resultado */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Resultado de Validación</DialogTitle>
        <DialogContent>
          {resultado && (
            <Box>
              <Typography><strong>Solicitud:</strong> {resultado.solicitud_id}</Typography>
              <Typography><strong>Estado:</strong> {resultado.estado}</Typography>
              <Typography><strong>Documentos procesados:</strong> {resultado.documentos_procesados}</Typography>
              {resultado.score_global && (
                <Box className="dialog-score">
                  <Typography variant="h6">Score Global: {(resultado.score_global * 100).toFixed(1)}%</Typography>
                  <Typography><strong>Recomendación:</strong> {resultado.recomendacion}</Typography>
                  {resultado.factores_riesgo && resultado.factores_riesgo.length > 0 && (
                    <Box>
                      <Typography>Factores de Riesgo:</Typography>
                      <ul>
                        {resultado.factores_riesgo.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} variant="contained">Cerrar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default InformationValidation;
