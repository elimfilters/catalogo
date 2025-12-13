// VIN Application Map Service (MongoDB)
// Provides normalization and lookup for vin_application_map collection

const mongoService = require('./mongoService');

let indexesEnsured = false;

const MAKE_ALIASES = {
  'GM': 'CHEVROLET',
  'GENERAL MOTORS': 'CHEVROLET',
  'VW': 'VOLKSWAGEN',
  'MB': 'MERCEDES-BENZ',
  'MERCEDES': 'MERCEDES-BENZ',
  'NISSAN-USA': 'NISSAN',
  'TOYOTA USA': 'TOYOTA',
  'DODGE RAM': 'RAM',
  'FCA': 'RAM',
  'VAG': 'VOLKSWAGEN',
  'BAYERISCHE MOTOREN WERKE': 'BMW',
  'BENZ': 'MERCEDES-BENZ',
};

function normalizeMake(make) {
  const m = String(make || '').trim().toUpperCase();
  return MAKE_ALIASES[m] || m;
}

function normalizeModel(model) {
  return String(model || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function normalizeYear(year) {
  const y = parseInt(year, 10);
  if (!y || isNaN(y)) return null;
  if (y < 1900 || y > 2100) return null;
  return y;
}

function normalizeEngineLiters(engineStr) {
  const raw = String(engineStr || '').toUpperCase();
  const numMatch = raw.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (numMatch) {
    const n = parseFloat(numMatch[1]);
    if (!isNaN(n)) {
      const fixed = Number.isInteger(n) ? `${n.toFixed(1)}` : `${n}`;
      return `${fixed}L`;
    }
  }
  return raw.replace(/\s+/g, '');
}

function buildKey({ make, model, year, engine_liters }) {
  const mk = normalizeMake(make);
  const md = normalizeModel(model);
  const yr = normalizeYear(year);
  const eng = normalizeEngineLiters(engine_liters);
  if (!mk || !md || !yr || !eng) return null;
  return `${mk}_${md}_${yr}_${eng}`;
}

async function ensureIndexes(col) {
  if (indexesEnsured) return;
  try {
    await col.createIndex({ make_model_year_engine: 1 }, { unique: false });
    await col.createIndex({ make: 1, model: 1, year: 1 });
    await col.createIndex({ filter_type: 1 });
    await col.createIndex({ make_model_year_engine: 1, filter_type: 1 }, { unique: true });
  } catch (_) {}
  indexesEnsured = true;
}

async function getCollection() {
  const db = await mongoService.connect();
  if (!db) return null;
  const col = db.collection('vin_application_map');
  await ensureIndexes(col);
  return col;
}

async function findByKey(key) {
  const col = await getCollection();
  if (!col || !key) return [];
  return await col.find({ make_model_year_engine: key }).toArray();
}

async function findByDecoded(vehicleInfo) {
  const key = buildKey({
    make: vehicleInfo?.make,
    model: vehicleInfo?.model,
    year: vehicleInfo?.year,
    engine_liters: vehicleInfo?.engine?.displacement_l,
  });
  if (!key) return [];
  return await findByKey(key);
}

async function upsertMapping(doc) {
  const col = await getCollection();
  if (!col) return null;
  const key = buildKey({
    make: doc?.make,
    model: doc?.model,
    year: doc?.year,
    engine_liters: doc?.engine_liters,
  });
  if (!key) throw new Error('Invalid document for upsert');
  const payload = {
    make_model_year_engine: key,
    make: normalizeMake(doc.make),
    model: normalizeModel(doc.model),
    year: normalizeYear(doc.year),
    engine_liters: normalizeEngineLiters(doc.engine_liters),
    filter_type: String(doc.filter_type || '').toUpperCase(),
    oem_code_target: String(doc.oem_code_target || '').toUpperCase(),
    source: doc.source || 'scraper',
    created_at: new Date(),
    updated_at: new Date(),
  };
  await col.updateOne(
    { make_model_year_engine: payload.make_model_year_engine, filter_type: payload.filter_type },
    { $set: payload },
    { upsert: true }
  );
  return payload;
}

function filterTypeToKey(filterType) {
  const t = String(filterType || '').toUpperCase();
  if (t === 'OIL') return 'oil_filter';
  if (t === 'AIR') return 'air_filter';
  if (t === 'FUEL') return 'fuel_filter';
  if (t === 'CABIN') return 'cabin_filter';
  return t.toLowerCase();
}

module.exports = {
  normalizeMake,
  normalizeModel,
  normalizeYear,
  normalizeEngineLiters,
  buildKey,
  findByKey,
  findByDecoded,
  upsertMapping,
  filterTypeToKey,
};
