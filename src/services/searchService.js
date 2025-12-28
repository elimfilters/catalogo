const { google } = require('googleapis');

let sheetsClient = null;

function initializeGoogleSheets() {
  try {
    console.log('=== Inicializando Google Sheets ===');

    const rawCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!rawCredentials) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS no está definida');
    }

    const credsJSON = JSON.parse(rawCredentials);

    const auth = new google.auth.JWT(
      credsJSON.client_email,
      null,
      credsJSON.private_key.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    sheetsClient = google.sheets({ version: 'v4', auth });

    console.log('✅ Google Sheets API inicializada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando Google Sheets:', error.message);
    return false;
  }
}

function getSheetsClient() {
  if (!sheetsClient) {
    const initialized = initializeGoogleSheets();
    if (!initialized) {
      throw new Error('Google Sheets no fue inicializado correctamente');
    }
  }
  return sheetsClient;
}

module.exports = { initializeGoogleSheets, getSheetsClient };
