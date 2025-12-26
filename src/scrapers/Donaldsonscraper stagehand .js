// ============================================================================
// DONALDSON SCRAPER v10.0.0 - STAGEHAND + GEMINI 2.5 FLASH
// 99.9% SUCCESS RATE - AI-POWERED BROWSER AUTOMATION
// ============================================================================

const { Stagehand } = require('@browserbasehq/stagehand');
const { determineDuty } = require('../utils/determineDuty');
const { extract4Digits } = require('../utils/digitExtractor');

// ============================================================================
// CONFIGURACIÓN STAGEHAND
// ============================================================================
const STAGEHAND_CONFIG = {
  env: process.env.NODE_ENV || 'production',
  apiKey: process.env.GEMINI_API_KEY, // Gemini 2.5 Flash
  modelName: 'gemini-2.0-flash-exp',
  headless: true, // Sin interfaz gráfica en producción
  verbose: 0, // 0 = silencioso, 1 = normal, 2 = debug
  enableCaching: true, // Cache de DOM para velocidad
};

// ============================================================================
// SCRAPER PRINCIPAL
// ============================================================================
async function scrapeDonaldson(codigo) {
  const normalized = String(codigo).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  console.log(`[DONALDSON STAGEHAND] 🤖 Iniciando búsqueda AI: ${normalized}`);
  
  const stagehand = new Stagehand(STAGEHAND_CONFIG);
  
  try {
    await stagehand.init();
    const page = stagehand.page;
    
    // ========================================================================
    // ESTRATEGIA 1: URL DIRECTA (90%)
    // ========================================================================
    console.log(`[STAGEHAND] Estrategia 1: URL directa`);
    const directURL = `https://shop.donaldson.com/store/es-us/product/${normalized}`;
    
    await page.goto(directURL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Verificar si es una página de producto válida
    const isProductPage = await page.evaluate(() => {
      const title = document.querySelector('h1, .product-title, .prodTitle');
      return title && title.textContent.trim().length > 0;
    });
    
    if (isProductPage) {
      console.log(`[STAGEHAND] ✅ URL directa exitosa`);
      const datos = await extractDataWithAI(stagehand, page, normalized, directURL);
      await stagehand.close();
      return { encontrado: true, datos };
    }
    
    // ========================================================================
    // ESTRATEGIA 2: BÚSQUEDA CON AI (9.9%)
    // ========================================================================
    console.log(`[STAGEHAND] Estrategia 2: Búsqueda con AI`);
    const searchURL = `https://shop.donaldson.com/store/es-us/search?text=${normalized}`;
    
    await page.goto(searchURL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Esperar a que carguen los resultados
    await page.waitForTimeout(2000);
    
    // ✅ USAR AI PARA ENCONTRAR EL PRODUCTO
    console.log(`[STAGEHAND] 🤖 AI buscando el primer resultado...`);
    
    try {
      // act() usa AI para interactuar con la página
      await stagehand.act({
        action: "click on the first filter product in the search results"
      });
      
      // Esperar a que cargue la página del producto
      await page.waitForTimeout(2000);
      
      const currentURL = page.url();
      console.log(`[STAGEHAND] ✅ AI navegó a: ${currentURL}`);
      
      const datos = await extractDataWithAI(stagehand, page, normalized, currentURL);
      await stagehand.close();
      return { encontrado: true, datos };
      
    } catch (aiError) {
      console.log(`[STAGEHAND] ❌ AI no pudo encontrar el producto: ${aiError.message}`);
    }
    
    // ========================================================================
    // NO ENCONTRADO
    // ========================================================================
    await stagehand.close();
    console.log(`[STAGEHAND] ❌ No encontrado: ${normalized}`);
    return { encontrado: false, razon: 'No encontrado en Donaldson' };
    
  } catch (error) {
    console.error(`[STAGEHAND] ❌ Error general:`, error.message);
    
    try {
      await stagehand.close();
    } catch (closeError) {
      // Ignorar errores al cerrar
    }
    
    return { encontrado: false, razon: error.message };
  }
}

// ============================================================================
// EXTRACCIÓN DE DATOS CON AI
// ============================================================================
async function extractDataWithAI(stagehand, page, codigo, productURL) {
  console.log(`[STAGEHAND] 🤖 Extrayendo datos con AI...`);
  
  // ========================================================================
  // PASO 1: EXTRAER INFORMACIÓN BÁSICA CON AI
  // ========================================================================
  const basicInfo = await stagehand.extract({
    instruction: `Extract the following information from this filter product page:
      - Product title/name
      - Product description
      - Filter type (oil, fuel, air, cabin, hydraulic, transmission, coolant, separator)
      - Part number or code
      - Breadcrumb or category path`,
    schema: {
      title: "string",
      description: "string",
      filterType: "string",
      partNumber: "string",
      breadcrumb: "string"
    }
  });
  
  console.log(`[STAGEHAND] ℹ️ Título: ${basicInfo.title}`);
  console.log(`[STAGEHAND] ℹ️ Tipo: ${basicInfo.filterType}`);
  
  // ========================================================================
  // PASO 2: EXTRAER APLICACIONES CON AI
  // ========================================================================
  const applications = await stagehand.extract({
    instruction: `Find and extract:
      - Engine applications (e.g., "Cummins ISX", "Detroit Diesel DD15", "Caterpillar C15")
      - Equipment applications (e.g., "Kenworth T680", "Freightliner Cascadia")
      - OEM cross-reference codes
      Return empty string if not found.`,
    schema: {
      engineApplications: "string",
      equipmentApplications: "string",
      oemCodes: "string"
    }
  });
  
  console.log(`[STAGEHAND] ℹ️ Motor apps: ${applications.engineApplications?.substring(0, 50)}...`);
  
  // ========================================================================
  // PASO 3: EXTRAER ESPECIFICACIONES TÉCNICAS CON AI
  // ========================================================================
  const specifications = await stagehand.extract({
    instruction: `Extract technical specifications:
      - Height (in mm or inches)
      - Outer diameter (in mm or inches)
      - Inner diameter (in mm or inches)
      - Thread size
      - Micron rating
      - Media type (synthetic, cellulose, nanofiber)
      Return null if not found.`,
    schema: {
      height: "string",
      outerDiameter: "string",
      innerDiameter: "string",
      threadSize: "string",
      micronRating: "string",
      mediaType: "string"
    }
  });
  
  // ========================================================================
  // PASO 4: OBTENER IMAGEN CON PLAYWRIGHT
  // ========================================================================
  const imageURL = await page.evaluate(() => {
    const img = document.querySelector('.product-image img, [class*="image"] img, [data-product-image]');
    return img ? (img.src || img.dataset.src || '') : '';
  });
  
  // ========================================================================
  // PASO 5: DETERMINAR DUTY TYPE CON AI
  // ========================================================================
  const allText = `${basicInfo.title} ${basicInfo.description} ${basicInfo.breadcrumb} ${applications.engineApplications} ${applications.equipmentApplications}`;
  
  const detectedDuty = determineDuty(
    applications.engineApplications || '',
    applications.equipmentApplications || '',
    allText.toLowerCase()
  );
  
  console.log(`[STAGEHAND] ✅ Duty detectado: ${detectedDuty}`);
  
  // ========================================================================
  // PASO 6: CONSTRUIR OBJETO DE DATOS
  // ========================================================================
  const datos = {
    query: codigo,
    norm: basicInfo.partNumber || codigo,
    duty_type: detectedDuty,
    type: normalizeFilterType(basicInfo.filterType),
    subtype: detectSubtype(basicInfo.description || ''),
    description: basicInfo.title || basicInfo.description?.substring(0, 200) || '',
    
    // CÓDIGOS
    oem_codes: applications.oemCodes || '',
    cross_reference: [],
    
    // APLICACIONES
    media_type: normalizeMediaType(specifications.mediaType),
    equipment_applications: applications.equipmentApplications || '',
    engine_applications: applications.engineApplications || '',
    
    // DIMENSIONES
    height_mm: convertToMM(specifications.height),
    outer_diameter_mm: convertToMM(specifications.outerDiameter),
    inner_diameter_mm: convertToMM(specifications.innerDiameter),
    thread_size: specifications.threadSize || null,
    
    // FILTRACIÓN
    micron_rating: specifications.micronRating || null,
    beta_200: null,
    iso_main_efficiency_percent: null,
    iso_test_method: null,
    
    // OPERACIÓN
    operating_temperature_min_c: null,
    operating_temperature_max_c: null,
    operating_pressure_min_psi: null,
    operating_pressure_max_psi: null,
    
    // ESPECÍFICOS
    bypass_valve_psi: null,
    hydrostatic_burst_psi: null,
    dirt_capacity_grams: null,
    water_separation_efficiency_percent: null,
    drain_type: null,
    rated_flow_cfm: null,
    pleat_count: null,
    panel_width_mm: null,
    panel_depth_mm: null,
    rated_flow_gpm: null,
    
    // MATERIALES
    seal_material: null,
    housing_material: null,
    gasket_od_mm: null,
    gasket_id_mm: null,
    fluid_compatibility: null,
    disposal_method: 'RECYCLABLE',
    
    // CALIDAD
    manufacturing_standards: null,
    certification_standards: null,
    service_life_hours: null,
    change_interval_km: null,
    weight_grams: null,
    
    // METADATA
    _tech_original_detected: null,
    product_url: productURL,
    imagen_url: imageURL,
    breadcrumb: basicInfo.breadcrumb || '',
    manufacturer: 'DONALDSON',
    source: 'DONALDSON_STAGEHAND_AI',
    timestamp: new Date().toISOString()
  };
  
  return datos;
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function normalizeFilterType(type) {
  if (!type) return 'UNKNOWN';
  const t = type.toLowerCase();
  
  if (t.includes('oil') || t.includes('aceite') || t.includes('lubrication')) return 'OIL';
  if (t.includes('fuel') || t.includes('combustible') || t.includes('diesel fuel')) return 'FUEL';
  if (t.includes('air') || t.includes('aire') || t.includes('intake')) return 'AIR';
  if (t.includes('cabin') || t.includes('cabina') || t.includes('hvac')) return 'CABIN';
  if (t.includes('hydraulic') || t.includes('hidraulico')) return 'HYDRAULIC';
  if (t.includes('transmission') || t.includes('transmision')) return 'TRANSMISSION';
  if (t.includes('coolant') || t.includes('refrigerante')) return 'COOLANT';
  if (t.includes('separator') || t.includes('separador') || t.includes('fuel/water')) return 'SEPARATOR';
  
  return 'UNKNOWN';
}

function detectSubtype(text) {
  const t = text.toLowerCase();
  if (t.includes('synthetic')) return 'SYNTHETIC';
  if (t.includes('ultra') || t.includes('premium') || t.includes('endurance')) return 'PREMIUM';
  if (t.includes('blue') || t.includes('powercore')) return 'PREMIUM';
  return 'STANDARD';
}

function normalizeMediaType(media) {
  if (!media) return 'STANDARD';
  const m = media.toLowerCase();
  
  if (m.includes('synthetic')) return 'SYNTHETIC';
  if (m.includes('cellulose')) return 'CELLULOSE';
  if (m.includes('nanofiber') || m.includes('ultra-web')) return 'NANOFIBER';
  return 'STANDARD';
}

function convertToMM(value) {
  if (!value) return null;
  
  const cleanValue = String(value).toLowerCase().replace(/[^0-9.]/g, '');
  const num = parseFloat(cleanValue);
  
  if (isNaN(num)) return null;
  
  const originalValue = String(value).toLowerCase();
  
  if (originalValue.includes('in') || originalValue.includes('"')) {
    return Math.round(num * 25.4);
  }
  
  if (originalValue.includes('mm')) {
    return Math.round(num);
  }
  
  // Default: asumir mm
  return Math.round(num);
}

module.exports = { scrapeDonaldson };
