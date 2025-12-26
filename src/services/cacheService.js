const mongoService = require('./mongoService');
const googleSheetWriter = require('./googleSheetWriter');

async function get(codigo) {
  try {
    const normalized = String(codigo).trim().toUpperCase();
    
    try {
      const mongoResult = await mongoService.findByCode(normalized);
      if (mongoResult) {
        console.log(`✅ [CACHE] MongoDB hit: ${normalized}`);
        return mongoResult;
      }
    } catch (mongoError) {
      console.error(`⚠️ [CACHE] MongoDB:`, mongoError.message);
    }
    
    try {
      const sheetsResult = await googleSheetWriter.findByCode(normalized);
      if (sheetsResult) {
        console.log(`✅ [CACHE] Sheets hit: ${normalized}`);
        try {
          await mongoService.upsert(sheetsResult);
        } catch (syncError) {
          console.error(`⚠️ [CACHE] Sync:`, syncError.message);
        }
        return sheetsResult;
      }
    } catch (sheetsError) {
      console.error(`⚠️ [CACHE] Sheets:`, sheetsError.message);
    }
    
    console.log(`ℹ️ [CACHE] Miss: ${normalized}`);
    return null;
  } catch (error) {
    console.error(`❌ [CACHE] Error:`, error);
    return null;
  }
}

async function getBySKU(sku) {
  try {
    const normalized = String(sku).trim().toUpperCase();
    
    try {
      const mongoResult = await mongoService.findBySKU(normalized);
      if (mongoResult) {
        console.log(`✅ [CACHE] MongoDB SKU: ${normalized}`);
        return mongoResult;
      }
    } catch (mongoError) {
      console.error(`⚠️ [CACHE] MongoDB SKU:`, mongoError.message);
    }
    
    try {
      const sheetsResult = await googleSheetWriter.findBySKU(normalized);
      if (sheetsResult) {
        console.log(`✅ [CACHE] Sheets SKU: ${normalized}`);
        try {
          await mongoService.upsert(sheetsResult);
        } catch (syncError) {
          console.error(`⚠️ [CACHE] Sync SKU:`, syncError.message);
        }
        return sheetsResult;
      }
    } catch (sheetsError) {
      console.error(`⚠️ [CACHE] Sheets SKU:`, sheetsError.message);
    }
    
    console.log(`ℹ️ [CACHE] SKU Miss: ${normalized}`);
    return null;
  } catch (error) {
    console.error(`❌ [CACHE] SKU Error:`, error);
    return null;
  }
}

async function getByCrossReference(codigo) {
  try {
    const normalized = String(codigo).trim().toUpperCase();
    try {
      const mongoResult = await mongoService.findByCrossReference(normalized);
      if (mongoResult) {
        console.log(`✅ [CACHE] MongoDB cross-ref: ${normalized}`);
        return mongoResult;
      }
    } catch (mongoError) {
      console.error(`⚠️ [CACHE] MongoDB cross-ref:`, mongoError.message);
    }
    return null;
  } catch (error) {
    console.error(`❌ [CACHE] Cross-ref:`, error);
    return null;
  }
}

async function invalidate(codigo) {
  try {
    console.log(`🗑️ [CACHE] Invalidando: ${codigo}`);
    try {
      await mongoService.deleteByCode(codigo);
    } catch (mongoError) {
      console.error(`⚠️ [CACHE] Delete:`, mongoError.message);
    }
    return { success: true };
  } catch (error) {
    console.error(`❌ [CACHE] Invalidate:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = { get, getBySKU, getByCrossReference, invalidate };
