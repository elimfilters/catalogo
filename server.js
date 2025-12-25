const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configurar Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Servicio de sincronización con Sheets
const syncSheetsService = {
  async appendToSheet(data) {
    try {
      const values = [[
        data.sku || '',
        data.code_client || '',
        data.code_oem || '',
        data.duty || '',
        data.family || '',
        data.media || '',
        data.source || '',
        JSON.stringify(data.cross_reference || []),
        JSON.stringify(data.applications || []),
        JSON.stringify(data.attributes || {}),
        new Date().toISOString()
      ]];

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A:K',
        valueInputOption: 'RAW',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error al guardar en Sheets:', error.message);
      throw error;
    }
  }
};

// Endpoint principal de scraping
app.post('/scrape', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`🔍 Procesando búsqueda: ${query}`);

    // Llamar a Gemini para scraping
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Busca información sobre el repuesto automotriz: ${query}. 
    Devuelve en formato JSON con: normsku, oem_codes, duty_type, family, media_type, 
    source, cross_reference, applications, attributes`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parsear respuesta
    let scrapedResult;
    try {
      scrapedResult = JSON.parse(text);
    } catch (parseError) {
      scrapedResult = {
        normsku: query,
        oem_codes: [query],
        duty_type: 'UNKNOWN',
        family: 'UNKNOWN',
        source: 'SCRAPER'
      };
    }

    // Guardar en Sheets
    try {
      await syncSheetsService.appendToSheet({
        sku: scrapedResult.normsku || query,
        code_client: query,
        code_oem: scrapedResult.oem_codes?.[0] || query,
        duty: scrapedResult.duty_type,
        family: scrapedResult.family,
        media: scrapedResult.media_type || '',
        source: scrapedResult.source || 'SCRAPER',
        cross_reference: scrapedResult.cross_reference || [],
        applications: scrapedResult.applications || [],
        attributes: scrapedResult.attributes || {}
      });
      
      console.log(`✅ Guardado en Sheets: ${scrapedResult.normsku || query}`);
    } catch (sheetsError) {
      console.error('⚠️ Error al guardar en Sheets, pero continuando:', sheetsError.message);
    }

    res.json({
      success: true,
      data: scrapedResult
    });

  } catch (error) {
    console.error('❌ Error en /scrape:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
