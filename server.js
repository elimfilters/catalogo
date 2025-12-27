require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

let sheets;
let sheetsInitialized = false;

function initializeGoogleSheets() {
  try {
    console.log('=== Inicializando Google Sheets ===');

    const rawCreds =
      process.env.GOOGLE_SHEETS_CREDENTIALS ||
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;

    if (!rawCreds) {
      throw new Error(
        'No credentials found. Set GOOGLE_SHEETS_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_KEY_BASE64'
      );
    }

    console.log(
      'Variable usada:',
      process.env.GOOGLE_SHEETS_CREDENTIALS
        ? 'GOOGLE_SHEETS_CREDENTIALS'
        : 'GOOGLE_SERVICE_ACCOUNT_KEY_BASE64'
    );

    let credentials;

    try {
      credentials = JSON.parse(rawCreds);
      console.log('✅ Credenciales leídas como JSON plano');
    } catch (jsonErr) {
      try {
        const decoded = Buffer.from(rawCreds, 'base64').toString('utf-8');
        credentials = JSON.parse(decoded);
        console.log('✅ Credenciales decodificadas desde Base64');
      } catch (b64Err) {
        throw new Error('❌ Credenciales inválidas (ni JSON ni Base64 válido)');
      }
    }

    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    sheets = google.sheets({ version: 'v4', auth });
    sheetsInitialized = true;
    console.log('✅ Google Sheets API inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando Google Sheets:', error.message);
  }
}

initializeGoogleSheets();

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
    resource: { values },
  });

  console.log('✅ Guardado en fila:', result.data.updates.updatedRows);
  return result.data.updates.updatedRows;
}

app.get('/health', (req, res) => {
  res.send('OK');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = {
  app,
  saveToGoogleSheets
};
