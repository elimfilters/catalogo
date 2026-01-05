const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const detectionService = require('./src/services/detectionService');
const kitsService = require('./src/services/kitsService');

const app = express();
app.use(cors());
app.use(express.json());

// 1. CONEXIÓN A MONGODB (Elliot2025)
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://elimfilters:Elliot2025@cluster0.vairwow.mongodb.net/elimfilters';
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ ELIMFILTERS®: MongoDB Cluster0 Conectado"))
    .catch(err => console.error("❌ Error en conexión Mongo:", err));

// 2. ENDPOINT: Búsqueda de Filtros Individuales (v1/search)
app.post('/api/v1/search', async (req, res) => {
    const { searchTerm, manufacturer } = req.body;
    try {
        const results = await detectionService.findAndProcess(searchTerm, manufacturer);
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. ENDPOINT: Búsqueda de Kits de Mantenimiento (v1/kits)
app.post('/api/v1/kits', async (req, res) => {
    const { searchTerm, type } = req.body; // type: 'VIN' o 'Equipment'
    try {
        const kits = await kitsService.getKitsData(searchTerm, type);
        res.json({ success: true, data: kits });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Health Check
app.get('/health', (req, res) => res.status(200).send('🚀 ELIMFILTERS® API v9.1 Online'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor ElimFilters activo en puerto ${PORT}`));
