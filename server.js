const express = require('express');
const cors = require('cors');
require('dotenv').config();
const detectionService = require('./src/services/detectionService');

const app = express();

// CORRECCIÓN CORS: Permite que elimfilters.com lea los datos sin bloqueos
app.use(cors({
    origin: ['https://elimfilters.com', 'https://www.elimfilters.com'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// RUTA DE BÚSQUEDA: Sincronizada con el plugin de WordPress
app.post('/api/search', async (req, res) => {
    const { searchTerm, type } = req.body;
    console.log(`🔍 Búsqueda: [${type}] ${searchTerm}`);

    if (!searchTerm) return res.status(400).json({ success: false, error: 'Término requerido' });

    try {
        const result = await detectionService.processSearch(searchTerm, type);
        if (result) {
            res.json({ success: true, data: result });
        } else {
            res.status(404).json({ success: false, error: 'Producto no encontrado' });
        }
    } catch (error) {
        console.error('❌ Error en el servidor Railway:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 ElimFilters Server v8.5 activo en puerto ${PORT}`));
