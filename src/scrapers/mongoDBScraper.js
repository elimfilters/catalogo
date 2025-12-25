// ============================================================================
// MONGODB REPOSITORY – ELIMFILTERS (SAFE MODE)
// - Persistencia exclusiva ELIMFILTERS / EM9
// - Nunca scrapea
// - Nunca infiere
// - Nunca rompe el servidor si Mongo no está disponible
// ============================================================================

let MongoClient;
try {
  ({ MongoClient } = require('mongodb'));
} catch (_) {
  console.warn('❌ MongoDB dependency not installed. MongoDB repository disabled.');
}

class MongoDBRepository {
  constructor() {
    this.client = null;
    this.db = null;
    this.collection = null;
    this.enabled = Boolean(MongoClient);
    this.connected = false;
  }

  // ---------------------------------------------------------------------------
  // CONEXIÓN SEGURA
  // ---------------------------------------------------------------------------
  async connect() {
    if (!this.enabled || this.connected) return;

    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      console.warn('⚠️ MongoDB URI not defined. Repository disabled.');
      this.enabled = false;
      return;
    }

    try {
      this.client = new MongoClient(uri);
      await this.client.connect();
      
      // Extraer nombre de BD de la URI o usar default
      const dbName = uri.match(/\.net\/([^?]+)/)?.[1] || 'elimfilters';
      this.db = this.client.db(dbName);
      this.collection = this.db.collection('filters');

      await this.collection.createIndex({ sku: 1 }, { unique: true });
      await this.collection.createIndex({ family: 1 });
      await this.collection.createIndex({ duty: 1 });

      this.connected = true;
      console.log('✅ MongoDB repository connected');
    } catch (err) {
      console.error('❌ MongoDB connection failed:', err.message);
      this.enabled = false;
    }
  }

  // ---------------------------------------------------------------------------
  // BUSCAR POR SKU (ELIMFILTERS ONLY)
  // ---------------------------------------------------------------------------
  async findBySKU(sku) {
    if (!this.enabled) return null;
    await this.connect();
    if (!this.connected) return null;

    const normalized = String(sku).trim().toUpperCase();

    try {
      const doc = await this.collection.findOne({
        sku: normalized,
        status: 'active'
      });

      return doc ? this._sanitize(doc) : null;
    } catch (err) {
      console.error('[MongoDB] findBySKU error:', err.message);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // UPSERT ELIMFILTERS (EM9 / EL8 / EF9 / etc.)
  // ---------------------------------------------------------------------------
  async upsert(record) {
    if (!this.enabled) return false;
    await this.connect();
    if (!this.connected) return false;

    if (!record?.sku) return false;

    const sku = String(record.sku).trim().toUpperCase();

    try {
      await this.collection.updateOne(
        { sku },
        {
          $set: {
            ...record,
            sku,
            updated_at: new Date()
          },
          $setOnInsert: {
            created_at: new Date(),
            status: 'active'
          }
        },
        { upsert: true }
      );

      return true;
    } catch (err) {
      console.error('[MongoDB] upsert error:', err.message);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // SANITIZAR DOCUMENTO
  // ---------------------------------------------------------------------------
  _sanitize(doc) {
    if (!doc) return null;
    const { _id, ...safe } = doc;
    return safe;
  }

  // ---------------------------------------------------------------------------
  // CIERRE
  // ---------------------------------------------------------------------------
  async close() {
    if (this.client) {
      await this.client.close();
      this.connected = false;
    }
  }

  // ---------------------------------------------------------------------------
  // SEARCH (para endpoint /search)
  // ---------------------------------------------------------------------------
  async search(query) {
    if (!this.enabled) {
      return { success: false, error: 'MongoDB not available' };
    }

    try {
      await this.connect();
      if (!this.connected) {
        return { success: false, error: 'MongoDB connection failed' };
      }

      const normalizedQuery = query.toUpperCase().trim();
      
      // Buscar por SKU, OEM codes o cross reference
      const results = await this.collection.find({
        $or: [
          { sku: normalizedQuery },
          { query_norm: normalizedQuery },
          { oem_codes: { $regex: normalizedQuery, $options: 'i' } },
          { cross_reference: { $regex: normalizedQuery, $options: 'i' } }
        ]
      }).limit(10).toArray();

      return {
        success: true,
        count: results.length,
        results: results
      };
    } catch (error) {
      console.error('MongoDB search error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new MongoDBRepository();
