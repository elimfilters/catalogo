const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID, serviceAccountAuth);

async function processSearch(searchTerm, type) {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    // Búsqueda inteligente: SKU, Parte o Homologaciones
    const row = rows.find(r => {
        const sku = r.get('SKU')?.toString().toLowerCase();
        const part = r.get('PART_NUMBER')?.toString().toLowerCase();
        const cross = r.get('CROSS_REFERENCE')?.toString().toLowerCase();
        const term = searchTerm.toLowerCase();
        return sku === term || part === term || cross?.includes(term);
    });

    if (!row) return null;

    // Estructura completa enviada a WordPress
    return {
        sku: row.get('SKU'), // Columna B
        description: row.get('DESCRIPTION'), // Columna C
        imageUrl: row.get('IMAGE_URL'),
        
        // Tecnologías y Especificaciones (Mapeo H-AQ)
        specifications: [
            { label: 'Height (mm)', value: row.get('HEIGHT') },
            { label: 'Outer Diameter', value: row.get('OUTER_DIAMETER') },
            { label: 'Thread', value: row.get('THREAD') },
            { label: 'Micron Rating', value: row.get('MICRON') },
            { label: 'Efficiency', value: row.get('EFFICIENCY') }
        ].filter(s => s.value), // Solo envía los que tengan datos

        // Homologaciones y Códigos
        oemCodes: row.get('OEM_CODES')?.split(',') || [],
        crossReference: row.get('CROSS_REFERENCE')?.split(',') || [],

        // Equipos y Aplicaciones (Mapeo AT, AU, AV)
        equipment: rows.filter(r => r.get('SKU') === row.get('SKU')).map(r => ({
            make: r.get('EQUIPMENT_MAKE'), // AT
            model: r.get('EQUIPMENT_MODEL'), // AU
            engine: r.get('ENGINE_TYPE') // AV
        }))
    };
}

module.exports = { processSearch };
