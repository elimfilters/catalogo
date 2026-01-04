require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
// Llamamos al mapper directamente en la misma carpeta
const { mapToHorizontalRow } = require('./dataMapper'); 

const app = express();

// Configuración de CORS con tu variable de entorno
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'https://elimfilters.com', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.use(express.json());

/**
 * ENDPOINT PRINCIPAL - VERSIÓN 1
 * Recibe peticiones de las 3 tabs: PART, VIN y EQUIPMENT
 */
app.post('/api/v1/search', async (req, res) => {
    try {
        const { type, value } = req.body;

        if (!type || !value) {
            return res.status(400).json({ success: false, message: "Missing search data" });
        }

        // Lógica de detección (Simulada para la prueba)
        // La IA detecta si el equipo/VIN es Heavy Duty (HD) o Light Duty (LD)
        let aiData = {
            search_type: type,
            base_numeric_code: "8000", // Código base generado
            is_cartridge: false,
            duty: "HD", // Por defecto HD para activar SISTEMGUARD™ EK5
            iso_norm: "ISO 9001:2015",
            prefix: "EL8" 
        };

        // Generamos la fila de 56 columnas usando el mapper
        const resultRow = mapToHorizontalRow(aiData, value);

        res.json({
            success: true,
            data: resultRow
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

/**
 * ENDPOINT ALTERNATIVO - SIN VERSIÓN (Para compatibilidad con plugin)
 * Hace lo mismo que /api/v1/search
 */
app.post('/api/search', async (req, res) => {
    try {
        const { type, value } = req.body;

        if (!type || !value) {
            return res.status(400).json({ success: false, message: "Missing search data" });
        }

        // Lógica de detección (Simulada para la prueba)
        let aiData = {
            search_type: type,
            base_numeric_code: "8000",
            is_cartridge: false,
            duty: "HD",
            iso_norm: "ISO 9001:2015",
            prefix: "EL8" 
        };

        // Generamos la fila de 56 columnas usando el mapper
        const resultRow = mapToHorizontalRow(aiData, value);

        res.json({
            success: true,
            data: resultRow
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server ready on port ${PORT}`);
});
