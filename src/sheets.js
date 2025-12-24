import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = '1S2hu2r0EzilEq_lQpXW2aNsd0lf_EQNbLa_eQxg-LXo';
const SHEET_NAME = 'MASTER_UNIFIED_V5';

let auth = null;

export async function initializeAuth() {
  if (auth) return auth;

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
    
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });

    console.log('✅ Google Sheets auth initialized');
    return auth;
  } catch (error) {
    console.error('❌ Error initializing Google Sheets auth:', error.message);
    throw error;
  }
}

export async function appendToSheet(values) {
  try {
    const authClient = await initializeAuth();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error appending to sheet:', error.message);
    throw error;
  }
}

export async function writeToGoogleSheets(products) {
  try {
    if (!products || products.length === 0) {
      console.log('⚠️ No products to write');
      return { success: true, rowsWritten: 0 };
    }

    console.log(`📊 Writing ${products.length} products to Google Sheets...`);

    const rows = products.map(p => [
      p.query || '',
      p.normsku || '',
      p.description || '',
      p.oem || '',
      p.donaldson || '',
      p.fram || '',
      new Date().toISOString()
    ]);

    await appendToSheet(rows);
    console.log(`✅ Successfully wrote ${rows.length} rows to ${SHEET_NAME}`);
    
    return { success: true, rowsWritten: rows.length };
  } catch (error) {
    console.error('❌ Error writing to Google Sheets:', error.message);
    throw error;
  }
}