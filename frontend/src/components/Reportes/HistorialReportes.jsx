import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip
} from '@mui/material';
import { Download, Delete } from '@mui/icons-material';

const HistorialReportes = () => {
    const [reportes, setReportes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarReportes();
    }, []);

    const cargarReportes = async () => {
        try {
            const response = await axios.get('/api/reportes/');
            setReportes(response.data);
        } catch (error) {
            console.error('Error cargando reportes:', error);
        } finally {
            setLoading(false);
        }
    };

    const descargarReporte = async (reporteId) => {
        try {
            const response = await axios.get(`/api/reportes/${reporteId}/`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_${reporteId}.${response.data.formato}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error descargando reporte:', error);
        }
    };

    const getColorFormato = (formato) => {
        const colores = {
            pdf: 'error',
            excel: 'success',
            texto: 'info'
        };
        return colores[formato] || 'default';
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Historial de Reportes
            </Typography>
            
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nombre</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Formato</TableCell>
                            <TableCell>Fecha</TableCell>
                            <TableCell>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {reportes.map((reporte) => (
                            <TableRow key={reporte.id}>
                                <TableCell>{reporte.nombre}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={reporte.tipo_reporte} 
                                        size="small" 
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip 
                                        label={reporte.formato.toUpperCase()} 
                                        color={getColorFormato(reporte.formato)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    {new Date(reporte.fecha_generacion).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                    <IconButton 
                                        onClick={() => descargarReporte(reporte.id)}
                                        color="primary"
                                    >
                                        <Download />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default HistorialReportes;