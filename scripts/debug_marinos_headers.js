#!/usr/bin/env node
// Diagnostics: print Google Sheet 'Marinos' headers and first row
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { initSheet, getOrCreateMarinosSheet } = require('../src/services/marineImportService');

async function run() {
  try {
    const doc = await initSheet();
    const sheet = await getOrCreateMarinosSheet(doc);
    await sheet.loadHeaderRow();
    console.log('Headers:', sheet.headerValues);
    const rows = await sheet.getRows({ limit: 3 });
    if (rows.length > 0) {
      const row = rows[0];
      const obj = {};
      for (const h of sheet.headerValues) obj[h] = row[h];
      console.log('Sample row:', obj);
    } else {
      console.log('No rows present in Marinos.');
    }
  } catch (e) {
    console.error('Diagnostics failed:', e.message);
    process.exitCode = 1;
  }
}

run();