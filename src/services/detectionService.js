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

    // Búsqueda por SKU (Col B) o Referencias
    const row = rows.find(r => {
        const sku = r.get('SKU')?.toString().toLowerCase();
        const cross = r.get('CROSS_REFERENCE')?.toString().toLowerCase();
        const term = searchTerm.toLowerCase();
        return sku === term || cross?.includes(term);
    });

    if (!row) return null;

    // Mapeo Dinámico de Tecnologías (Columnas H a AQ)
    const specs = [
        { label: 'Height', value: row.get('H') },
        { label: 'Outer Diameter', value: row.get('I') },
        { label: 'Inner Diameter', value: row.get('J') },
        { label: 'Thread', value: row.get('K') },
        { label: 'Micron', value: row.get('AQ') }
    ].filter(s => s.value && s.value !== '-');

    // Mapeo de Equipos (Columnas AT, AU, AV)
    const equipmentList = rows.filter(r => r.get('SKU') === row.get('SKU')).map(r => ({
        make: r.get('AT'),    // EQUIPO
        model: r.get('AU'),   // MODELO
        engine: r.get('AV')   // MOTOR
    })).filter(e => e.make);

    return {
        sku: row.get('SKU'),
        description: row.get('DESCRIPTION'),
        imageUrl: row.get('IMAGE_URL') || 'https://elimfilters.com/wp-content/uploads/2025/11/logo-sin-fondo.png',
        specifications: specs,
        equipment: equipmentList,
        oemCodes: row.get('OEM_CODES')?.split(',') || [],
        crossReference: row.get('CROSS_REFERENCE')?.split(',') || [],
        maintenance: row.get('MAINTENANCE_KITS')
    };
}

module.exports = { processSearch };
