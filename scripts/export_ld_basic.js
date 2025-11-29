const http = require('http');
const fs = require('fs');

// Args: --sku=PH6607
const args = process.argv.slice(2);
const skuArg = args.find(a => a.startsWith('--sku='));
const sku = skuArg ? skuArg.split('=')[1] : 'PH6607';

function parseApp(app) {
  const name = String(app.name || '');
  const years = String(app.years || '');
  let engine = '';
  const mW = name.match(/w\/([^)]*?)\s*Engine/i);
  if (mW) engine = mW[1].trim();
  else {
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
    if (/^[A-Z][A-Z-]+$/.test(t)) brandTokens.push(t); else break;
  }
  const make = brandTokens.length ? brandTokens.join(' ') : (tokens[0] || '');
  const model = brandTokens.length ? tokens.slice(brandTokens.length).join(' ') : tokens.slice(1).join(' ');
  return { YEAR: years, MAKE: make.trim(), MODEL: model.trim(), ENGINE: engine };
}

const EQUIPMENT_BRANDS = new Set([
  'BLACK ROCK', 'BOBCAT', 'BUSH HOG', 'CARRIER-TRANSICOLD',
  'COMFORT MASTER', 'DYNASYS', 'GATES', 'CUB CADET'
]);
const VEHICLE_BRANDS = new Set([
  'ACURA','ALFA ROMEO','AUDI','BMW','BUICK','CADILLAC','CHEVROLET','CHRYSLER','DODGE',
  'FORD','GMC','HONDA','HYUNDAI','INFINITI','JEEP','KIA','LEXUS','LINCOLN','MAZDA',
  'MERCURY','MITSUBISHI','NISSAN','PONTIAC','PORSCHE','SATURN','SCION','SUBARU',
  'SUZUKI','TOYOTA','VOLKSWAGEN','VOLVO'
]);

function isVehicle(row) {
  const make = String(row.MAKE || '').toUpperCase();
  const years = String(row.YEAR || '').trim();
  const model = String(row.MODEL || '');
  if (/\bengine\b/i.test(model)) return false;
  if (EQUIPMENT_BRANDS.has(make)) return false;
  if (VEHICLE_BRANDS.has(make)) return true;
  return years.length > 0; // fallback: vehicles usually include years
}

function toCSV(rows) {
  const headers = ['YEAR','MAKE','MODEL','ENGINE'];
  const escape = (v) => '"' + String(v || '').replace(/"/g, '"') + '"';
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map(h => escape(r[h])).join(','));
  return lines.join('\n');
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  try {
    const j = await fetchJSON(`http://localhost:8080/api/detect/${sku}`);
    const apps = Array.isArray(j.equipment_applications) ? j.equipment_applications : [];
    const parsed = apps.map(parseApp);
    const rows = parsed.filter(isVehicle);
    const csv = toCSV(rows);
    const outPath = `scripts/${sku}_LD.csv`;
    fs.writeFileSync(outPath, csv, 'utf8');
    console.log('Wrote', outPath, `(LD vehicles)`);
    console.log(csv.split('\n').slice(0, 30).join('\n'));
  } catch (e) {
    console.error('LD export failed:', e);
    process.exit(1);
  }
})();