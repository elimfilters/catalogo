const { GoogleSpreadsheet } = require('google-spreadsheet');

async function getKitsData(searchTerm, type) {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID);
    await doc.useServiceAccountAuth(JSON.parse(process.env.GOOGLE_CREDS));
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['MASTER_KITS_V1'];
    const rows = await sheet.getRows();

    const kit = rows.find(r => r.get('VIN') === searchTerm || r.get('EQUIPMENT')?.includes(searchTerm));
    if (!kit) return null;

    const duty = kit.get('DUTY');
    return {
        kit_sku: `${duty === 'HD' ? 'EK5' : 'EK3'}-${kit.get('ID')}`,
        components: [
            { type: 'Oil', sku: kit.get('OIL_SKU') },
            { type: 'Fuel', sku: kit.get('FUEL_SKU') }
        ]
    };
}

module.exports = { getKitsData };
