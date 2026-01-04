const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID, auth);

async function processSearch(searchTerm, type) {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    // Búsqueda por SKU (Col B) o Referencias Cruzadas
    const row = rows.find(r => {
        const sku = r.get('SKU')?.toString().toLowerCase();
        const cross = r.get('CROSS_REFERENCE')?.toString().toLowerCase();
        const term = searchTerm.toLowerCase();
        return sku === term || cross?.includes(term);
    });

    if (!row) return null;

    // Mapeo de Tecnologías (H-AQ)
    const specs = [
        { label: 'Height (mm)', value: row.get('H') },
        { label: 'Outer Diameter', value: row.get('I') },
        { label: 'Thread Size', value: row.get('K') },
        { label: 'Micron Rating', value: row.get('AQ') }
    ].filter(s => s.value && s.value !== '-');

    // Mapeo de Aplicaciones de Equipos (AT-AV)
    const equipmentList = rows.filter(r => r.get('SKU') === row.get('SKU')).map(r => ({
        make: r.get('AT'),    // Marca
        model: r.get('AU'),   // Modelo
        engine: r.get('AV')   // Motor
    })).filter(e => e.make);

    return {
        sku: row.get('SKU'), // B
        description: row.get('DESCRIPTION'), // C
        imageUrl: row.get('IMAGE_URL') || 'https://elimfilters.com/default.jpg',
        specifications: specs,
        equipment: equipmentList,
        oemCodes: row.get('OEM_CODES')?.split(',') || [],
        crossReference: row.get('CROSS_REFERENCE')?.split(',') || []
    };
}

module.exports = { processSearch };
