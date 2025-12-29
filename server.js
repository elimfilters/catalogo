// ============================================
<<<<<<< HEAD
// ELIMFILTERS API SERVER v6.6.0 + v8.8
// Dual Endpoint Architecture
=======
// ELIMFILTERS API v6.1.0 GROQ EDITION
// Llama 3.1 70B Versatile (500+ tokens/seg)
>>>>>>> 9f3308e99a453a1a86bf897d5b7e5c6e184f6fb0
// ============================================

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { google } = require('googleapis');

<<<<<<< HEAD
// Importar mÃ³dulos v8.8
const { scrapeFilter } = require('./scraper.js');
const { processFilter } = require('./filter-processor.js');

const app = express();
const PORT = process.env.PORT || 3000;
=======
const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Iniciando servidor Railway ELIMFILTERS v6.1.0...');
console.log('⚡ Groq Llama 3.1 70B - Ultra-fast AI');
>>>>>>> 9f3308e99a453a1a86bf897d5b7e5c6e184f6fb0

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
<<<<<<< HEAD
// CONFIGURACIÃ“N
// ============================================

// MongoDB (opcional)
let mongoClient = null;
let db = null;

// Google Sheets
let sheetsClient = null;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Master Kits (cargar desde JSON)
let masterKits = [];
let technologyMatrix = null;

// ============================================
// STARTUP
// ============================================

async function startup() {
  console.log('\nðŸš€ ELIMFILTERS API v6.6.0 + v8.8 Starting...\n');
  
  // 1. Cargar Master Kits
  try {
    const fs = require('fs');
    const kitsData = JSON.parse(fs.readFileSync('./ek5_master_kits.json', 'utf8'));
    masterKits = kitsData.kits || [];
    console.log(`âœ… Master Kits loaded: ${masterKits.length} kits`);
    
    const ek5Count = masterKits.filter(k => k.duty_type === 'HD').length;
    const ek3Count = masterKits.filter(k => k.duty_type === 'LD').length;
    console.log(`   - EK5 (HD): ${ek5Count}`);
    console.log(`   - EK3 (LD): ${ek3Count}`);
  } catch (err) {
    console.error('âŒ Failed to load master kits:', err.message);
  }
  
  // 2. Cargar Technology Matrix
  try {
    const fs = require('fs');
    technologyMatrix = JSON.parse(fs.readFileSync('./technology_matrix.json', 'utf8'));
    console.log('âœ… Technology Matrix loaded');
    const techCount = Object.keys(technologyMatrix.technology_matrix || {}).length;
    console.log(`   Technologies: ${techCount}`);
  } catch (err) {
    console.error('âŒ Failed to load technology matrix:', err.message);
  }
  
  // 3. Conectar MongoDB (opcional)
  if (process.env.MONGODB_URI) {
    try {
      mongoClient = new MongoClient(process.env.MONGODB_URI);
      await mongoClient.connect();
      db = mongoClient.db('elimfilters');
      
      // Crear Ã­ndices
      await db.collection('filters').createIndex({ normsku: 1 });
      await db.collection('filters').createIndex({ query: 1 });
      
      console.log('âœ… MongoDB connected');
    } catch (err) {
      console.error('âš ï¸  MongoDB connection failed (optional):', err.message);
    }
  }
  
  // 4. Conectar Google Sheets
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    sheetsClient = google.sheets({ version: 'v4', auth });
    console.log('âœ… Google Sheets connected');
  } catch (err) {
    console.error('âš ï¸  Google Sheets connection failed:', err.message);
  }
  
  console.log('\nðŸ“Œ Endpoints:');
  console.log('   POST /api/filter - Individual filter search (with scraping)');
  console.log('   POST /api/kit    - Master kit assembly (JSON lookup)');
  console.log('   GET  /health     - System status\n');
}

// ============================================
// ENDPOINT: POST /api/filter (INDIVIDUAL)
// ============================================

