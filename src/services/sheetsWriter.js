const { GoogleSpreadsheet } = require('google-spreadsheet');

/**
 * ELIMFILTERS® Engineering Core - Google Sheets Service
 * v9.7 - Multi-row Insertion for Trilogies
 */
async function saveThreeRows(results) {
    try {
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID);
        
        // Autenticación segura mediante variable de entorno
        await doc.useServiceAccountAuth(JSON.parse(process.env.GOOGLE_CREDS));
        await doc.loadInfo();
        
        const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];

        // Mapeamos los resultados al formato de columnas del Excel
        const rowsToSave = results.map(res => ({
            SKU: res.sku,
            BRAND: res.brand,
            TECHNOLOGY: res.tier,
            DUTY: res.duty,
            AQ_MICRONS: res.microns,
            CROSS_REFERENCE: res.cross_reference,
            ORIGINAL_CODE: res.original_code,
            PERFORMANCE_CLAIM: res.performance_claim,
            DATE_ADDED: new Date().toLocaleDateString()
        }));

        // Inserción masiva de la Trilogía (3 filas)
        await sheet.addRows(rowsToSave);
        console.log(`✅ Catálogo Actualizado: ${rowsToSave.length} productos añadidos.`);
        
    } catch (error) {
        console.error("❌ Error en SheetsWriter:", error.message);
    }
}

module.exports = { saveThreeRows };
