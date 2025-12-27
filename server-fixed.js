const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Configurar Google Sheets con Base64
let auth, sheets;
try {
  const base64Creds = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  const credentials = JSON.parse(Buffer.from(base64Creds, 'base64').toString('utf8'));
  
  auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  
  sheets = google.sheets({ version: 'v4', auth });
  console.log('? Google Sheets configurado');
} catch (error) {
  console.error('? Error configurando Sheets:', error.message);
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Endpoint sin Gemini
app.post('/api/process', async (req, res) => {
  try {
    const { query, manufacturer, filterType } = req.body; const code = query;
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query requerido' });
    }

    const values = [[
      code,
      manufacturer || '',
      filterType || '',
      new Date().toISOString()
    ]];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'MASTER_UNIFIED_V5!A:D',
      valueInputOption: 'RAW',
      resource: { values },
    });

    res.json({
      success: true,
      data: { code, manufacturer, filterType },
      sheetsResponse: response.data
    });

  } catch (error) {
    console.error('? Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`?? Server running on port ${PORT}`);
});
