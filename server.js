function initializeGoogleSheets() {
  try {
    console.log('=== Inicializando Google Sheets === 🔥 SIN BASE64');

    const rawCreds = process.env.GOOGLE_SHEETS_CREDENTIALS;

    if (!rawCreds) {
      throw new Error('No credentials found. Set GOOGLE_SHEETS_CREDENTIALS');
    }

    console.log('Variable usada: GOOGLE_SHEETS_CREDENTIALS');

    const credentials = JSON.parse(rawCreds);

    console.log('✅ JSON parseado correctamente');
    console.log('Client email:', credentials.client_email);
    console.log('Private key presente:', !!credentials.private_key);

    if (!credentials.private_key.includes('BEGIN PRIVATE KEY')) {
      throw new Error('❌ Private key inválida o malformateada');
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
    return false;
  }
}
