// Importador masivo CSV/JSON para vin_application_map
// Uso:
//   npm run import:vin -- --file path/to/file.json
//   npm run import:vin -- --file path/to/file.csv

try { require('dotenv').config(); } catch (_) {}

const fs = require('fs');
const path = require('path');
const mongoService = require('../src/services/mongoService');
const { upsertMapping } = require('../src/services/vinApplicationMapService');

function parseArgs() {
  const args = process.argv.slice(2);
  const fileIdx = args.findIndex(a => a === '--file');
  const file = fileIdx >= 0 ? args[fileIdx + 1] : null;
  return { file };
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headerLine = lines[0];
  const headers = headerLine.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length !== headers.length) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = cols[idx]; });
    rows.push(row);
  }
  return rows;
}

function normalizeRow(row) {
  return {
    make: row.make || row.Make,
    model: row.model || row.Model,
    year: row.year || row.Year,
    engine_liters: row.engine_liters || row.Engine || row.engine || row.engine_displacement,
    filter_type: row.filter_type || row.Filter || row.type,
    oem_code_target: row.oem_code_target || row.Code || row.oem || row.target,
    source: row.source || 'import',
  };
}

async function main() {
  const { file } = parseArgs();
  if (!file) {
    console.log('Uso: npm run import:vin -- --file path/to/file.json|csv');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.log('ℹ️  MONGODB_URI no está configurado. Configure el URI y reintente.');
    process.exit(1);
  }

  await mongoService.connect();
  console.log('✅ Conexión a MongoDB establecida');

  const abs = path.resolve(file);
  const content = fs.readFileSync(abs, 'utf8');
  const ext = path.extname(abs).toLowerCase();

  let records = [];
  try {
    if (ext === '.json') {
      const json = JSON.parse(content);
      if (Array.isArray(json)) records = json;
      else if (Array.isArray(json.records)) records = json.records;
      else if (Array.isArray(json.data)) records = json.data;
      else throw new Error('JSON no contiene un array. Use un JSON array o {records: []}.');
    } else if (ext === '.csv') {
      records = parseCSV(content);
    } else {
      throw new Error('Formato no soportado. Use .json o .csv');
    }
  } catch (e) {
    console.log('❌ Error leyendo archivo:', e.message);
    process.exit(1);
  }

  console.log(`📦 Registros a importar: ${records.length}`);

  let ok = 0, fail = 0;
  for (const r of records) {
    const doc = normalizeRow(r);
    try {
      const res = await upsertMapping(doc);
      if (res && res.make_model_year_engine) {
        console.log('✔', res.make_model_year_engine, res.filter_type, '→', res.oem_code_target);
        ok++;
      } else {
        console.log('✖ upsert inválido:', doc);
        fail++;
      }
    } catch (e) {
      console.log('✖ error:', e.message, doc);
      fail++;
    }
  }
  console.log(`✅ Importación finalizada. OK=${ok} FAIL=${fail}`);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });