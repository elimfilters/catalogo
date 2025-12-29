// ============================================
// ELIMFILTERS API v6.1.0 GROQ EDITION
// Llama 3.1 70B Versatile (500+ tokens/seg)
// ============================================

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Iniciando servidor Railway ELIMFILTERS v6.1.0...');
console.log('⚡ Groq Llama 3.1 70B - Ultra-fast AI');

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
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
    });
  }
});

// ============================================
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
    timestamp: new Date().toISOString()
  });
});

// ============================================
// INICIO DEL SERVIDOR
// ============================================
app.listen(PORT, () => {
  console.log(`✅ Groq AI configurado (${GROQ_MODEL} - 500+ tokens/seg)`);
  console.log(`✅ Servidor escuchando en puerto ${PORT}`);
  console.log(`🚀 Groq AI: Activo (500+ tokens/seg)`);
  console.log('Sistema listo ✨\n');
});
