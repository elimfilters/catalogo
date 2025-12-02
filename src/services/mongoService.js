// ============================================================================
// MONGODB SERVICE - Minimal, resilient implementation
// Provides caching helpers used by detection/sync services.
// If `MONGODB_URI` is not set, functions degrade gracefully.
// ============================================================================

const { MongoClient } = require('mongodb');

let client = null;
let db = null;
let filtersCollection = null;

const COLLECTION_NAME = 'master_catalog';

function hasMongoEnv() {
  return !!process.env.MONGODB_URI;
}

async function connect() {
  if (!hasMongoEnv()) {
    console.log('ℹ️  MongoDB disabled: MONGODB_URI not set');
    return null;
  }
  if (client && client.topology && client.topology.isConnected()) {
    return db;
  }
  const mongoUri = process.env.MONGODB_URI;
  client = new MongoClient(mongoUri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  db = client.db();
  filtersCollection = db.collection(COLLECTION_NAME);
  try {
    // Índices para rendimiento
    await filtersCollection.createIndex({ code_client: 1 });
    await filtersCollection.createIndex({ code_oem: 1 });
    await filtersCollection.createIndex({ sku: 1 });
    await filtersCollection.createIndex({ duty: 1, family: 1 });
    await filtersCollection.createIndex({ timestamp: -1 });
    // Clave única: normsku
    await filtersCollection.createIndex({ normsku: 1 }, { unique: true });
    // Búsqueda de texto básica sobre código cliente
    try { await filtersCollection.createIndex({ code_client: 'text' }); } catch (_) {}
  } catch (e) {
    console.log('⚠️  Index creation skipped:', e.message);
  }
  console.log('✅ MongoDB connected');
  return db;
}

async function disconnect() {
  try {
    if (client) {
      await client.close();
      client = null; db = null; filtersCollection = null;
      console.log('✅ MongoDB disconnected');
    }
  } catch (e) {
    console.log('⚠️  MongoDB disconnect error:', e.message);
  }
}

// Read operations
async function searchCache(code) {
  try {
    if (!hasMongoEnv()) return null;
    await connect();
    const normalized = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const result = await filtersCollection.findOne({
      $or: [
        { code_client_normalized: normalized },
        { code_oem_normalized: normalized },
      ],
    });
    if (!result) return null;
    return {
      found: true,
      cached: true,
      code_client: result.code_client,
      code_oem: result.code_oem,
      duty: result.duty,
      family: result.family,
      sku: result.sku,
      media: result.media,
      source: result.source,
      cross_reference: result.cross_reference || [],
      applications: result.applications || [],
      attributes: result.attributes || {},
      timestamp: result.timestamp,
      _id: result._id,
    };
  } catch (e) {
    console.log('⚠️  Cache search error:', e.message);
    return null;
  }
}

async function getAllFilters(filter = {}, limit = 100) {
  try {
    if (!hasMongoEnv()) return [];
    await connect();
    return await filtersCollection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  } catch (e) {
    console.log('⚠️  getAllFilters error:', e.message);
    return [];
  }
}

// Write operations
async function saveToCache(data) {
  try {
    if (!hasMongoEnv()) return null;
    await connect();
    const normalizedClient = (data.query || data.code_client || '')
      .toUpperCase().replace(/[^A-Z0-9]/g, '');
    const normalizedOEM = (data.oem_equivalent || data.code_oem || '')
      .toUpperCase().replace(/[^A-Z0-9]/g, '');
    const existing = await filtersCollection.findOne({
      $or: [
        { code_client_normalized: normalizedClient },
        { code_oem_normalized: normalizedOEM },
      ],
    });
    if (existing) return existing;
    const toArray = (v) => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      return String(v).split(',').map(s => s.trim()).filter(Boolean);
    };

    const document = {
      code_client: data.query || data.code_client,
      code_client_normalized: normalizedClient,
      normsku: data.normsku || normalizedClient,
      code_oem: data.oem_equivalent || data.code_oem,
      code_oem_normalized: normalizedOEM,
      duty: data.duty,
      family: data.family,
      sku: data.sku,
      media: data.media,
      source: data.source,
      oem_codes: toArray(data.oem_codes),
      cross_reference: toArray(data.cross_reference),
      engine_applications: Array.isArray(data.engine_applications) ? data.engine_applications : toArray(data.engine_applications),
      equipment_applications: Array.isArray(data.equipment_applications) ? data.equipment_applications : toArray(data.equipment_applications),
      manufacturing_standards: toArray(data.manufacturing_standards),
      certification_standards: toArray(data.certification_standards),
      applications: Array.isArray(data.applications) ? data.applications : toArray(data.applications),
      attributes: data.attributes || {},
      timestamp: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    return await filtersCollection.insertOne(document);
  } catch (e) {
    console.log('⚠️  saveToCache error:', e.message);
    return null;
  }
}

// Placeholders for optional APIs used elsewhere
async function updateCache() { /* no-op */ }
async function deleteFromCache() { /* no-op */ }
async function getCacheStats() { return null; }
async function clearCache() { return 0; }

module.exports = {
  connect,
  disconnect,
  searchCache,
  saveToCache,
  updateCache,
  deleteFromCache,
  getAllFilters,
  getCacheStats,
  clearCache,
};