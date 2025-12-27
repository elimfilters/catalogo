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

    // 1️⃣ Intentar como JSON plano
    try {
      credentials = JSON.parse(rawCreds);
      console.log('✅ Credenciales leídas como JSON plano');
    } catch (jsonErr) {
      // 2️⃣ Si falla, intentar como Base64
      try {
        const decoded = Buffer.from(rawCreds, 'base64').toString('utf-8');
        credentials = JSON.parse(decoded);
        console.log('✅ Credenciales decodificadas desde Base64');
      } catch (b64Err) {
        throw new Error('❌ Credenciales inválidas (ni JSON ni Base64 válido)');
      }
    }

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
