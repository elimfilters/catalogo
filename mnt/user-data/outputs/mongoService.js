// ============================================================================
// MONGODB SERVICE - Master Catalog Cache
// Fast caching layer for filter lookups
// ============================================================================

const { MongoClient } = require('mongodb');

// ============================================================================
// CONFIGURATION
// ============================================================================

let client = null;
let db = null;
let filtersCollection = null;

const COLLECTION_NAME = 'master_catalog';

// ============================================================================
// CONNECTION
// ============================================================================

/**
 * Initialize MongoDB connection
 */
async function connect() {
    try {
        if (client && client.topology && client.topology.isConnected()) {
            return db;
        }

        const mongoUri = process.env.MONGODB_URI;
        
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable not set');
        }

        console.log('📊 Connecting to MongoDB...');
        
        client = new MongoClient(mongoUri, {
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
        });

        await client.connect();
        
        db = client.db(); // Use database from connection string
        filtersCollection = db.collection(COLLECTION_NAME);

        // Create indexes for fast lookups
        await createIndexes();

        console.log('✅ MongoDB connected successfully');
        return db;

    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
    }
}

/**
 * Create indexes for optimized queries
 */
async function createIndexes() {
    try {
        await filtersCollection.createIndex({ code_client: 1 });
        await filtersCollection.createIndex({ code_oem: 1 });
        await filtersCollection.createIndex({ sku: 1 });
        await filtersCollection.createIndex({ duty: 1, family: 1 });
        await filtersCollection.createIndex({ timestamp: -1 });
        
        console.log('✅ MongoDB indexes created');
    } catch (error) {
        console.log('⚠️  Index creation error (non-critical):', error.message);
    }
}

/**
 * Close MongoDB connection
 */
async function disconnect() {
    try {
        if (client) {
            await client.close();
            console.log('✅ MongoDB disconnected');
        }
    } catch (error) {
        console.error('❌ MongoDB disconnect error:', error.message);
    }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Search for a code in the cache
 * @param {string} code - Code to search (client code or OEM code)
 * @returns {object|null} - Cached result or null
 */
async function searchCache(code) {
    try {
        await connect();

        const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

        // Search by code_client OR code_oem
        const result = await filtersCollection.findOne({
            $or: [
                { code_client_normalized: normalizedCode },
                { code_oem_normalized: normalizedCode }
            ]
        });

        if (result) {
            console.log(`⚡ Cache HIT: ${code} → ${result.sku}`);
            
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
                _id: result._id
            };
        }

        console.log(`🔍 Cache MISS: ${code}`);
        return null;

    } catch (error) {
        console.error('❌ Cache search error:', error.message);
        return null; // Fail gracefully
    }
}

/**
 * Get all filters from cache
 * @param {object} filter - MongoDB filter query
 * @param {number} limit - Max results
 * @returns {array} - Array of filters
 */
async function getAllFilters(filter = {}, limit = 100) {
    try {
        await connect();

        const results = await filtersCollection
            .find(filter)
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();

        return results;

    } catch (error) {
        console.error('❌ Error fetching all filters:', error.message);
        return [];
    }
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
    try {
        await connect();

        const total = await filtersCollection.countDocuments();
        const byDuty = await filtersCollection.aggregate([
            { $group: { _id: '$duty', count: { $sum: 1 } } }
        ]).toArray();
        const byFamily = await filtersCollection.aggregate([
            { $group: { _id: '$family', count: { $sum: 1 } } }
        ]).toArray();

        return {
            total,
            by_duty: byDuty,
            by_family: byFamily
        };

    } catch (error) {
        console.error('❌ Error getting cache stats:', error.message);
        return null;
    }
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Save result to cache
 * @param {object} data - Detection result to cache
 */
async function saveToCache(data) {
    try {
        await connect();

        const normalizedClient = (data.query || data.code_client || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const normalizedOEM = (data.oem_equivalent || data.code_oem || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

        // Check if already exists
        const existing = await filtersCollection.findOne({
            $or: [
                { code_client_normalized: normalizedClient },
                { code_oem_normalized: normalizedOEM }
            ]
        });

        if (existing) {
            console.log(`⚠️  Already in cache: ${data.query} → ${existing.sku}`);
            return existing;
        }

        // Prepare document
        const document = {
            code_client: data.query || data.code_client,
            code_client_normalized: normalizedClient,
            code_oem: data.oem_equivalent || data.code_oem,
            code_oem_normalized: normalizedOEM,
            duty: data.duty,
            family: data.family,
            sku: data.sku,
            media: data.media,
            source: data.source,
            cross_reference: data.cross_reference || [],
            applications: data.applications || [],
            attributes: data.attributes || {},
            timestamp: new Date(),
            created_at: new Date(),
            updated_at: new Date()
        };

        // Insert
        const result = await filtersCollection.insertOne(document);
        
        console.log(`💾 Saved to cache: ${data.query} → ${data.sku} (ID: ${result.insertedId})`);
        
        return result;

    } catch (error) {
        console.error('❌ Error saving to cache:', error.message);
        // Don't throw - caching is optional
    }
}

/**
 * Update existing cache entry
 * @param {string} code - Code to find
 * @param {object} data - New data
 */
async function updateCache(code, data) {
    try {
        await connect();

        const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

        const result = await filtersCollection.updateOne(
            {
                $or: [
                    { code_client_normalized: normalizedCode },
                    { code_oem_normalized: normalizedCode }
                ]
            },
            {
                $set: {
                    code_oem: data.oem_equivalent || data.code_oem,
                    duty: data.duty,
                    family: data.family,
                    sku: data.sku,
                    media: data.media,
                    source: data.source,
                    cross_reference: data.cross_reference || [],
                    applications: data.applications || [],
                    attributes: data.attributes || {},
                    updated_at: new Date()
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`🔄 Updated cache: ${code}`);
            return true;
        }

        return false;

    } catch (error) {
        console.error('❌ Error updating cache:', error.message);
        return false;
    }
}

/**
 * Delete from cache
 * @param {string} code - Code to delete
 */
async function deleteFromCache(code) {
    try {
        await connect();

        const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

        const result = await filtersCollection.deleteOne({
            $or: [
                { code_client_normalized: normalizedCode },
                { code_oem_normalized: normalizedCode }
            ]
        });

        if (result.deletedCount > 0) {
            console.log(`🗑️  Deleted from cache: ${code}`);
            return true;
        }

        return false;

    } catch (error) {
        console.error('❌ Error deleting from cache:', error.message);
        return false;
    }
}

/**
 * Clear entire cache (use with caution!)
 */
async function clearCache() {
    try {
        await connect();

        const result = await filtersCollection.deleteMany({});
        
        console.log(`🗑️  Cache cleared: ${result.deletedCount} documents deleted`);
        return result.deletedCount;

    } catch (error) {
        console.error('❌ Error clearing cache:', error.message);
        return 0;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    connect,
    disconnect,
    searchCache,
    saveToCache,
    updateCache,
    deleteFromCache,
    getAllFilters,
    getCacheStats,
    clearCache
};
