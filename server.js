require('dotenv').config(); // Carga las variables de entorno (.env)
const express = require('express');
const cors = require('cors');
const { mapToHorizontalRow } = require('./services/dataMapper');

const app = express();

// 1. Configuración de CORS con Variable de Entorno 🛡️
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'https://elimfilters.com', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

/**
 * ENDPOINT: /api/v1/search
 * Este es el que definimos en el archivo elimfilters-search.php
 */
app.post('/api/v1/search', async (req, res) => {
    try {
        // Recibimos 'type' (PART, VIN o EQUIPMENT) y 'value' desde el JS
        const { type, value } = req.body;

        if (!type || !value) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing type or search value" 
            });
        }

        // 2. Lógica de Inteligencia de Prefijos
        // Aquí simulamos la detección que haría tu base de datos o IA
        let aiData = {
            search_type: type,
            base_numeric_code: "8425", // Ejemplo
            is_cartridge: false,
            duty: "HD", // Por defecto Heavy Duty para este ejemplo
            iso_norm: "ISO 9001:2015",
            prefix: "EL8" // Prefijo por defecto si es PART
        };

        // 3. Aplicación de Reglas SISTEMGUARD™
        // Si la pestaña es VIN o EQUIPMENT, el dataMapper forzará EK5/EK3
        const resultRow = mapToHorizontalRow(aiData, value);

        // 4. Respuesta exitosa para el Plugin de WP
        res.json({
            success: true,
            data: resultRow
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error during search" 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ELIMFILTERS API Running on port ${PORT}`);
    console.log(`🔐 CORS allowed for: ${process.env.FRONTEND_URL || 'https://elimfilters.com'}`);
});
