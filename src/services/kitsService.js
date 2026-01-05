/**
 * ELIMFILTERS® Engineering Core - Kits Service
 * v10.5 - Integración Total con googleapis (Sin dependencias huérfanas)
 */

const { google } = require('googleapis');
require('dotenv').config();

// Configuración de Autenticación compatible con sheetsWriter
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

async function getKitsData(searchTerm) {
    try {
        console.log(`📦 Buscando Kit por VIN o Equipo: ${searchTerm}`);

        // 1. Obtener todas las filas de la pestaña MASTER_KITS_V1
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'MASTER_KITS_V1!A:T', // Captura las 20 columnas (A-T)
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) {
            console.log("⚠️ La pestaña MASTER_KITS_V1 está vacía.");
            return null;
        }

        // 2. Extraer datos (Saltando el encabezado en la fila 0)
        const dataRows = rows.slice(1);

        // 3. Lógica de Búsqueda:
        // Buscamos en Columna A (kit_sku) o Columna F (equipment_app)
        const kitRow = dataRows.find(row => {
            const kitSku = row[0] ? row[0].toString().toLowerCase() : "";
            const equipmentApp = row[5] ? row[5].toString().toLowerCase() : "";
            
            return kitSku === searchTerm.toLowerCase() || 
                   equipmentApp.includes(searchTerm.toLowerCase());
        });

        if (!kitRow) {
            console.log(`❌ No se encontró Kit para: ${searchTerm}`);
            return null;
        }

        // 4. Mapeo de la Trilogía de Kit (HD = EK5 | LD = EK3)
        // Usamos los índices de columna basados en tu lista (A=0, B=1, etc.)
        const kitSeries = kitRow[2] || ""; // Col C: kit_series
        const duty = kitSeries.includes("EK5") ? "HD" : "LD";

        return {
            kit_sku: kitRow[0],             // Col A
            kit_type: kitRow[1],            // Col B
            kit_series: kitSeries,          // Col C
            description: kitRow[3],         // Col D: kit_description_en
            filters_included: kitRow[4],    // Col E: filters_included
            equipment: kitRow[5],           // Col F: equipment_app
            engine: kitRow[6],              // Col G: engine_app
            duty: duty,
            warranty: kitRow[8],            // Col I: warranty_months
            interval_km: kitRow[9],         // Col J: change_interval_km
            stock_status: kitRow[16]        // Col Q: stock_status
        };

    } catch (error) {
        console.error("❌ [KITS SERVICE ERROR]:", error.message);
        throw error;
    }
}

module.exports = { getKitsData };
