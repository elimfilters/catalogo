const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importamos el cerebro del sistema
const detectionService = require('./src/services/detectionService');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/v1/search', async (req, res) => {
    const { searchTerm } = req.body;
    
    if (!searchTerm) return res.status(400).json({ error: "Search term is required" });

    try {
        // El servicio de detección maneja: Sheets -> GROQ -> Scrapers -> SKU -> Save
        const result = await detectionService.processSearch(searchTerm);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error("Critical Error:", error.message);
        res.status(500).json({ success: false, error: "Error procesando la solicitud" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 ElimFilters Pro v8.0 en puerto ${PORT}`));
