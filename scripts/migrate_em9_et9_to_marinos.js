#!/usr/bin/env node
const { initSheet, getOrCreateMarinosSheet, upsertMarinosBySku } = require('../src/services/marineImportService');

function toArraySafe(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  const s = String(val || '').trim();
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch (_) {}
  return s ? s.split(/[,;\n\t/]+/).map(x => x.trim()).filter(Boolean) : [];
}

async function migrate({ dryRun = true, prefixes = ['EM9','ET9'] } = {}) {
  const doc = await initSheet();
  const master = doc.sheetsByIndex[0];
  await master.loadHeaderRow();
  const rows = await master.getRows();

  const moved = [];
  const skipped = [];

  for (const row of rows) {
    const normsku = String(row.normsku || row.sku || '').toUpperCase().trim();
    if (!normsku) { skipped.push({ reason: 'no_sku' }); continue; }
    if (!prefixes.some(p => normsku.startsWith(p))) { continue; }

    const data = {
      sku: normsku,
      media: String(row.media_type || ''),
      duty: String(row.duty_type || ''),
      family: String(row.type || ''),
      filter_type: String(row.type || ''),
      code_input: String(row.query || ''),
      code_oem: String(row.query || ''),
      oem_codes: toArraySafe(row.oem_codes),
      cross_reference: toArraySafe(row.cross_reference),
      applications: toArraySafe(row.engine_applications),
      equipment_applications: toArraySafe(row.equipment_applications)
    };

    if (dryRun) {
      moved.push(normsku);
    } else {
      try {
        await upsertMarinosBySku(data);
        await row.delete();
        moved.push(normsku);
        console.log(`migrated ${normsku} → Marinos`);
      } catch (e) {
        skipped.push({ sku: normsku, reason: e.message });
        console.error(`failed ${normsku}: ${e.message}`);
      }
    }
  }

  return { moved, skipped };
}

(async () => {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const dryRun = !apply;
  const res = await migrate({ dryRun });
  console.log(JSON.stringify({ dryRun, moved_count: res.moved.length, moved: res.moved, skipped: res.skipped }, null, 2));
  if (dryRun) {
    console.log('Dry-run only. Re-run with --apply to perform migration.');
  }
})().catch(err => { console.error(err); process.exit(1); });