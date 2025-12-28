function initializeGoogleSheets() {
  try {
    console.log('=== Inicializando Google Sheets ===');

    let credsJSON;

    // 1) Intentar GOOGLE_APPLICATION_CREDENTIALS (JSON literal)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        credsJSON = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        console.log('📌 Usando GOOGLE_APPLICATION_CREDENTIALS');
      } catch (e) {
        console.warn('⚠️ GOOGLE_APPLICATION_CREDENTIALS no es JSON válido:', e.message);
      }
    }

    // 2) Si no existe o está mal, intentar GOOGLE_SERVICE_ACCOUNT_KEY_BASE64
    if (!credsJSON && process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64) {
      try {
        const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf-8');
        credsJSON = JSON.parse(decoded);
        console.log('📌 Usando GOOGLE_SERVICE_ACCOUNT_KEY_BASE64');
      } catch (e) {
        console.warn('⚠️ GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 inválido:', e.message);
      }
    }

    if (!credsJSON) {
      throw new Error('Missing Google Sheets credentials. Set GOOGLE_APPLICATION_CREDENTIALS OR GOOGLE_SERVICE_ACCOUNT_KEY_BASE64');
    }

    const auth = new google.auth.JWT(
      credsJSON.client_email,
      null,
      credsJSON.private_key,
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
