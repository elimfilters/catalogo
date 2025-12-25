const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

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

async function detectPieceType(code) {
  console.log('Detectando tipo de pieza para:', code);
  
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
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

module.exports = app;

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('────────────────────────────────────────────────────────');
    console.log('🚀 ELIMFILTERS API v5.0.2');
    console.log('📡 Running on port ' + PORT);
    console.log('🌎 Environment: ' + (process.env.NODE_ENV || 'development'));
    console.log('────────────────────────────────────────────────────────');
    console.log('📍 Health: http://localhost:' + PORT + '/health');
    console.log('🔍 Search: POST http://localhost:' + PORT + '/search');
    console.log('📝 Process: POST http://localhost:' + PORT + '/api/process');
    console.log('📝 Batch: POST http://localhost:' + PORT + '/api/process/batch');
    console.log('📤 Export: POST http://localhost:' + PORT + '/api/export/sheets');
    console.log('────────────────────────────────────────────────────────');
    console.log('✅ Google Sheets integration: ' + (sheetsInitialized ? 'ENABLED' : 'DISABLED'));
    console.log('✅ Export functionality: ENABLED');
  });
}
