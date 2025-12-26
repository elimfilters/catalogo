const mongoService = require('./mongoService');
const googleSheetWriter = require('./googleSheetWriter');

async function save(data) {
  try {
    console.log(`💾 [PERSIST] Guardando: ${data.sku || data.norm || 'unknown'}`);
    
    const results = { sheets: null, mongodb: null, success: false };
    
    const [sheetsResult, mongoResult] = await Promise.allSettled([
      googleSheetWriter.append(data),
      mongoService.upsert(data)
    ]);
    
    if (sheetsResult.status === 'fulfilled') {
      results.sheets = { success: true, data: sheetsResult.value };
      console.log(`✅ [PERSIST] Sheets OK`);
    } else {
      results.sheets = { success: false, error: sheetsResult.reason?.message };
      console.error(`❌ [PERSIST] Sheets:`, sheetsResult.reason);
    }
    
    if (mongoResult.status === 'fulfilled') {
      results.mongodb = { success: true, data: mongoResult.value };
      console.log(`✅ [PERSIST] MongoDB OK`);
    } else {
      results.mongodb = { success: false, error: mongoResult.reason?.message };
      console.error(`❌ [PERSIST] MongoDB:`, mongoResult.reason);
    }
    
    results.success = results.sheets.success || results.mongodb.success;
    
    if (!results.success) {
      throw new Error('Failed to persist in both Sheets and MongoDB');
    }
    
    return results;
  } catch (error) {
    console.error(`❌ [PERSIST] Error:`, error);
    throw error;
  }
}

async function update(sku, updates) {
  try {
    console.log(`🔄 [PERSIST] Actualizando: ${sku}`);
    
    const results = { sheets: null, mongodb: null, success: false };
    
    const [sheetsResult, mongoResult] = await Promise.allSettled([
      googleSheetWriter.updateBySKU(sku, updates),
      mongoService.updateBySKU(sku, updates)
    ]);
    
    if (sheetsResult.status === 'fulfilled') {
      results.sheets = { success: true };
      console.log(`✅ [PERSIST] Sheets updated`);
    } else {
      results.sheets = { success: false, error: sheetsResult.reason?.message };
      console.error(`❌ [PERSIST] Sheets update:`, sheetsResult.reason);
    }
    
    if (mongoResult.status === 'fulfilled') {
      results.mongodb = { success: true };
      console.log(`✅ [PERSIST] MongoDB updated`);
    } else {
      results.mongodb = { success: false, error: mongoResult.reason?.message };
      console.error(`❌ [PERSIST] MongoDB update:`, mongoResult.reason);
    }
    
    results.success = results.sheets.success || results.mongodb.success;
    return results;
  } catch (error) {
    console.error(`❌ [PERSIST] Update error:`, error);
    throw error;
  }
}

module.exports = { save, update };
