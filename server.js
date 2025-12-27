function initializeGoogleSheets() {
  try {
    console.log('=== Inicializando Google Sheets ===');

    const base64Creds = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;

    if (!base64Creds) {
      throw new Error(
        'No credentials found. Set GOOGLE_SERVICE_ACCOUNT_KEY_BASE64'
      );
    }

    console.log('Variable usada: GOOGLE_SERVICE_ACCOUNT_KEY_BASE64');

    // Decodifica Base64 a texto JSON
    const credentialsJson = Buffer.from(base64Creds, 'base64').toString('utf-8');

    console.log('✅ Credenciales decodificadas de Base64, longitud:', credentialsJson.length);

    const credentials = JSON.parse(credentialsJson);
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