app.post('/api/filter', async (req, res) => {
  const startTime = Date.now();
  const { query } = req.body;
  
  console.log(`\nðŸ” [/api/filter] Request: ${query}`);
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter required'
    });
  }
  
  try {
    // 1. Scrape especificaciones (v8.8)
    console.log('ðŸ“„ Step 1: Scraping with v8.8...');
    const scrapedSpecs = await scrapeFilter(query);
    
    if (!scrapedSpecs) {
      throw new Error('Scraping failed - no data returned');
    }
    
    if (scrapedSpecs.error === 'KIT_DETECTED') {
      return res.status(400).json({
        success: false,
        error: 'KIT_DETECTED',
        message: 'This appears to be a Master Kit. Please use POST /api/kit endpoint.',
        suggestion: {
          endpoint: '/api/kit',
          method: 'POST',
          body: { query: query }
        }
      });
    }
    
    // 2. Procesar filtro (clasificaciÃ³n + SKU + 51 campos)
    console.log('âš™ï¸  Step 2: Processing with v8.8...');
    const processedData = await processFilter(query, scrapedSpecs);
    
    // 3. Guardar en MongoDB (si disponible)
    if (db) {
      try {
        await db.collection('filters').updateOne(
          { normsku: processedData['2_normsku'] },
          { $set: { ...processedData, updated_at: new Date() } },
          { upsert: true }
        );
        console.log('ðŸ’¾ Saved to MongoDB');
      } catch (err) {
        console.error('âš ï¸  MongoDB save failed:', err.message);
      }
    }
    
    // 4. Guardar en Google Sheets (si disponible)
    if (sheetsClient && SHEET_ID) {
      try {
        await saveToSheets(processedData);
        console.log('ðŸ“Š Saved to Google Sheets');
      } catch (err) {
        console.error('âš ï¸  Sheets save failed:', err.message);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`âœ… Request completed in ${duration}ms`);
    
    return res.json({
      success: true,
      data: processedData,
      meta: {
        version: '6.6.0-v8.8',
        processing_time_ms: duration,
        source: 'scraped_and_processed'
      }
    });
    
  } catch (error) {
    console.error('âŒ Error:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      query: query
    });
  }
});

// ============================================
// ENDPOINT: POST /api/kit (MASTER KITS)
// ============================================

