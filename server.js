const { google } = require('googleapis');

let sheets = null;

function initializeGoogleSheets() {
  try {
    console.log('=== Inicializando Google Sheets ===');

    // Carga la variable de entorno con las credenciales en formato JSON stringificado
    const rawCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!rawCredentials) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS no está definida');
    }

    // Parsear el JSON contenido en la variable de entorno
    const credsJSON = JSON.parse(rawCredentials);

    // Crear autenticación JWT
    const auth = new google.auth.JWT(
      credsJSON.client_email,
      null,
      credsJSON.private_key.replace(/\\n/g, '\n'), // ← 🔥 CORRECCIÓN IMPORTANTE
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    sheets = google.sheets({ version: 'v4', auth });

    console.log('✅ Google Sheets API inicializada correctamente');
    return true;

  } catch (error) {
    console.error('❌ Error inicializando Google Sheets:', error.message);
    return false;
  }
}

module.exports = { initializeGoogleSheets, sheets };
