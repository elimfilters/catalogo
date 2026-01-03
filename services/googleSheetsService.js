const { google } = require('googleapis');

async function appendToSheet(results, query) {
    try {
        // Cargar credenciales desde la variable de entorno que ya configuramos
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_CREDS_JSON),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.SPREADSHEET_ID; // ID de tu Master50

        const values = results.map(item => [
            new Date().toLocaleDateString(), // Fecha
            query,                           // Código buscado
            item.sku,                        // SKU generado
            item.tier,                       // Nivel (Elite, etc)
            item.tech,                       // Tecnología (Syntrax, etc)
            item.description                 // Descripción técnica
        ]);

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Hoja1!A:F', // Ajusta al nombre de tu pestaña
            valueInputOption: 'USER_ENTERED',
            resource: { values },
        });

        console.log(`✅ ${values.length} filas añadidas a Google Sheets`);
    } catch (error) {
        console.error('❌ Error en Google Sheets:', error.message);
    }
}

module.exports = { appendToSheet };