app.post('/api/kit', async (req, res) => {
  const { query, vehicle, engine } = req.body;
  
  console.log(`\nðŸ” [/api/kit] Request: ${query || vehicle || engine}`);
  
  if (!query && !vehicle && !engine) {
    return res.status(400).json({
      success: false,
      error: 'At least one parameter required: query, vehicle, or engine'
    });
  }
  
  try {
    // Buscar en Master Kits JSON
    let matchedKit = null;
    
    for (const kit of masterKits) {
      let match = false;
      
      // Match por query
      if (query && kit.query.toUpperCase() === query.toUpperCase()) {
        match = true;
      }
      
      // Match por vehicle
      if (vehicle && kit.vehicle_match.some(v => 
        vehicle.toUpperCase().includes(v.toUpperCase())
      )) {
        match = true;
      }
      
      // Match por engine
      if (engine && kit.engine_match.some(e => 
        engine.toUpperCase().includes(e.toUpperCase())
      )) {
        match = true;
      }
      
      if (match) {
        matchedKit = kit;
        break;
      }
    }
    
    if (!matchedKit) {
      return res.status(404).json({
        success: false,
        error: 'Kit not found',
        message: 'No Master Kit matches your query. Try individual filter search with POST /api/filter'
      });
    }
    
    console.log(`âœ… Kit found: ${matchedKit.normsku}`);
    
    return res.json({
      success: true,
      data: matchedKit,
      meta: {
        version: '6.6.0',
        source: 'master_kits_json'
      }
    });
    
  } catch (error) {
    console.error('âŒ Error:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message
=======
// CONFIGURACIÓN - Variables de Entorno
// ============================================
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'filters';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'filters';

// ✅ GROQ Configuration (NO hardcoded keys)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-70b-versatile';

// Google Sheets Configuration
const GOOGLE_SHEETS_CREDENTIALS = process.env.GOOGLE_SHEETS_CREDENTIALS;
const SPREADSHEET_ID = '1NykO13VGQw3b0V_MZBslzDiFqC9BJb2zKZ1qV4fXaQg';
const SHEET_NAME = 'Hoja 1';

// ============================================
// VALIDACIÓN DE CONFIGURACIÓN
// ============================================
if (!GROQ_API_KEY) {
  console.error('❌ ERROR: GROQ_API_KEY no configurada');
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI no configurada');
  process.exit(1);
}

if (!GOOGLE_SHEETS_CREDENTIALS) {
  console.error('❌ ERROR: GOOGLE_SHEETS_CREDENTIALS no configurada');
  process.exit(1);
}

console.log('✅ Variables de entorno validadas');

// ============================================
// CONEXIÓN MONGODB
// ============================================
let db;
const mongoClient = new MongoClient(MONGODB_URI);

mongoClient.connect()
  .then(() => {
    db = mongoClient.db(DB_NAME);
    console.log('✅ MongoDB conectado');
  })
  .catch(err => {
    console.error('❌ Error MongoDB:', err.message);
    process.exit(1);
  });

// ============================================
// CONFIGURACIÓN GOOGLE SHEETS
// ============================================
let sheetsClient;
try {
  const credentials = JSON.parse(GOOGLE_SHEETS_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  sheetsClient = google.sheets({ version: 'v4', auth });
  console.log('✅ Google Sheets conectado');
} catch (err) {
  console.error('❌ Error Google Sheets:', err.message);
}

// ============================================
// FUNCIÓN: LLAMADA A GROQ AI
// ============================================
async function callGroqAI(prompt) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en filtros automotrices. Responde SOLO con el SKU más probable en formato JSON: {"sku":"XXXXX"}. Si no estás seguro, responde {"sku":"NO_ENCONTRADO"}.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Groq API Error:', response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    
    console.log(`⚡ Groq respondió en ${duration}ms`);
    
    const aiResponse = data.choices[0].message.content.trim();
    
    // Extraer SKU del JSON
    try {
      const jsonMatch = aiResponse.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.sku || 'NO_ENCONTRADO';
      }
    } catch (e) {
      console.warn('⚠️ No se pudo parsear JSON de Groq:', aiResponse);
    }
    
    return 'NO_ENCONTRADO';
    
  } catch (error) {
    console.error('❌ Error en Groq AI:', error.message);
    return 'ERROR_AI';
  }
}

// ============================================
// ENDPOINT: /api/search
// ============================================
app.get('/api/search', async (req, res) => {
  const startTime = Date.now();
  const query = req.query.query?.trim().toUpperCase();

  console.log(`\n🔍 Búsqueda: "${query}"`);

  if (!query) {
    return res.status(400).json({ 
      error: 'Query requerido',
      version: '6.1.0',
      ai: 'groq'
    });
  }

  try {
    // 1. Buscar en MongoDB
    console.log('📊 Buscando en MongoDB...');
    const collection = db.collection(COLLECTION_NAME);
    
    const mongoResults = await collection.find({
      $or: [
        { sku: { $regex: query, $options: 'i' } },
        { nombre: { $regex: query, $options: 'i' } },
        { marca: { $regex: query, $options: 'i' } },
        { 'aplicaciones.marca': { $regex: query, $options: 'i' } },
        { 'aplicaciones.modelo': { $regex: query, $options: 'i' } }
      ]
    }).limit(20).toArray();

    console.log(`✅ MongoDB: ${mongoResults.length} resultados`);

    // 2. Buscar en Google Sheets
    let sheetResults = [];
    if (sheetsClient) {
      try {
        console.log('📊 Buscando en Google Sheets...');
        const response = await sheetsClient.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:H`
        });

        const rows = response.data.values || [];
        const headers = rows[0] || [];
        
        sheetResults = rows.slice(1)
          .filter(row => {
            const rowText = row.join(' ').toUpperCase();
            return rowText.includes(query);
          })
          .slice(0, 10)
          .map(row => {
            const obj = {};
            headers.forEach((header, i) => {
              obj[header] = row[i] || '';
            });
            return obj;
          });

        console.log(`✅ Sheets: ${sheetResults.length} resultados`);
      } catch (err) {
        console.warn('⚠️ Error en Sheets:', err.message);
      }
    }

    // 3. Si no hay resultados suficientes, usar Groq AI
    let aiSuggestion = null;
    if (mongoResults.length === 0 && sheetResults.length === 0) {
      console.log('🤖 Consultando Groq AI...');
      const prompt = `Filtro de referencia: ${query}. ¿Cuál es el SKU equivalente más común en el mercado?`;
      const aiSku = await callGroqAI(prompt);
      
      if (aiSku && aiSku !== 'NO_ENCONTRADO' && aiSku !== 'ERROR_AI') {
        aiSuggestion = {
          sku: aiSku,
          source: 'groq_ai',
          confidence: 'medium',
          note: 'Sugerencia basada en IA - verificar disponibilidad'
        };
        console.log(`🤖 Groq sugiere: ${aiSku}`);
      }
    }

    const totalTime = Date.now() - startTime;

    res.json({
      version: '6.1.0',
      ai: 'groq-llama-3.1-70b',
      query,
      results: {
        mongodb: mongoResults,
        sheets: sheetResults,
        ai_suggestion: aiSuggestion
      },
      total: mongoResults.length + sheetResults.length + (aiSuggestion ? 1 : 0),
      time_ms: totalTime,
      timestamp: new Date().toISOString()
    });

    console.log(`⚡ Respuesta enviada en ${totalTime}ms\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      error: error.message,
      version: '6.1.0',
      ai: 'groq'
>>>>>>> 9f3308e99a453a1a86bf897d5b7e5c6e184f6fb0
    });
  }
});

// ============================================
<<<<<<< HEAD
// ENDPOINT: GET /health
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '6.6.0-v8.8',
    architecture: 'dual_endpoint',
    master_kits: {
      loaded: masterKits.length > 0,
      count: masterKits.length,
      ek5_count: masterKits.filter(k => k.duty_type === 'HD').length,
      ek3_count: masterKits.filter(k => k.duty_type === 'LD').length
    },
    technology_matrix: {
      loaded: technologyMatrix !== null,
      count: technologyMatrix ? Object.keys(technologyMatrix.technology_matrix || {}).length : 0
    },
    mongodb: db !== null,
    google_sheets: sheetsClient !== null,
    groq_api: !!process.env.GROQ_API_KEY,
=======
// ENDPOINT: Health Check
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '6.1.0',
    ai: 'groq-llama-3.1-70b',
    mongodb: !!db,
    sheets: !!sheetsClient,
    groq: !!GROQ_API_KEY,
>>>>>>> 9f3308e99a453a1a86bf897d5b7e5c6e184f6fb0
    timestamp: new Date().toISOString()
  });
});

