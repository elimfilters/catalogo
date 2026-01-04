const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID, auth);

async function processSearch(searchTerm) {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    const row = rows.find(r => 
        r.get('SKU')?.toString().toLowerCase() === searchTerm.toLowerCase() ||
        r.get('CROSS_REFERENCE')?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!row) return null;

    // ESTO ES LO QUE BUSCABAS: Mapeo de Tecnologías (H-AQ) y Aplicaciones (AT-AV)
    return {
        sku: row.get('SKU'),
        description: row.get('DESCRIPTION'),
        imageUrl: row.get('IMAGE_URL'),
        specifications: [
            { label: 'Height', value: row.get('H') }, // Columna H
            { label: 'Outer Diameter', value: row.get('I') }, // Columna I
            { label: 'Micron Rating', value: row.get('AQ') } // Columna AQ
        ].filter(s => s.value),
        equipment: rows.filter(r => r.get('SKU') === row.get('SKU')).map(r => ({
            make: r.get('AT'),   // EQUIPO
            model: r.get('AU'),  // MODELO
            engine: r.get('AV')  // MOTOR
        }))
    };
}

module.exports = { processSearch };
