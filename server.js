const express = require('express');
const cors = require('cors');
require('dotenv').config();
const detectionService = require('./src/services/detectionService');

const app = express();

// CORRECCIÓN DE SEGURIDAD: Permite peticiones desde tu dominio de GoDaddy
app.use(cors({
    origin: ['https://elimfilters.com', 'https://www.elimfilters.com'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// RUTA DE BÚSQUEDA: Coincide con efData.apiUrl de WordPress
app.post('/api/search', async (req, res) => {
    const { searchTerm, type } = req.body;
    console.log(`🔍 Búsqueda recibida: [${type}] ${searchTerm}`);

    if (!searchTerm) {
        return res.status(400).json({ success: false, message: 'Término de búsqueda requerido' });
    }

    try {
        const result = await detectionService.processSearch(searchTerm, type);
        if (result) {
            res.json({ success: true, data: result });
        } else {
            res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }
    } catch (error) {
        console.error('❌ Error en el flujo:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 ElimFilters Server v8.5 activo en puerto ${PORT}`));
