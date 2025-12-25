const { google } = require('googleapis');

let sheetsClient = null;
let isEnabled = false;

function initializeSheets() {
  try {
    const base64Creds = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
    
    if (!base64Creds) {
      console.log('??  Google Sheets: No credentials found');
      return false;
    }

    // Decodificar Base64
    const jsonString = Buffer.from(base64Creds, 'base64').toString('utf-8');
    const credentials = JSON.parse(jsonString);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    isEnabled = true;
    console.log('? Google Sheets initialized successfully');
    return true;
  } catch (error) {
    console.error('? Error initializing Google Sheets:', error.message);
    return false;
  }
}

// Inicializar al cargar el módulo
initializeSheets();

async function appendToSheet(spreadsheetId, range, values) {
  if (!isEnabled) {
    throw new Error('Google Sheets integration is disabled');
  }

  try {
    const response = await sheetsClient.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values }
    });
    return response.data;
  } catch (error) {
    console.error('Error appending to sheet:', error);
    throw error;
  }
}

async function readSheet(spreadsheetId, range) {
  if (!isEnabled) {
    throw new Error('Google Sheets integration is disabled');
  }

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range
    });
    return response.data.values || [];
  } catch (error) {
    console.error('Error reading sheet:', error);
    throw error;
  }
}

module.exports = {
  appendToSheet,
  readSheet,
  isEnabled: () => isEnabled
};
