const { GoogleSpreadsheet } = require('google-spreadsheet');

async function getKitsData(searchTerm, type) {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID);
    await doc.useServiceAccountAuth(JSON.parse(process.env.GOOGLE_CREDS));
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['MASTER_KITS_V1'];
    const rows = await sheet.getRows();

    // Búsqueda por VIN o por nombre de Equipo
    const kit = rows.find(r => 
        r.get('VIN') === searchTerm || 
        r.get('EQUIPMENT')?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!kit) return null;

    const duty = kit.get('DUTY'); // Debe ser HD o LD en el Excel
    const prefix = (duty === 'HD') ? 'EK5' : 'EK3';

    return {
        kit_sku: `${prefix}-${kit.get('ID')}`,
        equipment: kit.get('EQUIPMENT'),
        duty: duty,
        components: [
            { label: "Aceite", sku: kit.get('OIL_SKU') },
            { label: "Combustible", sku: kit.get('FUEL_SKU') },
            { label: "Aire", sku: kit.get('AIR_SKU') }
        ]
    };
}

module.exports = { getKitsData };
