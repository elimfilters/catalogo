/**
 * ELIMFILTERS® Engineering Core - Sheets Writer
 * v11.0 - Conexión Segura vía Variables de Entorno (Railway Ready)
 */

const { google } = require('googleapis');
const { mapToMasterRow } = require('../utils/rowMapper');

const sheetsWriter = {
    writeToMaster: async (aiAnalysis, query) => {
        try {
            // 1. AUTENTICACIÓN SEGURA
            // Lee el JSON desde la variable de entorno GOOGLE_CREDENTIALS_JSON
            const auth = new google.auth.GoogleAuth({
                credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            const sheets = google.sheets({ version: 'v4', auth });
            const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
            const range = 'MASTER_UNIFIED_V5!A:BD'; // Rango para las 56 columnas

            // 2. TRANSFORMACIÓN DE DATOS (Calco Donaldson -> Identidad ELIMFILTERS)
            // Llamamos al mapeador v10.2 que creamos para organizar las columnas
            const rowData = mapToMasterRow(aiAnalysis, query);

            // 3. INSERCIÓN EN GOOGLE SHEETS
            const response = await sheets.spreadsheets.values.append({
                spreadsheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [rowData],
                },
            });

            console.log(`✅ Registro exitoso: ${aiAnalysis.skus?.STANDARD?.sku || 'Nuevo SKU'} añadido al Master.`);
            return response;

        } catch (error) {
            console.error("❌ [SHEETS WRITER ERROR]:", error.message);
            // Si hay error de "Invalid Grant", verifica que la variable en Railway esté bien pegada
            throw error;
        }
    }
};

module.exports = sheetsWriter;
