const http = require('http');
const { MongoClient } = require('mongodb');
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

function extractEngine(name) {
  if (!name) return '';
  let m = name.match(/w\/([^)]*?)\s*Engine/i);
  if (m) return m[1].trim();
  m = name.match(/with\s+([A-Za-z][A-Za-z]+\s+[A-Za-z0-9\-]+)\s+Engine$/i);
  if (m) return m[1].trim();
  m = name.match(/([A-Za-z][A-Za-z]+(?:\s+[A-Za-z0-9\-]+){0,2})\s+Engine$/i);
  if (m) return m[1].trim();
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

function isVehicleByParsed({ Years, Make, Model }) {
  const make = String(Make || '').toUpperCase();
  const years = String(Years || '').trim();
  const model = String(Model || '');
  if (/\bengine\b/i.test(model)) return false;
  if (EQUIPMENT_BRANDS.has(make)) return false;
  if (VEHICLE_BRANDS.has(make)) return true;
  return years.length > 0;
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
  const argv = process.argv.slice(2);
  const getArg = (flag, def) => {
    const ix = argv.indexOf(flag);
    if (ix >= 0 && argv[ix + 1]) return argv[ix + 1];
    return def;
  };
  const mongoUri = getArg('--mongoUri') || process.env.MONGODB_URI;
  const dbName = getArg('--db', 'ElimFilters');
  const dry = argv.includes('--dry');
  const sku = getArg('--sku', 'PH6607');

  try {
    const j = await fetchJSON(`http://localhost:8080/api/detect/${sku}`);
    const apps = Array.isArray(j.equipment_applications) ? j.equipment_applications : [];
    // Build vehicle-only equipment applications
    const equipment = [];
    for (const a of apps) {
      const name = String(a.name || '');
      const years = String(a.years || '');
      // Parse to Make/Model similar to export script
      let base = name;
      const idxW = name.indexOf(' w/');
      const idxParen = name.indexOf('(');
      if (idxW >= 0 && (idxParen < 0 || idxW < idxParen)) base = name.substring(0, idxW);
      else if (idxParen >= 0) base = name.substring(0, idxParen);
      const { make, model } = splitMakeModel(base);
      const parsed = { Years: years, Make: make, Model: model };
      if (!isVehicleByParsed(parsed)) continue;
      equipment.push({ name, years });
    }

    const engines = [];
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
      // Only keep engines tied to vehicle applications
      if (!isVehicleByParsed({ Years: years, Make: make, Model: model })) continue;
      engines.push({ engine, make, model, years });
    }

    console.log(`Prepared documents for sku=${sku}: equipment=${equipment.length}, engines=${engines.length}`);

    if (dry) {
      console.log('Dry run: no DB writes performed.');
      process.exit(0);
    }

    if (!mongoUri) {
      console.error('Missing --mongoUri. Provide your MongoDB connection string.');
      process.exit(1);
    }

    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(dbName);

    const equipmentColl = db.collection('equipmentApplications');
    const enginesColl = db.collection('engineApplications');

    const now = new Date();
    await equipmentColl.updateOne(
      { sku, source: 'FRAM' },
      { $set: { sku, source: 'FRAM', applications: equipment, updated_at: now }, $setOnInsert: { created_at: now } },
      { upsert: true }
    );

    await enginesColl.updateOne(
      { sku, source: 'FRAM' },
      { $set: { sku, source: 'FRAM', engines, updated_at: now }, $setOnInsert: { created_at: now } },
      { upsert: true }
    );

    console.log('MongoDB upserts completed.');
    await client.close();
  } catch (e) {
    console.error('Load to Mongo failed:', e);
    process.exit(1);
  }
})();