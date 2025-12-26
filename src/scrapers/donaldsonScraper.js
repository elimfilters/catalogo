// ============================================================================
// DONALDSON SCRAPER v10.3.0 - STAGEHAND + GEMINI 2.5 FLASH
// DETECCIÓN PRECISA + DESCRIPCIÓN ELIMFILTERS + URL CORREGIDA
// ============================================================================

const { Stagehand } = require('@browserbasehq/stagehand');
const { determineDuty } = require('../utils/determineDuty');
const { extract4Digits } = require('../utils/digitExtractor');

// ============================================================================
// CONFIGURACIÓN STAGEHAND
// ============================================================================
const STAGEHAND_CONFIG = {
  env: process.env.NODE_ENV || 'production',
  apiKey: process.env.GEMINI_API_KEY,
  modelName: 'gemini-2.0-flash-exp',
  headless: true,
  verbose: 0,
  enableCaching: true,
};

// ============================================================================
// TECNOLOGÍAS ELIMFILTERS
// ============================================================================
const ELIMFILTERS_TECH = {
  'OIL': 'ELIMTEK™ EXTENDED 99%',
  'FUEL': 'ELIMTEK™ EXTENDED 99%',
  'HYDRAULIC': 'ELIMTEK™ EXTENDED 99%',
  'COOLANT': 'ELIMTEK™ EXTENDED 99%',
  'TRANSMISSION': 'ELIMTEK™ EXTENDED 99%',
  'SEPARATOR': 'ELIMTEK™ EXTENDED 99%',
  'AIR': 'MACROCORE™',
  'CABIN': 'MICROKAPPA™'
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
    // ESTRATEGIA 1: URL DIRECTA CON BÚSQUEDA (95%)
    // ========================================================================
    console.log(`[STAGEHAND] Estrategia 1: Búsqueda en Donaldson`);
    
    // Primero ir a la búsqueda para obtener el URL completo con ID
    const searchURL = `https://shop.donaldson.com/store/es-us/search?text=${normalized}`;
    
    await page.goto(searchURL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    
    // Intentar obtener el link del primer producto
    const productLink = await page.evaluate(() => {
      const link = document.querySelector('a[href*="/product/"]');
      return link ? link.href : null;
    });
    
    if (productLink) {
      console.log(`[STAGEHAND] ✅ Link encontrado: ${productLink}`);
      
      await page.goto(productLink, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await page.waitForTimeout(2000);
      
      const isProductPage = await page.evaluate(() => {
        const title = document.querySelector('h1, .product-title, .prodTitle');
        return title && title.textContent.trim().length > 0;
      });
      
      if (isProductPage) {
        console.log(`[STAGEHAND] ✅ Página de producto válida`);
        const datos = await extractDataWithAI(stagehand, page, normalized, productLink);
        await stagehand.close();
        return { encontrado: true, datos };
      }
    }
    
    // ========================================================================
    // ESTRATEGIA 2: BÚSQUEDA CON AI CLICK (4.9%)
    // ========================================================================
    console.log(`[STAGEHAND] Estrategia 2: AI navegando resultados de búsqueda`);
    
    // Volver a la búsqueda si no funcionó la estrategia 1
    await page.goto(searchURL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    
    try {
      await stagehand.act({
        action: "click on the first filter product in the search results"
      });
      
      await page.waitForTimeout(2000);
      
      const currentURL = page.url();
      console.log(`[STAGEHAND] ✅ AI navegó a: ${currentURL}`);
      
      const datos = await extractDataWithAI(stagehand, page, normalized, currentURL);
      await stagehand.close();
      return { encontrado: true, datos };
      
    } catch (aiError) {
      console.log(`[STAGEHAND] ❌ AI no pudo encontrar el producto: ${aiError.message}`);
    }
    
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
  // PASO 1: DETECCIÓN PRECISA DE TIPO
  // ========================================================================
  const filterTypeDetection = await stagehand.extract({
    instruction: `CRITICAL: Determine the EXACT filter type from this Donaldson filter page.
    
    Look at these sources IN ORDER OF PRIORITY:
    
    1. BREADCRUMB/CATEGORY PATH (most reliable):
       - "Filters > Lube" OR "Filters > Oil" → TYPE IS "OIL"
       - "Filters > Fuel" → TYPE IS "FUEL"
       - "Filters > Air" → TYPE IS "AIR"
       - "Filters > Hydraulic" → TYPE IS "HYDRAULIC"
       - "Filters > Cabin" → TYPE IS "CABIN"
    
    2. PRODUCT TITLE:
       - If title contains "Lube Filter" OR "Oil Filter" → TYPE IS "OIL"
       - If title contains "Fuel Filter" OR "Fuel/Water" → TYPE IS "FUEL"
       - If title contains "Air Filter" → TYPE IS "AIR"
    
    3. CROSS-REFERENCES (verify):
       - If cross-reference codes start with "LF" (like LF3620) → TYPE IS "OIL" (Lube Filter)
       - If cross-reference codes start with "FS" or "FF" → TYPE IS "FUEL"
       - If cross-reference codes start with "AF" → TYPE IS "AIR"
    
    IGNORE marketing text - focus ONLY on the actual filter category.`,
    schema: {
      breadcrumb: "string",
      productTitle: "string",
      crossReferenceCodes: "string",
      filterType: "string"
    }
  });
  
  console.log(`[STAGEHAND] 🔍 Breadcrumb: ${filterTypeDetection.breadcrumb}`);
  console.log(`[STAGEHAND] 🔍 Título: ${filterTypeDetection.productTitle}`);
  console.log(`[STAGEHAND] 🔍 Cross-refs: ${filterTypeDetection.crossReferenceCodes}`);
  
  const verifiedType = verifyFilterType(
    filterTypeDetection.breadcrumb,
    filterTypeDetection.productTitle,
    filterTypeDetection.crossReferenceCodes,
    filterTypeDetection.filterType
  );
  
  console.log(`[STAGEHAND] ✅ Tipo verificado: ${verifiedType}`);
  
  // ========================================================================
  // PASO 2: EXTRAER APLICACIONES
  // ========================================================================
  const applications = await stagehand.extract({
    instruction: `Find and extract specific applications:
      - Engine applications: List specific engine models (e.g., "Cummins ISX15", "Detroit Diesel DD15", "Caterpillar C15")
      - Equipment applications: List specific vehicle/equipment models (e.g., "Kenworth T680", "Freightliner Cascadia", "Caterpillar 320D")
      - OEM cross-reference codes
      Return empty string if not found.`,
    schema: {
      engineApplications: "string",
      equipmentApplications: "string",
      oemCodes: "string"
    }
  });
  
  console.log(`[STAGEHAND] ℹ️ Engine: ${applications.engineApplications?.substring(0, 60)}...`);
  console.log(`[STAGEHAND] ℹ️ Equipment: ${applications.equipmentApplications?.substring(0, 60)}...`);
  
  // ========================================================================
  // PASO 3: EXTRAER ESPECIFICACIONES
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
  // PASO 4: EXTRAER PART NUMBER
  // ========================================================================
  const partInfo = await stagehand.extract({
    instruction: `Extract the exact Donaldson part number from the page.`,
    schema: {
      partNumber: "string"
    }
  });
  
  // ========================================================================
  // PASO 5: OBTENER IMAGEN
  // ========================================================================
  const imageURL = await page.evaluate(() => {
    const img = document.querySelector('.product-image img, [class*="image"] img, [data-product-image]');
    return img ? (img.src || img.dataset.src || '') : '';
  });
  
  // ========================================================================
  // PASO 6: DETERMINAR DUTY TYPE
  // ========================================================================
  const allText = `${filterTypeDetection.productTitle} ${filterTypeDetection.breadcrumb} ${applications.engineApplications} ${applications.equipmentApplications}`;
  
  const detectedDuty = determineDuty(
    applications.engineApplications || '',
    applications.equipmentApplications || '',
    allText.toLowerCase()
  );
  
  console.log(`[STAGEHAND] ✅ Duty detectado: ${detectedDuty}`);
  
  // ========================================================================
  // PASO 7: GENERAR DESCRIPCIÓN ELIMFILTERS
  // ========================================================================
  const elimfiltersDescription = generateELIMFILTERSDescription(
    verifiedType,
    detectedDuty,
    applications.engineApplications,
    applications.equipmentApplications
  );
  
  console.log(`[STAGEHAND] 📝 Descripción: ${elimfiltersDescription}`);
  
  // ========================================================================
  // PASO 8: CONSTRUIR OBJETO DE DATOS
  // ========================================================================
  const datos = {
    query: codigo,
    norm: partInfo.partNumber || codigo,
    duty_type: detectedDuty,
    type: verifiedType,
    subtype: detectSubtype(filterTypeDetection.productTitle || ''),
    description: elimfiltersDescription,
    
    oem_codes: applications.oemCodes || '',
    cross_reference: parseCrossReferences(filterTypeDetection.crossReferenceCodes),
    
    media_type: normalizeMediaType(specifications.mediaType),
    equipment_applications: applications.equipmentApplications || '',
    engine_applications: applications.engineApplications || '',
    
    height_mm: convertToMM(specifications.height),
    outer_diameter_mm: convertToMM(specifications.outerDiameter),
    inner_diameter_mm: convertToMM(specifications.innerDiameter),
    thread_size: specifications.threadSize || null,
    
    micron_rating: specifications.micronRating || null,
    beta_200: null,
    iso_main_efficiency_percent: null,
    iso_test_method: null,
    
    operating_temperature_min_c: null,
    operating_temperature_max_c: null,
    operating_pressure_min_psi: null,
    operating_pressure_max_psi: null,
    
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
    
    seal_material: null,
    housing_material: null,
    gasket_od_mm: null,
    gasket_id_mm: null,
    fluid_compatibility: null,
    disposal_method: 'RECYCLABLE',
    
    manufacturing_standards: null,
    certification_standards: null,
    service_life_hours: null,
    change_interval_km: null,
    weight_grams: null,
    
    _tech_original_detected: null,
    product_url: productURL,
    imagen_url: imageURL,
    breadcrumb: filterTypeDetection.breadcrumb || '',
    manufacturer: 'DONALDSON',
    source: 'DONALDSON_STAGEHAND_AI',
    timestamp: new Date().toISOString()
  };
  
  return datos;
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function verifyFilterType(breadcrumb, title, crossRefs, aiDetectedType) {
  const b = (breadcrumb || '').toLowerCase();
  const t = (title || '').toLowerCase();
  const c = (crossRefs || '').toLowerCase();
  
  if (b.includes('lube') || b.includes('oil')) {
    console.log(`[VERIFY] ✅ Breadcrumb → OIL`);
    return 'OIL';
  }
  if (b.includes('fuel') && !b.includes('lube')) {
    console.log(`[VERIFY] ✅ Breadcrumb → FUEL`);
    return 'FUEL';
  }
  if (b.includes('air') || b.includes('aire')) {
    console.log(`[VERIFY] ✅ Breadcrumb → AIR`);
    return 'AIR';
  }
  if (b.includes('cabin') || b.includes('cabina')) {
    console.log(`[VERIFY] ✅ Breadcrumb → CABIN`);
    return 'CABIN';
  }
  if (b.includes('hydraulic')) {
    console.log(`[VERIFY] ✅ Breadcrumb → HYDRAULIC`);
    return 'HYDRAULIC';
  }
  
  if (t.includes('lube filter') || t.includes('oil filter')) {
    console.log(`[VERIFY] ✅ Título → OIL`);
    return 'OIL';
  }
  if (t.includes('fuel filter') && !t.includes('lube')) {
    console.log(`[VERIFY] ✅ Título → FUEL`);
    return 'FUEL';
  }
  if (t.includes('air filter')) {
    console.log(`[VERIFY] ✅ Título → AIR`);
    return 'AIR';
  }
  
  if (c.includes('lf')) {
    console.log(`[VERIFY] ✅ Cross-ref LF → OIL`);
    return 'OIL';
  }
  if (c.includes('fs') || c.includes('ff')) {
    console.log(`[VERIFY] ✅ Cross-ref FS/FF → FUEL`);
    return 'FUEL';
  }
  if (c.includes('af')) {
    console.log(`[VERIFY] ✅ Cross-ref AF → AIR`);
    return 'AIR';
  }
  if (c.includes('hf')) {
    console.log(`[VERIFY] ✅ Cross-ref HF → HYDRAULIC`);
    return 'HYDRAULIC';
  }
  
  const normalized = normalizeFilterType(aiDetectedType);
  console.log(`[VERIFY] ⚠️ Usando AI → ${normalized}`);
  return normalized;
}

function generateELIMFILTERSDescription(type, duty, engineApps, equipmentApps) {
  const tech = ELIMFILTERS_TECH[type] || 'ELIMTEK™ EXTENDED 99%';
  const topApps = extractTopApplications(engineApps, equipmentApps);
  
  if (topApps && topApps.length > 0) {
    return `ELIMFILTERS ${type} Filter - ${tech} - ${topApps}`;
  }
  
  const dutyText = duty === 'HD' ? 'Heavy Duty' : 'Light Duty';
  return `ELIMFILTERS ${type} Filter - ${tech} - ${dutyText}`;
}

function extractTopApplications(engineApps, equipmentApps) {
  const apps = [];
  
  if (engineApps) {
    const engines = engineApps.split(/[,;]/).map(e => e.trim()).filter(e => e.length > 2);
    apps.push(...engines.slice(0, 2));
  }
  
  if (equipmentApps && apps.length < 3) {
    const equipment = equipmentApps.split(/[,;]/).map(e => e.trim()).filter(e => e.length > 2);
    apps.push(...equipment.slice(0, 3 - apps.length));
  }
  
  const result = apps.slice(0, 3).join(', ');
  return result.length > 100 ? result.substring(0, 97) + '...' : result;
}

function normalizeFilterType(type) {
  if (!type) return 'UNKNOWN';
  const t = type.toLowerCase();
  
  if (t.includes('oil') || t.includes('lube')) return 'OIL';
  if (t.includes('fuel')) return 'FUEL';
  if (t.includes('air')) return 'AIR';
  if (t.includes('cabin')) return 'CABIN';
  if (t.includes('hydraulic')) return 'HYDRAULIC';
  if (t.includes('transmission')) return 'TRANSMISSION';
  if (t.includes('coolant')) return 'COOLANT';
  if (t.includes('separator')) return 'SEPARATOR';
  
  return 'UNKNOWN';
}

function detectSubtype(text) {
  const t = text.toLowerCase();
  if (t.includes('synthetic')) return 'SYNTHETIC';
  if (t.includes('ultra') || t.includes('premium')) return 'PREMIUM';
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

function parseCrossReferences(crossRefs) {
  if (!crossRefs) return [];
  
  const refs = [];
  const codes = crossRefs.split(/[,;]/);
  
  for (const code of codes) {
    const trimmed = code.trim();
    if (trimmed && trimmed.length > 2) {
      refs.push(trimmed);
    }
  }
  
  return refs;
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
  
  return Math.round(num);
}

module.exports = { scrapeDonaldson };
