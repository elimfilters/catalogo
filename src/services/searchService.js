const cacheService = require('./cacheService');
const persistenceService = require('./persistenceService');
const { scrapeDonaldson } = require('../scrapers/donaldsonScraper');
const { scrapeFRAM } = require('../scrapers/framScraper');
const { generateSKU } = require('../sku/generator');
const { code: normalize } = require('../utils/normalize');
const { extract4Digits } = require('../utils/digitExtractor');
const { determineDuty } = require('../utils/determineDuty');

async function search(codigoEntrada) {
  const startTime = Date.now();
  try {
    console.log(`[SEARCH] Iniciando: ${codigoEntrada}`);
    const codigoNormalizado = normalize(codigoEntrada);
    if (!codigoNormalizado) {
      return { success: false, error: 'INVALID_CODE', message: 'Codigo invalido' };
    }
    
    // ============================================================================
    // PASO 1: VERIFICAR CACHE
    // ============================================================================
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
    
    // ============================================================================
    // PASO 2: SCRAPING PARALELO
    // ============================================================================
    console.log(`[SCRAPING] Codigo no en cache...`);
    const [donaldsonResult, framResult] = await Promise.allSettled([
      scrapeDonaldson(codigoNormalizado),
      scrapeFRAM(codigoNormalizado)
    ]);
    
    const donaldsonFound = donaldsonResult.status === 'fulfilled' && donaldsonResult.value?.encontrado;
    const framFound = framResult.status === 'fulfilled' && framResult.value?.encontrado;
    
    let scrapedData = null;
    let manufacturer = null;
    
    // ============================================================================
    // PASO 3: DECISIÓN INTELIGENTE BASADA EN DUTY TYPE
    // ============================================================================
    
    // CASO A: Ambos scrapers encontraron el filtro → Decidir por duty type
    if (donaldsonFound && framFound) {
      const donaldsonData = donaldsonResult.value.datos;
      const framData = framResult.value.datos;
      
      console.log(`[CONFLICT] Ambos encontraron el código`);
      console.log(`[DONALDSON] Duty: ${donaldsonData.duty_type} | Engine: ${donaldsonData.engine_applications}`);
      console.log(`[FRAM] Duty: ${framData.duty_type} | Engine: ${framData.engine_applications}`);
      
      // ✅ Si Donaldson detectó HD → USAR DONALDSON
      if (donaldsonData.duty_type === 'HD') {
        scrapedData = donaldsonData;
        manufacturer = 'DONALDSON';
        console.log(`[DECISION] Usando DONALDSON (duty_type: HD)`);
      } 
      // ✅ Si Donaldson detectó LD pero FRAM también es LD → USAR FRAM (más especializado en LD)
      else if (donaldsonData.duty_type === 'LD' && framData.duty_type === 'LD') {
        scrapedData = framData;
        manufacturer = 'FRAM';
        console.log(`[DECISION] Usando FRAM (ambos LD, FRAM más especializado)`);
      }
      // ✅ Conflicto: Donaldson dice LD pero FRAM dice HD (raro) → Verificar manualmente
      else {
        // Re-verificar con determineDuty usando data de ambos
        const allText = `${donaldsonData.engine_applications} ${donaldsonData.equipment_applications} ${donaldsonData.description}`;
        const verifiedDuty = determineDuty(
          donaldsonData.engine_applications || '',
          donaldsonData.equipment_applications || '',
          allText
        );
        
        console.log(`[RE-VERIFICATION] determineDuty result: ${verifiedDuty}`);
        
        if (verifiedDuty === 'HD') {
          scrapedData = donaldsonData;
          manufacturer = 'DONALDSON';
          console.log(`[DECISION] Usando DONALDSON (re-verificado como HD)`);
        } else {
          scrapedData = framData;
          manufacturer = 'FRAM';
          console.log(`[DECISION] Usando FRAM (re-verificado como LD)`);
        }
      }
    }
    // CASO B: Solo Donaldson encontró
    else if (donaldsonFound) {
      scrapedData = donaldsonResult.value.datos;
      manufacturer = 'DONALDSON';
      console.log(`[DONALDSON] Encontrado - Duty: ${scrapedData.duty_type}`);
    }
    // CASO C: Solo FRAM encontró
    else if (framFound) {
      scrapedData = framResult.value.datos;
      manufacturer = 'FRAM';
      console.log(`[FRAM] Encontrado - Duty: ${scrapedData.duty_type}`);
    }
    
    // ============================================================================
    // PASO 4: VALIDAR RESULTADO
    // ============================================================================
    if (!scrapedData) {
      console.log(`[NOT FOUND] Código no encontrado en ningún scraper`);
      return { success: false, error: 'NOT_FOUND', message: 'Codigo no encontrado' };
    }
    
    // ============================================================================
    // PASO 5: GENERAR SKU
    // ============================================================================
    const last4 = extract4Digits(scrapedData.norm || codigoNormalizado);
    if (!last4) {
      console.error(`[EXTRACT] No se pudieron extraer 4 digitos de: ${scrapedData.norm || codigoNormalizado}`);
      return { success: false, error: 'INVALID_DIGITS', message: 'No se pudieron extraer digitos del codigo' };
    }
    
    const skuResult = generateSKU(scrapedData.type, scrapedData.duty_type, last4);
    
    if (skuResult.error) {
      console.error(`[SKU] Error generando SKU:`, skuResult.error);
      scrapedData.sku = `ERROR_${codigoNormalizado}`;
    } else {
      scrapedData.sku = skuResult;
    }
    
    console.log(`[SKU GENERADO] ${scrapedData.sku} | Tipo: ${scrapedData.type} | Duty: ${scrapedData.duty_type} | Source: ${manufacturer}`);
    
    // ============================================================================
    // PASO 6: PERSISTIR
    // ============================================================================
    try {
      await persistenceService.save(scrapedData);
      console.log(`[PERSIST] ✅ Guardado en cache`);
    } catch (persistError) {
      console.error(`[PERSIST] ❌ Error:`, persistError.message);
    }
    
    // ============================================================================
    // PASO 7: RETORNAR RESULTADO
    // ============================================================================
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
    console.error(`[SEARCH BY SKU] Error:`, error);
    return { success: false, error: 'INTERNAL_ERROR', message: error.message };
  }
}

module.exports = { search, searchBySKU };
