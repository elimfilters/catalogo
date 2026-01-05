const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const detectionService = require('./src/services/detectionService');
const kitsService = require('./src/services/kitsService');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ ELIMFILTERS Engineering Core: MongoDB Online"))
    .catch(err => console.error("❌ Error de conexión:", err));

app.post('/api/v1/search', async (req, res) => {
    try {
        const results = await detectionService.findAndProcess(req.body.searchTerm, req.body.manufacturer, req.body.engineType);
        res.json({ success: true, data: results });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/v1/kits', async (req, res) => {
    try {
        const kits = await kitsService.getKitsData(req.body.searchTerm, req.body.type);
        res.json({ success: true, data: kits });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API v9.7 lista en puerto ${PORT}`));
