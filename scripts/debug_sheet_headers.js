// Diagnostics: print Google Sheet Master headers and sample rows by SKU
const path = require('path');
// Load env so credentials are available
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

async function init() {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  const credsRaw = process.env.GOOGLE_CREDENTIALS;
  if (credsRaw) {
    const creds = JSON.parse(credsRaw);
    if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    await doc.useServiceAccountAuth({ client_email: creds.client_email, private_key: creds.private_key });
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    await doc.useServiceAccountAuth({ client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') });
  } else {
    throw new Error('Missing Google Sheets credentials');
  }
  await doc.loadInfo();
  return doc;
}

async function run() {
  try {
    const doc = await init();
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();
    console.log('Headers:', sheet.headerValues);
    const rows = await sheet.getRows({ limit: 50 });
    const sampleSkus = new Set(['PH6607', 'EL82100', 'EL82100HD', 'LF3620']);
    const matches = rows.filter(r => sampleSkus.has(String(r.sku || '').toUpperCase()));
    for (const row of matches) {
      const obj = {};
      for (const h of sheet.headerValues) obj[h] = row[h];
      console.log('Row for SKU', row.sku, obj);
    }
    if (matches.length === 0) console.log('No sample SKUs found in top 50 rows.');
  } catch (e) {
    console.error('Diagnostics failed:', e.message);
    process.exitCode = 1;
  }
}

run();