const cacheService = require('./cacheService');
const persistenceService = require('./persistenceService');
const { scrapeDonaldson } = require('../scrapers/donaldsonScraper');
const { scrapeFRAM } = require('../scrapers/framScraper');
const { generateSKU } = require('../sku/generator');
const { code: normalize } = require('../utils/normalize');

async function search(codigoEntrada) {
  const startTime = Date.now();
  try {
    console.log(`[SEARCH] Iniciando: ${codigoEntrada}`);
    const codigoNormalizado = normalize(codigoEntrada);
    if (!codigoNormalizado) {
      return { success: false, error: 'INVALID_CODE', message: 'Codigo invalido' };
    }
    
    const cached = await cacheService.get(codigoNormalizado);
    if (cached) {
      const elapsed = Date.now() - startTime;
      console.log(`[CACHE HIT] ${elapsed}ms`);
      return {
        success: true,
        source: cached.source || 'CACHE',
        cache_hit: true,
        sku: cached.sku,
        data: cached,
        performance: { total_ms: elapsed, cache_hit: true }
      };
    }
    
    console.log(`[SCRAPING] Codigo no en cache...`);
    const [donaldsonResult, framResult] = await Promise.allSettled([
      scrapeDonaldson(codigoNormalizado),
      scrapeFRAM(codigoNormalizado)
    ]);
    
    let scrapedData = null;
    let duty = null;
    let manufacturer = null;
    
    if (donaldsonResult.status === 'fulfilled' && donaldsonResult.value?.encontrado) {
      scrapedData = donaldsonResult.value.datos;
      duty = 'HD';
      manufacturer = 'DONALDSON';
      console.log(`[DONALDSON] Encontrado`);
    } else if (framResult.status === 'fulfilled' && framResult.value?.encontrado) {
      scrapedData = framResult.value.datos;
      duty = 'LD';
      manufacturer = 'FRAM';
      console.log(`[FRAM] Encontrado`);
    }
    
    if (!scrapedData) {
      console.log(`[NOT FOUND]`);
      return { success: false, error: 'NOT_FOUND', message: 'Codigo no encontrado' };
    }
    
    const skuResult = generateSKU(scrapedData.type, duty, scrapedData.norm || codigoNormalizado);
    scrapedData.sku = skuResult.sku || skuResult || `TEMP_${codigoNormalizado}`;
    
    try {
      await persistenceService.save(scrapedData);
    } catch (persistError) {
      console.error(`[PERSIST] Error:`, persistError.message);
    }
    
    const elapsed = Date.now() - startTime;
    return {
      success: true,
      source: manufacturer,
      cache_hit: false,
      sku: scrapedData.sku,
      data: scrapedData,
      performance: { total_ms: elapsed, scraper_used: manufacturer }
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[SEARCH] Error:`, error);
    return { success: false, error: 'INTERNAL_ERROR', message: error.message };
  }
}

async function searchBySKU(sku) {
  try {
    const result = await cacheService.getBySKU(sku);
    if (result) {
      return { success: true, source: 'ELIMFILTERS_SKU', data: result };
    }
    return { success: false, error: 'SKU_NOT_FOUND' };
  } catch (error) {
    return { success: false, error: 'INTERNAL_ERROR', message: error.message };
  }
}

module.exports = { search, searchBySKU };
