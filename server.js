const express = require('express');
const cors = require('cors');
const { Groq } = require('groq-sdk');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Importar tus nuevos servicios
const { appendToSheet } = require('./services/googleSheetsService');
const { mapToRow } = require('./services/dataMapper');

const app = express();
const PORT = process.env.PORT || 8080;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGODB_URI);
let db, filtersCollection;

// Cargar Reglas de Negocio desde el JSON
const configPath = path.join(__dirname, 'config', 'filters.json');
const filterConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

app.use(cors());
app.use(express.json());

// Conexión Inicial
async function init() {
    await client.connect();
    db = client.db('elimfilters');
    filtersCollection = db.collection('filters');
    console.log("✅ MongoDB & Configuración listos");
}

app.get('/api/search', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query requerida' });

    try {
        // 1. Buscar en Caché (MongoDB)
        const cache = await filtersCollection.find({ input_code: query.toUpperCase() }).toArray();
        if (cache.length > 0) {
            console.log("📦 Retornando desde Caché");
            return res.json({ results: cache, source: 'cache' });
        }

        // 2. Si no hay caché, llamar a Groq con la nueva lógica de Tiers
        console.log("🤖 Consultando Ingeniería Groq...");
        const prompt = `Eres el Engineering Core de ELIMFILTERS. Analiza: ${query}.
        REGLAS:
        - Pivotes: ${filterConfig.brand_logic.heavy_duty_pivot} (HD) / ${filterConfig.brand_logic.light_duty_pivot} (LD).
        - Si hay múltiples cruces (ej. P559000, P550949, DBL7900), genera un resultado para CADA UNO.
        - SKU: [PREFIJO] + [Ultimos 4 dígitos del pivote].
        - Prefijos y Tecnologías: ${JSON.stringify(filterConfig.prefixes)}
        - Genera ficha técnica técnica completa (38+ campos) para cada uno.
        Responde estrictamente en JSON con un array 'results'.`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: prompt }],
            model: "llama-3.1-70b-versatile",
            response_format: { type: "json_object" }
        });

        const data = JSON.parse(completion.choices[0].message.content);

        // 3. Mapear, Guardar en MongoDB y enviar a Sheets
        if (data.results && data.results.length > 0) {
            const rowsForSheets = data.results.map(item => {
                const row = mapToRow(item, query);
                // Guardar en Mongo de forma asíncrona
                filtersCollection.insertOne({ ...item, input_code: query.toUpperCase() });
                return row;
            });

            // Enviar al Master50
            await appendToSheet(rowsForSheets);
        }

        res.json({ ...data, source: 'groq-ai' });

    } catch (error) {
        console.error("❌ Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

init().then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 API ELIMFILTERS v7.2 en puerto ${PORT}`));
});
