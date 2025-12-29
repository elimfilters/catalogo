// ============================================
// ELIMFILTERS API SERVER v6.6.0 + v8.8
// Dual Endpoint Architecture
// ============================================

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { google } = require('googleapis');

// Importar módulos v8.8
const { scrapeFilter } = require('./scraper.js');
const { processFilter } = require('./filter-processor.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// CONFIGURACIÓN
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
  console.log('\n🚀 ELIMFILTERS API v6.6.0 + v8.8 Starting...\n');
  
  // 1. Cargar Master Kits
  try {
    const fs = require('fs');
    const kitsData = JSON.parse(fs.readFileSync('./ek5_master_kits.json', 'utf8'));
    masterKits = kitsData.kits || [];
    console.log(`✅ Master Kits loaded: ${masterKits.length} kits`);
    
    const ek5Count = masterKits.filter(k => k.duty_type === 'HD').length;
    const ek3Count = masterKits.filter(k => k.duty_type === 'LD').length;
    console.log(`   - EK5 (HD): ${ek5Count}`);
    console.log(`   - EK3 (LD): ${ek3Count}`);
  } catch (err) {
    console.error('❌ Failed to load master kits:', err.message);
  }
  
  // 2. Cargar Technology Matrix
  try {
    const fs = require('fs');
    technologyMatrix = JSON.parse(fs.readFileSync('./technology_matrix.json', 'utf8'));
    console.log('✅ Technology Matrix loaded');
    const techCount = Object.keys(technologyMatrix.technology_matrix || {}).length;
    console.log(`   Technologies: ${techCount}`);
  } catch (err) {
    console.error('❌ Failed to load technology matrix:', err.message);
  }
  
  // 3. Conectar MongoDB (opcional)
  if (process.env.MONGODB_URI) {
    try {
      mongoClient = new MongoClient(process.env.MONGODB_URI);
      await mongoClient.connect();
      db = mongoClient.db('elimfilters');
      
      // Crear índices
      await db.collection('filters').createIndex({ normsku: 1 });
      await db.collection('filters').createIndex({ query: 1 });
      
      console.log('✅ MongoDB connected');
    } catch (err) {
      console.error('⚠️  MongoDB connection failed (optional):', err.message);
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
    console.log('✅ Google Sheets connected');
  } catch (err) {
    console.error('⚠️  Google Sheets connection failed:', err.message);
  }
  
  console.log('\n📌 Endpoints:');
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
  
  console.log(`\n🔍 [/api/filter] Request: ${query}`);
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter required'
    });
  }
  
  try {
    // 1. Scrape especificaciones (v8.8)
    console.log('📄 Step 1: Scraping with v8.8...');
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
    
    // 2. Procesar filtro (clasificación + SKU + 51 campos)
    console.log('⚙️  Step 2: Processing with v8.8...');
    const processedData = await processFilter(query, scrapedSpecs);
    
    // 3. Guardar en MongoDB (si disponible)
    if (db) {
      try {
        await db.collection('filters').updateOne(
          { normsku: processedData['2_normsku'] },
          { $set: { ...processedData, updated_at: new Date() } },
          { upsert: true }
        );
        console.log('💾 Saved to MongoDB');
      } catch (err) {
        console.error('⚠️  MongoDB save failed:', err.message);
      }
    }
    
    // 4. Guardar en Google Sheets (si disponible)
    if (sheetsClient && SHEET_ID) {
      try {
        await saveToSheets(processedData);
        console.log('📊 Saved to Google Sheets');
      } catch (err) {
        console.error('⚠️  Sheets save failed:', err.message);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Request completed in ${duration}ms`);
    
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
    console.error('❌ Error:', error.message);
    
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
  
  console.log(`\n🔍 [/api/kit] Request: ${query || vehicle || engine}`);
  
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
    
    console.log(`✅ Kit found: ${matchedKit.normsku}`);
    
    return res.json({
      success: true,
      data: matchedKit,
      meta: {
        version: '6.6.0',
        source: 'master_kits_json'
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
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
    timestamp: new Date().toISOString()
  });
});

// ============================================
// FUNCIÓN: GUARDAR EN GOOGLE SHEETS
// ============================================

async function saveToSheets(data) {
  if (!sheetsClient || !SHEET_ID) return;
  
  const values = [
    Object.keys(data).filter(k => !k.startsWith('_')).map(k => data[k])
  ];
  
  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Hoja 1!A:AY',
    valueInputOption: 'RAW',
    requestBody: { values }
  });
}

// ============================================
// START SERVER
// ============================================

startup().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Ready to receive requests\n`);
  });
}).catch(err => {
  console.error('❌ Startup failed:', err);
  process.exit(1);
});