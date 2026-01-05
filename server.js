const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Importación de servicios de ingeniería auditados
const detectionService = require('./src/services/detectionService');
const kitsService = require('./src/services/kitsService');

const app = express();

// CONFIGURACIÓN DE SEGURIDAD: Permite conexión desde tu WordPress
app.use(cors({
    origin: ['https://elimfilters.com', 'http://localhost:3000'], // Ajusta según necesites
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// 1. RUTA DE SALUD (Obligatoria para Railway)
// Esto evita el error SIGTERM al responderle a los monitores de Railway
app.get('/', (req, res) => {
    res.status(200).send({
        status: "Online",
        service: "ELIMFILTERS® Engineering Core",
        version: "9.7.0",
        database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
    });
});

// 2. CONEXIÓN A MONGODB CLUSTER0
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ ELIMFILTERS Engineering Core: MongoDB Online"))
    .catch(err => {
        console.error("❌ Error de conexión MongoDB:", err);
        process.exit(1); // Cierra si no hay base de datos
    });

// 3. ENDPOINT DE BÚSQUEDA TÉCNICA (Trilogía 1R1808)
app.post('/api/v1/search', async (req, res) => {
    try {
        const { searchTerm, manufacturer, engineType } = req.body;
        
        // Validación básica de entrada
        if (!searchTerm) return res.status(400).json({ error: "Search term is required" });

        const results = await detectionService.findAndProcess(searchTerm, manufacturer, engineType);
        res.json({ success: true, data: results });
        
    } catch (e) { 
        console.error("Error en Search API:", e.message);
        res.status(500).json({ success: false, error: e.message }); 
    }
});

// 4. ENDPOINT DE KITS (EK5 / EK3)
app.post('/api/v1/kits', async (req, res) => {
    try {
        const { searchTerm, type } = req.body;
        
        const kits = await kitsService.getKitsData(searchTerm, type);
        res.json({ success: true, data: kits });
        
    } catch (e) { 
        console.error("Error en Kits API:", e.message);
        res.status(500).json({ success: false, error: e.message }); 
    }
});

// 5. INICIO DEL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ELIMFILTERS Engine v9.7 rugiendo en puerto ${PORT}`);
});
