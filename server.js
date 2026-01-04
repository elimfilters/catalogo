const express = require('express');
const cors = require('cors');
const { mapToHorizontalRow } = require('./services/dataMapper');
// Importamos tus motores de IA o Base de Datos
// const aiEngine = require('./services/aiEngine'); 

const app = express();
app.use(cors());
app.use(express.json());

/**
 * ENDPOINT PRINCIPAL: Maneja Part Number, VIN y Equipment
 */
app.post('/api/v1/search', async (req, res) => {
    try {
        const { type, value, brand, model, year } = req.body;

        if (!type || (!value && !model)) {
            return res.status(400).json({ error: "Missing search parameters" });
        }

        // 1. SIMULACIÓN DE ANÁLISIS TÉCNICO (Aquí llamamos a tu IA o DB)
        // En producción, aquí obtendrás los datos reales del "fierro"
        let aiAnalysis = {
            search_type: type, // PART, VIN o EQUIPMENT
            prefix: "EL8",     // Ejemplo detectado
            base_numeric_code: "0425", 
            is_cartridge: false,
            duty: "HD",        // Detectado por el modelo o código
            iso_norm: "ISO 4548-12"
        };

        // 2. Lógica específica por Pestaña
        if (type === 'VIN' || type === 'EQUIPMENT') {
            // Si es Kit, el duty define si es EK5 (HD) o EK3 (LD)
            // Aquí la IA debería decirnos el código base del Kit
            aiAnalysis.base_numeric_code = "8000"; // Ejemplo de código de Kit
        }

        // 3. MAPEO A FILA HORIZONTAL DE 56 COLUMNAS
        // Pasamos el análisis y el valor original de búsqueda
        const finalRow = mapToHorizontalRow(aiAnalysis, value || `${brand} ${model}`);

        // 4. RESPUESTA AL PLUGIN DE WP
        res.json({
            success: true,
            type: type,
            data: finalRow
        });

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ELIMFILTERS® API running on port ${PORT}`);
});
