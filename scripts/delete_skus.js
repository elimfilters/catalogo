// Delete rows in Google Sheet Master by SKU(s)
// Usage: node scripts/delete_skus.js EN --LANG
// Supports GOOGLE_CREDENTIALS (JSON) or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY

try { require('dotenv').config(); } catch (_) {}

const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

function normalizeSku(s) {
  return String(s || '').toUpperCase().trim();
}

async function initDoc() {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  const credsRaw = process.env.GOOGLE_CREDENTIALS;
  if (credsRaw) {
    const creds = JSON.parse(credsRaw);
    if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    await doc.useServiceAccountAuth({ client_email: creds.client_email, private_key: creds.private_key });
  } else if ((process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL) && process.env.GOOGLE_PRIVATE_KEY) {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    await doc.useServiceAccountAuth({ client_email: email, private_key: key });
  } else {
    throw new Error('Missing Google Sheets credentials');
  }
  await doc.loadInfo();
  return doc;
}

async function run() {
  const args = process.argv.slice(2).map(normalizeSku).filter(Boolean);
  if (!args.length) {
    console.error('Usage: node scripts/delete_skus.js <SKU> [SKU...]');
    process.exit(1);
  }

  try {
    const doc = await initDoc();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    let deleted = 0;

    for (const target of args) {
      const matches = rows.filter(r => normalizeSku(r.sku) === target);
      if (!matches.length) {
        console.log(`ℹ️ No rows found for SKU ${target}`);
        continue;
      }
      for (const row of matches) {
        try {
          await row.delete();
          deleted++;
          console.log(`🗑️ Deleted row for SKU ${target}`);
        } catch (e) {
          console.warn(`⚠️ Failed deleting SKU ${target}: ${e.message}`);
        }
      }
    }

    console.log(`✅ Deletion complete. Rows deleted: ${deleted}`);
  } catch (e) {
    console.error('❌ Deletion failed:', e.message);
    process.exit(1);
  }
}

run();