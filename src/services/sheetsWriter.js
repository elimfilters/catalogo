/**
 * ELIMFILTERS® Engineering Core - Sheets Writer
 * v10.0 - Mapeo Maestro de 59 Columnas para MASTER_UNIFIED_V5
 */

const { google } = require('googleapis');
const path = require('path');

const sheetsWriter = {
    writeToMaster: async (productData) => {
        try {
            const auth = new google.auth.GoogleAuth({
                keyFile: path.join(__dirname, '../config/google_credentials.json'),
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            const sheets = google.sheets({ version: 'v4', auth });
            const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
            const range = 'MASTER_UNIFIED_V5!A:BG'; // Cubre las 59 columnas (A hasta BG)

            // MAPEO DE COLUMNAS (Basado en techSpecs extraídos del Tab de Atributos)
            const specs = productData.specs || {};
            
            const row = new Array(59).fill(""); // Inicializa las 59 columnas vacías

            // ASIGNACIÓN ESTRATÉGICA (Columnas Críticas)
            row[0]  = productData.tier;                 // Col A: TIER (Standard/Performance/Elite)
            row[1]  = productData.sku;                  // Col B: SKU ELIMFILTERS (ES9..., EF9...)
            row[2]  = productData.description;          // Col C: DESCRIPCIÓN COMERCIAL
            row[3]  = productData.systemKey;            // Col D: SISTEMA (LUBE, FUEL, etc.)
            
            // DIMENSIONES Y MECÁNICA (CALCO DE DONALDSON)
            row[8]  = specs['Thread Size'] || specs['Tamaño de la rosca'] || "N/A"; // Col I: ROSCA
            row[9]  = specs['Length'] || specs['Longitud'] || "N/A";                // Col J: ALTURA MM
            row[11] = specs['Outer Diameter'] || specs['Diámetro exterior'] || "N/A"; // Col L: DE MM
            
            // RENDIMIENTO E ISO
            row[18] = productData.iso_standard;         // Col S: NORMA ISO (ej. ISO 4020)
            row[19] = specs['Efficiency 99%'] || "N/A"; // Col T: MICRAJE @ 99%
            row[21] = specs['Efficiency 99.9%'] || "N/A";// Col V: MICRAJE @ 99.9%
            
            // IDENTIDAD DE MARCA ELIMFILTERS®
            row[27] = specs['Collapse Burst'] || "N/A"; // Col AB: PRESIÓN COLAPSO
            row[29] = productData.technology;           // Col AD: TIPO DE MEDIA (AQUAGUARD®, etc.)
            row[42] = productData.technology;           // Col AQ: TECNOLOGÍA DE FILTRACIÓN
            row[46] = productData.tier === "ELITE" ? "Protección Extrema" : "Protección Estándar"; // Col AU: CLAIM

            // AGREGAR FILA AL GOOGLE SHEET
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [row] },
            });

            console.log(`✅ Registro exitoso en Sheet: ${productData.sku}`);

        } catch (error) {
            console.error("❌ [SHEETS WRITER ERROR]:", error.message);
        }
    }
};

module.exports = sheetsWriter;
