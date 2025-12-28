function initializeGoogleSheets() {
  try {
    console.log('=== Inicializando Google Sheets ===');

    // Usa directamente JSON de la variable
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);

    const auth = new google.auth.JWT(
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
