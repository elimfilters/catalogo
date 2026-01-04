const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// ID de tu Spreadsheet
const SPREADSHEET_ID = '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

// Configuración de Autenticación
const auth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Arregla el formato de la llave en Railway
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheetsService = {
    // 🔍 BUSCAR: Verifica si el código ya fue procesado
    findInMaster: async (searchTerm) => {
        try {
            const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
            await doc.loadInfo();
            const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
            const rows = await sheet.getRows();
            
            // Buscamos en la columna "Input Code" (Columna A)
            const found = rows.find(row => 
                row.get('Input Code')?.toString().toLowerCase() === searchTerm.toLowerCase()
            );

            if (found) {
                return {
                    inputCode: found.get('Input Code'),
                    sku: found.get('ELIMFILTERS SKU'),
                    description: found.get('Description'),
                    duty: found.get('Application'), // En tu sheet es Columna G
                    referenceCode: found.get('Duty'), // En tu sheet es Columna F
                    engines: found.get('Engine Applications') // Columna AU
                };
            }
            return null;
        } catch (error) {
            console.error("Error buscando en Sheets:", error.message);
            return null;
        }
    },

    // ✍️ GUARDAR: Registra el nuevo filtro detectado
    saveToMaster: async (data) => {
        try {
            const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
            await doc.loadInfo();
            const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
            
            // Mapeo exacto según tu estructura de columnas
            await sheet.addRow({
                'Input Code': data.inputCode,
                'ELIMFILTERS SKU': data.sku,
                'Description': data.description,
                'Application': data.duty,          // HD o LD
                'Duty': data.referenceCode,       // Donaldson o Fram code
                'Engine Applications': data.engines // Información del motor
            });
            console.log(`✅ Guardado con éxito: ${data.sku}`);
        } catch (error) {
            console.error("Error guardando en Sheets:", error.message);
        }
    }
};

module.exports = sheetsService;
