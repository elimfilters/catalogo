function initializeGoogleSheets() {
  try {
    console.log('=== Inicializando Google Sheets ===');

    const rawCreds = process.env.GOOGLE_SHEETS_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;

    if (!rawCreds) {
      throw new Error('No credentials found. Set GOOGLE_SHEETS_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_KEY_BASE64');
    }

    console.log('Variable usada:', process.env.GOOGLE_SHEETS_CREDENTIALS ? 'GOOGLE_SHEETS_CREDENTIALS' : 'GOOGLE_SERVICE_ACCOUNT_KEY_BASE64');

    let credentials;
    try {
      // Intenta decodificar como base64
      const decoded = Buffer.from(rawCreds, 'base64').toString('utf-8');
      credentials = JSON.parse(decoded);
      console.log('✅ Base64 decodificado y parseado como JSON');
    } catch (e) {
      // Si falla, intenta parsear directamente como JSON plano
      try {
        credentials = JSON.parse(rawCreds);
        console.log('✅ Credenciales parseadas como JSON plano');
      } catch (jsonErr) {
        throw new Error('Credenciales inválidas: no es Base64 ni JSON válido');
      }
    }

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
