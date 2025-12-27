require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'credentials.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function getSheetInfo() {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
    });
    
    console.log('📊 Hojas disponibles:');
    response.data.sheets.forEach(sheet => {
      console.log(`  - ${sheet.properties.title}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getSheetInfo();