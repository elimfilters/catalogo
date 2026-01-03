const express = require('express');
const cors = require('cors');
const { Groq } = require('groq-sdk');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const { appendToSheet } = require('./services/googleSheetsService');
const { mapToRow } = require('./services/dataMapper');

const app = express();
const PORT = process.env.PORT || 8080;

// ============================================
// DIAGNÓSTICO Y CONFIGURACIÓN
// ============================================
console.log("🔍 Variables detectadas por el sistema:", Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY')));

// Intenta leer todas las posibles variantes de nombre
const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ ERROR CRÍTICO: No se detecta MONGODB_URL o MONGODB_URI.");
    console.log("💡 Acción: Ve a Railway -> Variables y asegúrate de que MONGODB_URL sea igual a tu conexión de Mongo.");
    process.exit(1);
}

const client = new MongoClient(MONGODB_URI);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
let db, filtersCollection;

// Cargar Reglas de Negocio
let filterConfig;
try {
    const configPath = path.join(__dirname, 'config', 'filters.json');
    filterConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log("✅ Reglas de ingeniería cargadas");
} catch (e) {
    console.error("❌ Error cargando config/filters.json");
    process.exit(1);
}

app.use(cors());
app.use(express.json());

app.get('/api/search', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query requerida' });

    try {
        const codigo = query.trim().toUpperCase();
        console.log(`🔎 Buscando: ${codigo}`);

        // 1. IA Groq
        const prompt = `Eres el Engineering Core de ELIMFILTERS. Genera la ficha técnica para: ${codigo}. 
                        Usa las reglas de: ${JSON.stringify(filterConfig)}.
                        Responde en JSON con array 'results'.`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: prompt }],
            model: "llama-3.1-70b-versatile",
            response_format: { type: "json_object" }
        });

        const data = JSON.parse(completion.choices[0].message.content);

        // 2. Procesar y Guardar
        if (data.results) {
            const rows = data.results.map(item => mapToRow(item, codigo));
            await appendToSheet(rows);
            // Guardar asíncrono en Mongo
            data.results.forEach(r => filtersCollection.insertOne({...r, input_code: codigo}));
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function start() {
    try {
        await client.connect();
        db = client.db('elimfilters');
        filtersCollection = db.collection('filters');
        app.listen(PORT, '0.0.0.0', () => console.log(`🚀 API ELIMFILTERS v7.2 Online`));
    } catch (e) {
        console.error("❌ Error de conexión Mongo:", e.message);
    }
}
start();
