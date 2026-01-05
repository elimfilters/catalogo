const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const detectionService = require('./src/services/detectionService');
const kitsService = require('./src/services/kitsService');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión Mandatoria MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ Mongo Error:", err));

// ENDPOINT: Part Number
app.post('/api/v1/search', async (req, res) => {
    try {
        const result = await detectionService.findAndProcess(req.body.searchTerm, req.body.manufacturer);
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ENDPOINT: Kits (VIN/Equipment)
app.post('/api/v1/kits', async (req, res) => {
    try {
        const kits = await kitsService.getKitsData(req.body.searchTerm, req.body.type);
        res.json({ success: true, data: kits });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/health', (req, res) => res.send('🚀 ELIMFILTERS V9.1 OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server Online en puerto ${PORT}`));
