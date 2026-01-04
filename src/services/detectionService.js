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

    // Búsqueda por SKU (B), Part Number o Homologaciones
    const row = rows.find(r => {
        const sku = r.get('SKU')?.toString().toLowerCase(); // Columna B
        const part = r.get('PART_NUMBER')?.toString().toLowerCase();
        const cross = r.get('CROSS_REFERENCE')?.toString().toLowerCase();
        const term = searchTerm.toLowerCase();
        return sku === term || part === term || cross?.includes(term);
    });

    if (!row) return null;

    // 1. Mapeo de Tecnologías / Specs (Columnas H a AQ)
    const specs = [
        { label: 'Height (mm)', value: row.get('H') },
        { label: 'Outer Diameter', value: row.get('I') },
        // ... aquí puedes agregar todas hasta la AQ mapeando el encabezado del Excel
        { label: 'Micron Rating', value: row.get('AQ') }
    ].filter(s => s.value);

    // 2. Mapeo de Equipos / Aplicaciones (Columnas AT, AU, AV)
    // Buscamos todas las filas que compartan el mismo SKU para listar todos los equipos
    const allEquipments = rows.filter(r => r.get('SKU') === row.get('SKU')).map(r => ({
        make: r.get('AT'),    // EQUIPO/MARCA
        model: r.get('AU'),   // MODELO/SERIE
        engine: r.get('AV')   // MOTOR
    }));

    return {
        sku: row.get('SKU'), // B
        description: row.get('DESCRIPTION'), // C
        imageUrl: row.get('IMAGE_URL'),
        specifications: specs,
        equipment: allEquipments,
        oemCodes: row.get('OEM_CODES')?.split(',') || [],
        crossReference: row.get('CROSS_REFERENCE')?.split(',') || [],
        maintenance: row.get('MAINTENANCE_INFO')
    };
}

module.exports = { processSearch };
