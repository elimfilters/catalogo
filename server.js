const express = require('express');
const cors = require('cors');
require('dotenv').config();
const detectionService = require('./src/services/detectionService');

const app = express();

// Seguridad CORS: Permite que solo tu web acceda a los datos
app.use(cors({
    origin: ['https://elimfilters.com', 'https://www.elimfilters.com'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Endpoint de búsqueda: Sincronizado con el plugin de WordPress
app.post('/api/search', async (req, res) => {
    const { searchTerm, type } = req.body;
    console.log(`🔍 Petición: ${type} -> ${searchTerm}`);

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
        console.error('❌ Error en Railway:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor ElimFilters v8.5 activo en puerto ${PORT}`));
