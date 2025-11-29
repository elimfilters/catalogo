const fs = require('fs');
const path = require('path');
// Load env from repo/.env so Google creds are available when running standalone
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}
const { upsertBySku } = require('../src/services/syncSheetsService');

function readCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = row[idx] || ''; });
    rows.push(obj);
  }
  return rows;
}

function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQ = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function buildEquipment(rows) {
  return rows.map(r => {
    const years = r.Years || '';
    const make = r.Make || '';
    const model = r.Model || '';
    const engine = r.Engine || '';
    const name = `${make} ${model}`.trim() + (engine ? ` w/${engine} Engine` : '');
    return { name: name.trim(), years };
  });
}

function buildEngines(rows) {
  return rows.map(r => ({
    engine: r.Engine || '',
    make: r.Make || '',
    model: r.Model || '',
    years: r.Years || ''
  })).filter(e => e.engine);
}

(async () => {
  try {
    const eqPath = path.join(__dirname, 'PH6607_master_extract.csv');
    const enPath = path.join(__dirname, 'PH6607_engine_extract.csv');
    const eqRows = readCSV(eqPath);
    const enRows = readCSV(enPath);
    const equipment = buildEquipment(eqRows).slice(0, 20);
    const engines = buildEngines(enRows).slice(0, 20);

    const data = {
      sku: 'PH6607',
      source: 'FRAM',
      description: 'FRAM PH6607',
      engine_applications: engines,
      equipment_applications: equipment,
      attributes: {}
    };

    await upsertBySku(data, { deleteDuplicates: true });
    console.log('✅ Upserted PH6607 en Google Sheet Master (reemplazo por SKU)');
  } catch (e) {
    console.error('❌ Upload failed:', e);
    process.exit(1);
  }
})();