import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
    Box,
    Paper,
    Typography,
    Button,
    Card,
    CardContent,
    Grid,
    Chip,
    Alert,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    Divider
} from '@mui/material';
import {
    Mic,
    Stop,
    Download,
    PlayArrow,
    SettingsVoice
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const VoiceReportGenerator = () => {
    const [grabando, setGrabando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [transcripcion, setTranscripcion] = useState('');
    const [filtrosDetectados, setFiltrosDetectados] = useState({});
    const [reporteGenerado, setReporteGenerado] = useState(null);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const iniciarGrabacion = async () => {
        setError('');
        setInfo('');
        setTranscripcion('');
        setFiltrosDetectados({});
        setReporteGenerado(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 44100,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = procesarAudio;

            mediaRecorder.start(1000);
            setGrabando(true);
            setInfo('Grabando... Habla ahora. Di algo como: "Generar reporte de créditos de esta semana en Excel"');

        } catch (err) {
            setError('No se pudo acceder al micrófono: ' + err.message);
        }
    };

    const detenerGrabacion = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setGrabando(false);
            setInfo('Procesando tu comando de voz...');
        }
    };

    const procesarAudio = async () => {
        setProcesando(true);

        try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'comando_voz.webm');

            const response = await axios.post(`${API_BASE_URL}/api/reportes/procesar_comando_voz/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            // ⚡ Convertir la cabecera a JSON y asegurar objetos válidos
            const responseData = JSON.parse(response.headers['x-response-data'] || '{}');

            setTranscripcion(responseData.transcribed_text || '');
            setFiltrosDetectados(responseData.filters || {});  // ⚡ Siempre un objeto

            const url = window.URL.createObjectURL(response.data);
            setReporteGenerado({
                url: url,
                filename: responseData.filename,
                reporteId: responseData.reporte_id
            });

            setInfo('Reporte generado exitosamente. Puedes descargarlo ahora.');

        } catch (err) {
            const errorMessage = err.response?.data?.error ||
                                 err.response?.data?.detail ||
                                 'Error al procesar el comando de voz';
            setError(errorMessage);
        } finally {
            setProcesando(false);
        }
    };

    const descargarReporte = () => {
        if (reporteGenerado) {
            const link = document.createElement('a');
            link.href = reporteGenerado.url;
            link.download = reporteGenerado.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const reproducirEjemplos = () => {
        const ejemplos = [
            "Generar reporte de créditos aprobados este mes en Excel",
            "Quiero un reporte de pagos de la última semana en PDF",
            "Mostrar reporte de clientes nuevos de este año",
            "Generar reporte de riesgo de créditos pendientes"
        ];

        const utterance = new SpeechSynthesisUtterance();
        utterance.text = "Puedes decir cosas como: " + ejemplos.join('. O: ');
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;

        window.speechSynthesis.speak(utterance);
    };

    const formatearFiltro = (key, value) => {
        const traducciones = {
            'tipo_reporte': 'Tipo de Reporte',
            'fecha_inicio': 'Fecha Inicio',
            'fecha_fin': 'Fecha Fin',
            'estado': 'Estado',
            'tipo_producto': 'Producto',
            'formato': 'Formato'
        };

        const valoresTraducidos = {
            'creditos': 'Créditos',
            'clientes': 'Clientes',
            'pagos': 'Pagos',
            'riesgo': 'Riesgo',
            'aprobado': 'Aprobado',
            'rechazado': 'Rechazado',
            'pendiente': 'Pendiente',
            'desembolsado': 'Desembolsado',
            'consumo': 'Consumo',
            'vivienda': 'Vivienda',
            'pyme': 'PYME',
            'vehiculo': 'Vehículo',
            'pdf': 'PDF',
            'excel': 'Excel',
            'texto': 'Texto'
        };

        const label = traducciones[key] || key;
        const valor = valoresTraducidos[value] || value || 'No especificado';

        return { label, valor };
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
                <SettingsVoice sx={{ mr: 2, verticalAlign: 'middle' }} />
                Reportes por Voz
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="h6" gutterBottom>
                            Comando de Voz
                        </Typography>

                        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                            Haz clic en grabar y di lo que quieres en el reporte. 
                        </Typography>

                        <Box sx={{ mb: 2 }}>
                            {!grabando ? (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<Mic />}
                                    onClick={iniciarGrabacion}
                                    disabled={procesando}
                                    size="large"
                                >
                                    Iniciar Grabación
                                </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    startIcon={<Stop />}
                                    onClick={detenerGrabacion}
                                    size="large"
                                >
                                    Detener Grabación
                                </Button>
                            )}
                        </Box>

                        <Button
                            variant="outlined"
                            startIcon={<PlayArrow />}
                            onClick={reproducirEjemplos}
                            sx={{ mt: 1 }}
                        >
                            Escuchar Ejemplos
                        </Button>

                        {procesando && (
                            <Box sx={{ mt: 2 }}>
                                <CircularProgress />
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    Procesando tu voz...
                                </Typography>
                            </Box>
                        )}
                    </Paper>

                    {transcripcion && (
                        <Card sx={{ mt: 2 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Transcripción
                                </Typography>
                                <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                                    "{transcripcion}"
                                </Typography>
                            </CardContent>
                        </Card>
                    )}
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Resultado
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        {info && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                {info}
                            </Alert>
                        )}

                        {filtrosDetectados && Object.keys(filtrosDetectados).length > 0 && (
                            <Card sx={{ mb: 2 }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Filtros Detectados
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {Object.entries(filtrosDetectados).map(([key, value]) => {
                                            if (!value) return null;
                                            const { label, valor } = formatearFiltro(key, value);
                                            return (
                                                <Chip
                                                    key={key}
                                                    label={`${label}: ${valor}`}
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            );
                                        })}
                                    </Box>
                                </CardContent>
                            </Card>
                        )}

                        {reporteGenerado && (
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Reporte Listo
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 2 }}>
                                        Tu reporte ha sido generado con los filtros detectados.
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<Download />}
                                        onClick={descargarReporte}
                                        size="large"
                                    >
                                        Descargar Reporte
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        <Card sx={{ mt: 2 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Ejemplos de Comandos
                                </Typography>
                                <List dense>
                                    <ListItem>
                                        <ListItemText primary="• Generar reporte de créditos aprobados este mes" />
                                    </ListItem>
                                    <Divider />
                                    <ListItem>
                                        <ListItemText primary="• Reporte de pagos de la última semana en Excel" />
                                    </ListItem>
                                    <Divider />
                                    <ListItem>
                                        <ListItemText primary="• Mostrar clientes nuevos del último año" />
                                    </ListItem>
                                    <Divider />
                                    <ListItem>
                                        <ListItemText primary="• Créditos rechazados en formato PDF" />
                                    </ListItem>
                                </List>
                            </CardContent>
                        </Card>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default VoiceReportGenerator;
