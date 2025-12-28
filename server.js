function initializeGoogleSheets() {
  try {
    console.log('=== Inicializando Google Sheets ===');

    const credsJSON = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);

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
