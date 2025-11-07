import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Download as DownloadIcon } from "@mui/icons-material";
import api from "../../config/axios";

const BitacoraPage = () => {
  const [bitacora, setBitacora] = useState([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    const fetchBitacora = async () => {
      try {
        const response = await api.get("/api/bitacora/");
        setBitacora(response.data.results || response.data);
      } catch (error) {
        console.error("Error al cargar bitácora:", error);
      }
    };
    fetchBitacora();
  }, []);

  const exportarPDF = () => {
    const url = `http://localhost:8000/api/bitacora/reporte/?desde=${desde}&hasta=${hasta}`;
    window.open(url, "_blank");
  };

  return (
    <Box sx={{ p: 4, backgroundColor: "#f5f6fa", minHeight: "100vh" }}>
      <Typography
        variant="h5"
        fontWeight="bold"
        align="center"
        sx={{ mb: 3, color: "#1a237e" }}
      >
        Registro de Bitácora
      </Typography>

      {/* Controles de filtro */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          backgroundColor: "#ffffff",
          borderRadius: 2,
        }}
      >
        <TextField
          label="Desde"
          type="date"
          size="small"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Hasta"
          type="date"
          size="small"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={exportarPDF}
          sx={{
            backgroundColor: "#1a237e",
            "&:hover": { backgroundColor: "#0d164c" },
            borderRadius: 2,
            px: 3,
          }}
        >
          Exportar PDF
        </Button>
      </Paper>

      {/* Tabla de bitácora */}
      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: "#1a237e" }}>
            <TableRow>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                #
              </TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                Usuario
              </TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                Acción
              </TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                Ruta
              </TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                Método
              </TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                IP
              </TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                Estado
              </TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                Fecha
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bitacora.map((log, index) => (
              <TableRow
                key={index}
                sx={{
                  "&:nth-of-type(odd)": { backgroundColor: "#f9f9f9" },
                  "&:hover": { backgroundColor: "#e8eaf6" },
                }}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell>{log.usuario || "Sistema"}</TableCell>
                <TableCell>{log.accion}</TableCell>
                <TableCell>{log.ruta}</TableCell>
                <TableCell>{log.metodo}</TableCell>
                <TableCell>{log.ip}</TableCell>
                <TableCell>{log.estado_http}</TableCell>
                <TableCell>
                  {new Date(log.creado_en).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default BitacoraPage;
