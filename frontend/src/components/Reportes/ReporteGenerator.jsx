import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box, Paper, Typography, Grid, TextField, Button, FormControl,
    InputLabel, Select, MenuItem, Card, CardContent, Switch, FormControlLabel,
    Slider, Alert, CircularProgress
} from '@mui/material';

import { PlayArrow, Download, SettingsVoice } from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const ReporteGenerator = () => {
    const [filtros, setFiltros] = useState({
        tipo_reporte: 'creditos',
        fecha_inicio: '',
        fecha_fin: '',
        estado: '',
        tipo_producto: '',
        formato: 'pdf'
    });

    const [productos, setProductos] = useState([]);

    const [configuracion, setConfiguracion] = useState({
        voz_activa: false,
        tipo_voz: 'es-ES-Standard-A',
        velocidad_voz: 1,
        formato_predeterminado: 'pdf'
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sintetizando, setSintetizando] = useState(false);

    // ⚡ Traer productos desde el backend al cargar
    useEffect(() => {
        const fetchProductos = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/productos/listar_nombres/`);
                setProductos(res.data);
            } catch (err) {
                console.error('Error cargando productos', err);
            }
        };
        fetchProductos();
    }, []);

    const handleFiltroChange = (event) => {
        const { name, value } = event.target;
        setFiltros(prev => ({ ...prev, [name]: value }));
    };

    const generarReporte = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/reportes/generar_reporte/`,
                filtros,
                { responseType: 'blob' }
            );

            // ⚡ Crear blob con el tipo correcto
            const blob = new Blob([response.data], { type: response.data.type || response.headers['content-type'] });

            // ⚡ Extraer filename
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'reporte';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) filename = filenameMatch[1];
            } else {
                // Si no hay filename, asignar extensión según content-type
                const ct = response.headers['content-type'];
                if (ct.includes('excel')) filename += '.xlsx';
                else if (ct.includes('pdf')) filename += '.pdf';
                else if (ct.includes('text')) filename += '.txt';
            }

            // ⚡ Descargar archivo
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            setError('Error al generar el reporte: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const sintetizarVoz = async () => {
        if (!('speechSynthesis' in window)) {
            setError('Tu navegador no soporta síntesis de voz');
            return;
        }
        setSintetizando(true);
        setError('');
        try {
            const speech = new SpeechSynthesisUtterance();
            speech.text = `Reporte de ${filtros.tipo_reporte} generado con los filtros seleccionados. Fecha inicio: ${filtros.fecha_inicio || 'todas'}, fecha fin: ${filtros.fecha_fin || 'todas'}`;
            speech.lang = 'es-ES';
            speech.rate = configuracion.velocidad_voz;

            const voces = window.speechSynthesis.getVoices();
            const vozSeleccionada = voces.find(voz => voz.name === configuracion.tipo_voz);
            if (vozSeleccionada) speech.voice = vozSeleccionada;

            window.speechSynthesis.speak(speech);
            speech.onend = () => setSintetizando(false);
            speech.onerror = () => { setError('Error en la síntesis de voz'); setSintetizando(false); };

        } catch (error) {
            setError('Error al sintetizar voz: ' + error.message);
            setSintetizando(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>Generador de Reportes</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Filtros del Reporte</Typography>
                        <Grid container spacing={2}>
                            {/* Tipo de Reporte */}
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Tipo de Reporte</InputLabel>
                                    <Select name="tipo_reporte" value={filtros.tipo_reporte} onChange={handleFiltroChange}>
                                        <MenuItem value="creditos">Créditos</MenuItem>
                                        <MenuItem value="clientes">Clientes</MenuItem>
                                        <MenuItem value="pagos">Pagos</MenuItem>
                                        <MenuItem value="riesgo">Riesgo</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            {/* Formato */}
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Formato</InputLabel>
                                    <Select name="formato" value={filtros.formato} onChange={handleFiltroChange}>
                                        <MenuItem value="pdf">PDF</MenuItem>
                                        <MenuItem value="excel">Excel</MenuItem>
                                        <MenuItem value="texto">Texto</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            {/* Fecha Inicio */}
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth type="date" label="Fecha Inicio" name="fecha_inicio" value={filtros.fecha_inicio} onChange={handleFiltroChange} InputLabelProps={{ shrink: true }} />
                            </Grid>

                            {/* Fecha Fin */}
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth type="date" label="Fecha Fin" name="fecha_fin" value={filtros.fecha_fin} onChange={handleFiltroChange} InputLabelProps={{ shrink: true }} />
                            </Grid>

                            {/* Estado */}
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Estado</InputLabel>
                                    <Select name="estado" value={filtros.estado} onChange={handleFiltroChange}>
                                        <MenuItem value="">Todos</MenuItem>
                                        <MenuItem value="EXITOSO">Aprobado</MenuItem>
                                        <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                                        <MenuItem value="RECHAZADO">Rechazado</MenuItem>
                                        <MenuItem value="DESEMBOLSADO">Desembolsado</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            {/* Tipo de Producto */}
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Tipo de Producto</InputLabel>
                                    <Select name="tipo_producto" value={filtros.tipo_producto} onChange={handleFiltroChange}>
                                        <MenuItem value="">Todos</MenuItem>
                                        {productos.map(p => (
                                            <MenuItem key={p.id} value={p.nombre}>{p.nombre}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                            <Button variant="contained" startIcon={loading ? <CircularProgress size={20}/> : <Download />} onClick={generarReporte} disabled={loading}>
                                {loading ? 'Generando...' : 'Generar Reporte'}
                            </Button>
                            <Button variant="outlined" startIcon={sintetizando ? <CircularProgress size={20}/> : <PlayArrow />} onClick={sintetizarVoz} disabled={sintetizando || !configuracion.voz_activa}>
                                {sintetizando ? 'Sintetizando...' : 'Escuchar Reporte'}
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom><SettingsVoice sx={{ mr: 1 }}/>Configuración de Voz</Typography>
                            <FormControlLabel control={<Switch checked={configuracion.voz_activa} onChange={e => setConfiguracion({...configuracion, voz_activa: e.target.checked})} />} label="Voz Activa" />
                            {configuracion.voz_activa && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography gutterBottom>Velocidad de Voz: {configuracion.velocidad_voz}</Typography>
                                    <Slider value={configuracion.velocidad_voz} onChange={(_, v) => setConfiguracion({...configuracion, velocidad_voz: v})} min={0.5} max={2} step={0.1} valueLabelDisplay="auto" />
                                    <FormControl fullWidth sx={{ mt: 2 }}>
                                        <InputLabel>Tipo de Voz</InputLabel>
                                        <Select value={configuracion.tipo_voz} onChange={e => setConfiguracion({...configuracion, tipo_voz: e.target.value})}>
                                            <MenuItem value="es-ES-Standard-A">Voz Femenina (ES)</MenuItem>
                                            <MenuItem value="es-ES-Standard-B">Voz Masculina (ES)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ReporteGenerator;
