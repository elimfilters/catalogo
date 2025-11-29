const http = require('http');
const fs = require('fs');
const args = process.argv.slice(2);
const categoryArg = args.find(a => a.startsWith('--category='));
const category = categoryArg ? categoryArg.split('=')[1] : 'vehicles';

function extractEngine(name) {
  if (!name) return '';
  // Prefer explicit w/ ... Engine pattern
  let m = name.match(/w\/([^)]*?)\s*Engine/i);
  if (m) return m[1].trim();
  // Handle "with Yanmar 2TNV70 Engine" style
  m = name.match(/with\s+([A-Za-z][A-Za-z]+\s+[A-Za-z0-9\-]+)\s+Engine$/i);
  if (m) return m[1].trim();
  // Fallback: last token group before Engine
  m = name.match(/([A-Za-z][A-Za-z]+(?:\s+[A-Za-z0-9\-]+){0,2})\s+Engine$/i);
  if (m) return m[1].trim();
  // Special: Honda Twin Engine
  m = name.match(/(Honda\s+Twin)\s+Engine/i);
  if (m) return m[1].trim();
  return '';
}

function splitMakeModel(base) {
  const tokens = base.trim().split(/\s+/);
  const brandTokens = [];
  for (const t of tokens) {
    if (/^[A-Z][A-Z-]+$/.test(t)) brandTokens.push(t); else break;
  }
  const make = brandTokens.length ? brandTokens.join(' ') : (tokens[0] || '');
  const model = brandTokens.length ? tokens.slice(brandTokens.length).join(' ') : tokens.slice(1).join(' ');
  return { make: make.trim(), model: model.trim() };
}

const EQUIPMENT_BRANDS = new Set([
  'BLACK ROCK', 'BOBCAT', 'BUSH HOG', 'CARRIER-TRANSICOLD',
  'COMFORT MASTER', 'DYNASYS', 'GATES', 'CUB CADET'
]);
const VEHICLE_BRANDS = new Set([
  'ALFA ROMEO', 'CHEVROLET', 'DODGE', 'FORD', 'HONDA'
]);

function isVehicleEntry(make, years, model) {
  const m = String(make || '').toUpperCase();
  const y = String(years || '').trim();
  const mdl = String(model || '');
  if (/\bengine\b/i.test(mdl)) return false;
  if (EQUIPMENT_BRANDS.has(m)) return false;
  if (VEHICLE_BRANDS.has(m)) return true;
  return y.length > 0;
}

function toCSV(rows) {
  const headers = ['Engine', 'Make', 'Model', 'Years'];
  const escape = (v) => '"' + String(v || '').replace(/"/g, '"') + '"';
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(','));
  return lines.join('\n');
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  try {
    const j = await fetchJSON('http://localhost:8080/api/detect/PH6607');
    const apps = Array.isArray(j.equipment_applications) ? j.equipment_applications : [];
    const rows = [];
    for (const app of apps) {
      const name = String(app.name || '');
      const years = String(app.years || '');
      const engine = extractEngine(name);
      if (!engine) continue;
      let base = name;
      const idxW = name.indexOf(' w/');
      const idxParen = name.indexOf('(');
      if (idxW >= 0 && (idxParen < 0 || idxW < idxParen)) base = name.substring(0, idxW);
      else if (idxParen >= 0) base = name.substring(0, idxParen);
      const { make, model } = splitMakeModel(base);
      if (category !== 'all' && !isVehicleEntry(make, years, model)) continue;
      rows.push({ Engine: engine, Make: make, Model: model, Years: years });
      if (rows.length >= 50) break;
    }
    const csv = toCSV(rows);
    const outPath = 'scripts/PH6607_engine_extract.csv';
    fs.writeFileSync(outPath, csv, 'utf8');
    console.log('Wrote', outPath, `(category=${category})`);
    console.log(csv.split('\n').slice(0, 30).join('\n'));
  } catch (e) {
    console.error('Engine export failed:', e);
    process.exit(1);
  }
})();