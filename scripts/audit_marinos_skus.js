#!/usr/bin/env node
const { initSheet, getOrCreateMarinosSheet } = require('../src/services/marineImportService');

async function audit(skus) {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  const rows = await sheet.getRows();
  const idx = new Map();
  for (const r of rows) {
    const key = String(r.normsku || r.sku || '').toUpperCase().trim();
    if (key) idx.set(key, r);
  }
  const report = [];
  for (const s of skus) {
    const k = String(s).toUpperCase().trim();
    const found = idx.has(k);
    report.push({ sku: k, found, status: found ? 'PRESENTE' : 'NO ENCONTRADO' });
  }
  console.log(JSON.stringify({ audited: skus.length, report }, null, 2));
}

(async () => {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Uso: node scripts/audit_marinos_skus.js EM9-SR20S ET9-F2010S');
    process.exit(1);
  }
  await audit(args);
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });