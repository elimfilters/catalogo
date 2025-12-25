const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Inicializar Google Sheets
let sheets = null;
let auth = null;

function initializeGoogleSheets() {
  try {
    console.log('=== Inicializando Google Sheets ===');
    
    const base64Creds = process.env.GOOGLE_SHEETS_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
    
    if (!base64Creds) {
      throw new Error('No credentials found. Set GOOGLE_SHEETS_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_KEY_BASE64');
    }

    console.log('Variable usada:', process.env.GOOGLE_SHEETS_CREDENTIALS ? 'GOOGLE_SHEETS_CREDENTIALS' : 'GOOGLE_SERVICE_ACCOUNT_KEY_BASE64');

    const credentialsJson = Buffer.from(base64Creds, 'base64').toString('utf-8');
    console.log('✅ Base64 decodificado, longitud:', credentialsJson.length);
    
    const credentials = JSON.parse(credentialsJson);
    console.log('✅ JSON parseado correctamente');
    console.log('Client email:', credentials.client_email);
    console.log('Private key presente:', !!credentials.private_key);
    console.log('Private key length:', credentials.private_key?.length);

    if (!credentials.private_key.includes('BEGIN PRIVATE KEY')) {
      throw new Error('Private key format invalid - missing BEGIN marker');
    }

    auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets API inicializada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando Google Sheets:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

const sheetsInitialized = initializeGoogleSheets();

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    features: {
      detection: !!process.env.GEMINI_API_KEY,
      googleSheets: sheetsInitialized,
      export: true,
      batch: true,
      marine: true
    }
  });
});

// Lazy load para evitar circular dependency
let scraperBridge;
let syncSheetsService;

function loadDependencies() {
  if (!scraperBridge) {
    scraperBridge = require('./src/scrapers/scraperBridge').scraperBridge;
  }
  if (!syncSheetsService) {
    syncSheetsService = require('./src/services/syncSheetsService');
  }
}

// Search endpoint con scraping automático
app.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const mongoDBScraper = require('./src/scrapers/mongoDBScraper');
    
    // Primero buscar en MongoDB
    const mongoResult = await mongoDBScraper.search(query);
    
    if (mongoResult.success && mongoResult.count > 0) {
      return res.json({
        success: true,
        query: query,
        results: mongoResult.results[0]
      });
    }

    // Si no existe, hacer scraping
    loadDependencies();
    const scrapedResult = await scraperBridge(query);
    
    if (scrapedResult) {
      // Guardar en Sheets
      try {
        await syncSheetsService.upsertBySku({
          sku: scrapedResult.normsku || query,
          query_normalized: query,
          duty: scrapedResult.duty_type,
          type: scrapedResult.filter_type || scrapedResult.type,
          family: scrapedResult.family,
          attributes: scrapedResult.attributes || {},
          oem_codes: scrapedResult.oem_codes,
          cross_reference: scrapedResult.cross_reference,
          description: scrapedResult.description,
          source: scrapedResult.source
        });
        console.log(`✅ Guardado en Sheets: ${scrapedResult.normsku || query}`);
      } catch (err) {
        console.error('⚠️ Error guardando en Sheets:', err.message);
      }

      return res.json({
        success: true,
        query: query,
        results: scrapedResult
      });
    }

    res.json({
      success: false,
      query: query,
      error: 'No results found'
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

async function detectPieceType(code) {
  console.log('Detectando tipo de pieza para:', code);
  
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-pro" });
  
  const prompt = `Analiza este código de pieza marina: ${code}

Determina el tipo de pieza basándote en:
- Letras del código (FS, FF, WS, etc.)
- Números que indican características

Responde SOLO con UNA de estas categorías:
- FUEL SEPARATOR
- FUEL FILTER
- WATER SEPARATOR
- OIL FILTER
- AIR FILTER
- HYDRAULIC FILTER
- OTHER

Responde solo con el nombre de la categoría, sin explicaciones.`;

  const result = await model.generateContent(prompt);
  const detectedType = result.response.text().trim().toUpperCase();
  
  console.log('Tipo detectado:', detectedType);
  return detectedType;
}

function generateSKU(code, pieceType) {
  console.log(`Generando SKU para ${code} (${pieceType})`);
  
  const typeMap = {
    'FUEL SEPARATOR': 'ES',
    'FUEL FILTER': 'EF', 
    'WATER SEPARATOR': 'WS',
    'OIL FILTER': 'OF',
    'AIR FILTER': 'AF',
    'HYDRAULIC FILTER': 'HF'
  };
  
  const prefix = typeMap[pieceType] || 'XX';
  const numbers = code.match(/\d+/g)?.join('') || '0000';
  const lastFive = numbers.slice(-5).padStart(5, '0');
  
  const sku = `${prefix}${lastFive}`;
  console.log('SKU generado:', sku);
  return sku;
}

async function saveToGoogleSheets(code, sku, description) {
  if (!sheetsInitialized) {
    throw new Error('Google Sheets no inicializado');
  }

  console.log('Guardando en Google Sheets:', { code, sku, description });
  
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const range = 'Hoja1!A:C';
  
  const values = [[code, sku, description]];
  
  const result = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values }
  });
  
  console.log('✅ Guardado en fila:', result.data.updates.updatedRows);
  return result.data.updates.updatedRows;
}

app.post('/api/process', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Código requerido' 
      });
    }

    console.log('\n=== Procesando código:', code, '===');

    const pieceType = await detectPieceType(code);
    const sku = generateSKU(code, pieceType);
    const row = await saveToGoogleSheets(code, sku, pieceType);

    console.log('✅ Proceso completado');
    
    res.json({
      success: true,
      sku,
      description: pieceType,
      row
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      code: req.body.code
    });
  }
});

// Batch processing endpoint
app.post('/api/process/batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }

    const results = [];
    for (const item of items) {
      try {
        const result = await processItem(item);
        results.push(result);
      } catch (error) {
        results.push({ error: error.message, item });
      }
    }

    res.json({
      success: true,
      processed: results.length,
      results: results
    });
  } catch (error) {
    console.error('Batch processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export to Google Sheets endpoint
app.post('/api/export/sheets', async (req, res) => {
  try {
    const { data, sheetName } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Data must be an array' });
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      return res.status(500).json({ error: 'Google Sheet ID not configured' });
    }

    res.json({
      success: true,
      message: 'Data exported successfully',
      rows: data.length
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('────────────────────────────────────────────────────────');
    console.log('🚀 ELIMFILTERS API v5.0.2');
    console.log('📡 Running on port', PORT);
    console.log('🌎 Environment:', process.env.NODE_ENV || 'production');
    console.log('────────────────────────────────────────────────────────');
    console.log('📍 Health: http://localhost:' + PORT + '/health');
    console.log('🔍 Search: POST http://localhost:' + PORT + '/search');
    console.log('📝 Process: POST http://localhost:' + PORT + '/api/process');
    console.log('📝 Batch: POST http://localhost:' + PORT + '/api/process/batch');
    console.log('📤 Export: POST http://localhost:' + PORT + '/api/export/sheets');
    console.log('────────────────────────────────────────────────────────');
    console.log('✅ Google Sheets integration:', sheetsInitialized ? 'ENABLED' : 'DISABLED');
    console.log('✅ Export functionality: ENABLED');
  });
}