// ============================================
<<<<<<< HEAD
// FUNCIÃ“N: GUARDAR EN GOOGLE SHEETS
// ============================================

async function saveToSheets(data) {
  if (!sheetsClient || !SHEET_ID) return;
  
  const values = [
    Object.keys(data).filter(k => !k.startsWith('_')).map(k => data[k])
  ];
  
  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'MASTER_UNIFIED_V5!A:AY',
    valueInputOption: 'RAW',
    requestBody: { values }
  });
}

// ============================================
// START SERVER
// ============================================

startup().then(() => {
  app.listen(PORT, () => {
    console.log(`âœ… Server running on port ${PORT}`);
    console.log(`ðŸŒ Ready to receive requests\n`);
  });
}).catch(err => {
  console.error('âŒ Startup failed:', err);
  process.exit(1);
});
=======
// INICIO DEL SERVIDOR
// ============================================
app.listen(PORT, () => {
  console.log(`✅ Groq AI configurado (${GROQ_MODEL} - 500+ tokens/seg)`);
  console.log(`✅ Servidor escuchando en puerto ${PORT}`);
  console.log(`🚀 Groq AI: Activo (500+ tokens/seg)`);
  console.log('Sistema listo ✨\n');
});
>>>>>>> 9f3308e99a453a1a86bf897d5b7e5c6e184f6fb0
