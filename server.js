const express = require('express');
const cors = require('cors');
const { Groq } = require('groq-sdk');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Importación de tus servicios personalizados
const { appendToSheet } = require('./services/googleSheetsService');
const { mapToRow } = require('./services/dataMapper');

const app = express();
const PORT = process.env.PORT || 8080;

// ============================================
// 1. CONFIGURACIÓN DE CONEXIONES
// ============================================

// Usamos MONGODB_URL que es la variable que tienes en Railway
const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGODB_URI;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!MONGODB_URI) {
    console.error("❌ ERROR: La variable MONGODB_URL no está definida en Railway.");
    process.exit(1);
}

const client = new MongoClient(MONGODB_URI);
const groq = new Groq({ apiKey: GROQ_API_KEY });
let db, filtersCollection;

// Cargar Reglas de Negocio desde el JSON
let filterConfig;
try {
    const configPath = path.join(__dirname, 'config', 'filters.json');
    filterConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log("✅ Configuración de filtros (JSON) cargada exitosamente");
} catch (error) {
    console.error("❌ Error fatal cargando config/filters.json:", error.message);
    process.exit(1);
}

// ============================================
// 2. MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());

// ============================================
// 3. LÓGICA DE BÚSQUEDA Y GENERACIÓN
// ============================================

app.get('/api/search', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Se requiere un código para buscar.' });

    try {
        const codigoNormalizado = query.trim().toUpperCase();

        // PASO 1: Buscar en el Caché de MongoDB
        const cache = await filtersCollection.find({ input_code: codigoNormalizado }).toArray();
        if (cache.length > 0) {
            console.log(`📦 Retornando ${cache.length} resultados desde Caché para: ${codigoNormalizado}`);
            return res.json({ results: cache, source: 'cache' });
        }

        // PASO 2: Si no hay caché, consultar a Groq AI con lógica de Tiers
        console.log(`🤖 Consultando Ingeniería Groq para: ${codigoNormalizado}`);
        
        const prompt = `Eres el Engineering Core de ELIMFILTERS. Analiza el código: ${codigoNormalizado}.
        
        REGLAS DE NEGOCIO:
        - Pivotes: ${filterConfig.brand_logic.heavy_duty_pivot} (HD) / ${filterConfig.brand_logic.light_duty_pivot} (LD).
        - CRUCES MÚLTIPLES: Si el código tiene varios equivalentes (ej: P559000, P550949, DBL7900), genera un resultado para CADA UNO.
        - SKU: [PREFIJO] + [Ultimos 4 dígitos del pivote]. NO INVENTES LETRAS NI GUIONES.
        - Prefijos y Tecnologías: ${JSON.stringify(filterConfig.prefixes)}
        - REGLA ET9: Para turbinas generar micronajes P, T y S.

        INSTRUCCIÓN TÉCNICA:
        Genera la ficha técnica completa (56 columnas) incluyendo medidas, presiones, micronajes y aplicaciones.
        
        Responde estrictamente en un objeto JSON con un array llamado 'results'.`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: prompt }],
            model: "llama-3.1-70b-versatile",
            response_format: { type: "json_object" }
        });

        const data = JSON.parse(completion.choices[0].message.content);

        // PASO 3: Procesar resultados (Mapeo, Guardado y Sheets)
        if (data.results && data.results.length > 0) {
            const rowsForSheets = data.results.map(item => {
                // Agregar el código de entrada para el historial
                const itemConInput = { ...item, input_code: codigoNormalizado };
                
                // 1. Guardar en MongoDB (Caché)
                filtersCollection.insertOne(itemConInput).catch(e => console.error("Error Mongo:", e.message));
                
                // 2. Mapear al formato de 56 columnas del Master50
                return mapToRow(itemConInput, codigoNormalizado);
            });

            // 3. Enviar a Google Sheets
            await appendToSheet(rowsForSheets);
            console.log(`✅ ${data.results.length} resultados procesados y guardados.`);
        }

        res.json({ ...data, source: 'groq-engineering' });

    } catch (error) {
        console.error("❌ Error en búsqueda:", error.message);
        res.status(500).json({ error: "Error interno procesando la solicitud." });
    }
});

// ============================================
// 4. ARRANQUE DEL SERVIDOR
// ============================================
async function start() {
    try {
        await client.connect();
        db = client.db('elimfilters');
        filtersCollection = db.collection('filters');
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 API ELIMFILTERS v7.2 Online en puerto ${PORT}`);
        });
    } catch (error) {
        console.error("❌ No se pudo conectar a MongoDB:", error.message);
    }
}

start();
