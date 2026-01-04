const express = require('express');
const cors = require('cors');
require('dotenv').config();
const detectionService = require('./src/services/detectionService');

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint Principal de Búsqueda
app.post('/api/v1/search', async (req, res) => {
    const { searchTerm } = req.body;
    if (!searchTerm) return res.status(400).json({ error: 'Falta término de búsqueda' });

    try {
        const result = await detectionService.processSearch(searchTerm);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error en el flujo:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 ElimFilters Server v8.0 en puerto ${PORT}`));
