const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const auth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Importante para Railway
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheetsService = {
    saveToMaster: async (data) => {
        try {
            const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
            await doc.loadInfo();
            const sheet = doc.sheetsByTitle['MASTER_UNIFIED_V5'];
            
            await sheet.addRow({
                'Input Code': data.inputCode,
                'ELIMFILTERS SKU': data.sku,
                'Description': data.description,
                'Application': data.duty,
                'Duty': data.refCode,
                'Engine Applications': data.applications
            });
            return true;
        } catch (error) {
            console.error("Error en Sheets:", error.message);
            throw error;
        }
    }
};

module.exports = sheetsService;
