const http = require('http');
const fs = require('fs');
const args = process.argv.slice(2);
const categoryArg = args.find(a => a.startsWith('--category='));
const category = categoryArg ? categoryArg.split('=')[1] : 'vehicles';

function parseApp(app) {
  const name = String(app.name || '');
  const years = String(app.years || '');
  let engine = '';
  const mW = name.match(/w\/([^)]*?)\s*Engine/i);
  if (mW) {
    engine = mW[1].trim();
  } else {
    const mEnd = name.match(/([A-Za-z0-9\- ]+)\s+Engine$/i);
    if (mEnd) engine = mEnd[1].trim();
  }

  let base = name;
  const idxW = name.indexOf(' w/');
  const idxParen = name.indexOf('(');
  if (idxW >= 0 && (idxParen < 0 || idxW < idxParen)) base = name.substring(0, idxW);
  else if (idxParen >= 0) base = name.substring(0, idxParen);
  base = base.trim();

  const tokens = base.split(/\s+/);
  const brandTokens = [];
  for (const t of tokens) {
    if (/^[A-Z][A-Z-]+$/.test(t)) brandTokens.push(t);
    else break;
  }
  let make = '';
  let model = '';
  if (brandTokens.length) {
    make = brandTokens.join(' ');
    model = tokens.slice(brandTokens.length).join(' ');
  } else {
    make = tokens[0] || '';
    model = tokens.slice(1).join(' ');
  }

  return { Years: years, Make: make.trim(), Model: model.trim(), Engine: engine };
}

const EQUIPMENT_BRANDS = new Set([
  'BLACK ROCK', 'BOBCAT', 'BUSH HOG', 'CARRIER-TRANSICOLD',
  'COMFORT MASTER', 'DYNASYS', 'GATES', 'CUB CADET'
]);
const VEHICLE_BRANDS = new Set([
  'ALFA ROMEO', 'CHEVROLET', 'DODGE', 'FORD', 'HONDA'
]);

function isVehicle(row) {
  const make = String(row.Make || '').toUpperCase();
  const years = String(row.Years || '').trim();
  const model = String(row.Model || '');
  if (/\bengine\b/i.test(model)) return false;           // exclude entries where model itself is an engine descriptor
  if (EQUIPMENT_BRANDS.has(make)) return false; // explicitly exclude known equipment/APU brands
  if (VEHICLE_BRANDS.has(make)) return true;   // allow known vehicle brands
  return years.length > 0;                      // otherwise require years to be present
}

function toCSV(rows) {
  const headers = ['Years', 'Make', 'Model', 'Engine'];
  const escape = (v) => '"' + String(v || '').replace(/"/g, '"') + '"';
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h])).join(','));
  }
  return lines.join('\n');
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        try {
          const j = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          resolve(j);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

(async () => {
  try {
    const j = await fetchJSON('http://localhost:8080/api/detect/PH6607');
    const apps = Array.isArray(j.equipment_applications) ? j.equipment_applications : [];
    const parsed = apps.map(parseApp);
    const rows = category === 'all' ? parsed.slice(0, 50) : parsed.filter(isVehicle).slice(0, 50);
    const csv = toCSV(rows);
    const outPath = 'scripts/PH6607_master_extract.csv';
    fs.writeFileSync(outPath, csv, 'utf8');
    console.log('Wrote', outPath, `(category=${category})`);
    console.log(csv.split('\n').slice(0, 25).join('\n'));
  } catch (e) {
    console.error('Export failed:', e);
    process.exit(1);
  }
})();