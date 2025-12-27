// ============================================================================
// FRAM SCRAPER v10.2.0 - STAGEHAND + GEMINI 2.5 FLASH
// DETECCIÓN PRECISA + DESCRIPCIÓN ELIMFILTERS - LIGHT DUTY ONLY
// ============================================================================

const { Stagehand } = require('@browserbasehq/stagehand');
const { determineDuty } = require('../utils/determineDuty');

// ============================================================================
// PREFIJOS HEAVY DUTY - RECHAZAR
// ============================================================================
const HEAVY_DUTY_PREFIXES = [
  'P', 'DBL', 'DBA', 'DBF', 'DBG', 'DHP', 'ECB', 'ECC', 'FBW', 'FPG', 
  'LF', 'FS', 'FF', 'HF', 'AF', 'BF', 'ECG', 'FBO'
];

function isHeavyDutyCode(codigo) {
  const normalized = String(codigo).trim().toUpperCase();
  return HEAVY_DUTY_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

// ============================================================================
// TECNOLOGÍAS ELIMFILTERS
// ============================================================================
const ELIMFILTERS_TECH = {
  'OIL': 'ELIMTEK™ EXTENDED 99%',
  'FUEL': 'ELIMTEK™ EXTENDED 99%',
  'HYDRAULIC': 'ELIMTEK™ EXTENDED 99%',
  'COOLANT': 'ELIMTEK™ EXTENDED 99%',
  'TRANSMISSION': 'ELIMTEK™ EXTENDED 99%',
  'AIR': 'MACROCORE™',
  'CABIN': 'MICROKAPPA™'
};

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
// SCRAPER PRINCIPAL
// ============================================================================
async function scrapeFRAM(codigo) {
  const normalized = String(codigo).trim().toUpperCase();
  
  // VALIDACIÓN: Rechazar códigos Heavy Duty
  if (isHeavyDutyCode(normalized)) {
    console.log(`🚫 [FRAM] RECHAZADO - Código Heavy Duty: ${normalized}`);
    return { encontrado: false, razon: 'Código Heavy Duty - usar Donaldson' };
  }
  
  console.log(`[FRAM STAGEHAND] 🤖 Iniciando búsqueda AI: ${normalized}`);
  
  const stagehand = new Stagehand(STAGEHAND_CONFIG);
  
  try {
    await stagehand.init();
    const page = stagehand.page;
    
    const searchURL = `https://www.fram.com/parts-search?q=${normalized}`;
    
    await page.goto(searchURL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    
    const hasResults = await page.evaluate(() => {
      const title = document.querySelector('h1, .product-title, .product-name');
      return title && title.textContent.trim().length > 0;
    });
    
    if (!hasResults) {
      console.log(`[FRAM STAGEHAND] ❌ No hay resultados`);
      await stagehand.close();
      return { encontrado: false, razon: 'No encontrado en FRAM' };
    }
    
    // Verificar que no sea página genérica
    const pageInfo = await stagehand.extract({
      instruction: "Extract the page title and check if it's a generic 'competitor search' or 'parts search' page",
      schema: {
        pageTitle: "string",
        isGenericPage: "boolean"
      }
    });
    
    if (pageInfo.isGenericPage || 
        pageInfo.pageTitle.toLowerCase().includes('competitor') ||
        pageInfo.pageTitle.toLowerCase().includes('parts search')) {
      console.log(`🚫 [FRAM STAGEHAND] RECHAZADO - Página genérica`);
      await stagehand.close();
      return { encontrado: false, razon: 'Página genérica sin datos reales' };
    }
    
    console.log(`[FRAM STAGEHAND] ✅ Página válida encontrada`);
    const datos = await extractDataWithAI(stagehand, page, normalized, searchURL);
    
    // VALIDACIÓN FINAL: Verificar que sea Light Duty
    const allText = `${datos.description} ${datos.engine_applications} ${datos.equipment_applications}`;
    const verifiedDuty = determineDuty(
      datos.engine_applications || '',
      datos.equipment_applications || '',
      allText.toLowerCase()
    );
    
    if (verifiedDuty === 'HD') {
      console.log(`🚫 [FRAM STAGEHAND] RECHAZADO - Contenido HD`);
      await stagehand.close();
      return { encontrado: false, razon: 'Contenido indica Heavy Duty' };
    }
    
    console.log(`[FRAM STAGEHAND] ✅ Encontrado: ${normalized} | Tipo: ${datos.type} | Duty: LD`);
    await stagehand.close();
    return { encontrado: true, datos };
    
  } catch (error) {
    console.error(`[FRAM STAGEHAND] ❌ Error:`, error.message);
    
    try {
      await stagehand.close();
    } catch (closeError) {
      // Ignorar
    }
    
    return { encontrado: false, razon: error.message };
  }
}

// ============================================================================
// EXTRACCIÓN DE DATOS CON AI
// ============================================================================
async function extractDataWithAI(stagehand, page, codigo, productURL) {
  console.log(`[FRAM STAGEHAND] 🤖 Extrayendo datos con AI...`);
  
  // ========================================================================
  // PASO 1: DETECCIÓN PRECISA DE TIPO
  // ========================================================================
  const filterTypeDetection = await stagehand.extract({
    instruction: `CRITICAL: Determine the EXACT filter type from this FRAM filter page.
    
    Look at these sources IN ORDER OF PRIORITY:
    
    1. PRODUCT CATEGORY/BREADCRUMB:
       - "Oil Filters" OR "Engine Oil" → TYPE IS "OIL"
       - "Fuel Filters" → TYPE IS "FUEL"
       - "Air Filters" → TYPE IS "AIR"
       - "Cabin Air" → TYPE IS "CABIN"
    
    2. PRODUCT TITLE:
       - If title contains "Oil Filter" → TYPE IS "OIL"
       - If title contains "Fuel Filter" → TYPE IS "FUEL"
       - If title contains "Air Filter" → TYPE IS "AIR"
       - If title contains "Cabin" → TYPE IS "CABIN"
    
    3. PART NUMBER PREFIX (FRAM codes):
       - PH, XG, CH → Oil filters
       - G → Fuel filters
       - CA → Air filters
       - CF → Cabin filters
    
    IGNORE marketing text - focus ONLY on the actual filter type.`,
    schema: {
      category: "string",
      productTitle: "string",
      partNumber: "string",
      filterType: "string"
    }
  });
  
  console.log(`[FRAM STAGEHAND] 🔍 Categoría: ${filterTypeDetection.category}`);
  console.log(`[FRAM STAGEHAND] 🔍 Título: ${filterTypeDetection.productTitle}`);
  console.log(`[FRAM STAGEHAND] 🔍 Part#: ${filterTypeDetection.partNumber}`);
  
  const verifiedType = verifyFilterTypeFRAM(
    filterTypeDetection.category,
    filterTypeDetection.productTitle,
    filterTypeDetection.partNumber,
    filterTypeDetection.filterType
  );
  
  console.log(`[FRAM STAGEHAND] ✅ Tipo verificado: ${verifiedType}`);
  
  // ========================================================================
  // PASO 2: EXTRAER APLICACIONES (Light Duty específicas)
  // ========================================================================
  const applications = await stagehand.extract({
    instruction: `Find and extract specific Light Duty vehicle applications:
      - Vehicle makes and models (e.g., "Toyota Camry 2018-2023", "Honda Accord", "Ford F-150 5.0L")
      - Engine info (e.g., "2.5L 4-cylinder", "3.6L V6 gasoline")
      - Year ranges
      - OEM part numbers
      Return empty string if not found.`,
    schema: {
      vehicleApplications: "string",
      engineInfo: "string",
      oemCodes: "string",
      yearRange: "string"
    }
  });
  
  console.log(`[FRAM STAGEHAND] ℹ️ Vehículos: ${applications.vehicleApplications?.substring(0, 60)}...`);
  console.log(`[FRAM STAGEHAND] ℹ️ Motor: ${applications.engineInfo?.substring(0, 60)}...`);
  
  // ========================================================================
  // PASO 3: EXTRAER ESPECIFICACIONES
  // ========================================================================
  const specifications = await stagehand.extract({
    instruction: `Extract technical specifications:
      - Height (in inches or mm)
      - Outer diameter (in inches or mm)
      - Thread size
      - Micron rating or filtration efficiency
      - Gasket diameter
      - Media type (synthetic, cellulose, blend)
      Return null if not found.`,
    schema: {
      height: "string",
      outerDiameter: "string",
      threadSize: "string",
      micronRating: "string",
      gasketDiameter: "string",
      mediaType: "string"
    }
  });
  
  // ========================================================================
  // PASO 4: EXTRAER FEATURES
  // ========================================================================
  const features = await stagehand.extract({
    instruction: `Extract product features:
      - Technology or media type
      - Special features (synthetic, extra guard, ultra synthetic)
      - Service life or change interval
      - Certifications`,
    schema: {
      technology: "string",
      features: "string",
      serviceLife: "string",
      certifications: "string"
    }
  });
  
  // ========================================================================
  // PASO 5: IMAGEN
  // ========================================================================
  const imageURL = await page.evaluate(() => {
    const img = document.querySelector('.product-image img, [class*="image"] img, img[alt*="filter"]');
    return img ? (img.src || img.dataset.src || '') : '';
  });
  
  // ========================================================================
  // PASO 6: GENERAR DESCRIPCIÓN ELIMFILTERS
  // ========================================================================
  const elimfiltersDescription = generateELIMFILTERSDescriptionLD(
    verifiedType,
    applications.vehicleApplications,
    applications.engineInfo
  );
  
  console.log(`[FRAM STAGEHAND] 📝 Descripción: ${elimfiltersDescription}`);
  
  // ========================================================================
  // PASO 7: CONSTRUIR OBJETO DE DATOS
  // ========================================================================
  const datos = {
    query: codigo,
    norm: filterTypeDetection.partNumber || codigo,
    duty_type: 'LD', // FRAM es siempre Light Duty
    type: verifiedType,
    subtype: detectSubtypeFRAM(filterTypeDetection.productTitle, features.features),
    description: elimfiltersDescription, // ✅ Descripción ELIMFILTERS
    
    // CÓDIGOS
    oem_codes: applications.oemCodes || '',
    cross_reference: [],
    
    // APLICACIONES
    media_type: normalizeMediaType(specifications.mediaType || features.technology),
    equipment_applications: applications.vehicleApplications || '',
    engine_applications: buildEngineApplications(applications),
    
    // DIMENSIONES
    height_mm: convertToMM(specifications.height),
    outer_diameter_mm: convertToMM(specifications.outerDiameter),
    inner_diameter_mm: null,
    thread_size: specifications.threadSize || null,
    
    // FILTRACIÓN
    micron_rating: specifications.micronRating || null,
    beta_200: null,
    iso_main_efficiency_percent: extractEfficiency(specifications.micronRating),
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
    seal_material: extractSealMaterial(features.features),
    housing_material: null,
    gasket_od_mm: convertToMM(specifications.gasketDiameter),
    gasket_id_mm: null,
    fluid_compatibility: null,
    disposal_method: 'RECYCLABLE',
    
    // CALIDAD
    manufacturing_standards: null,
    certification_standards: features.certifications || null,
    service_life_hours: extractServiceLife(features.serviceLife),
    change_interval_km: extractChangeInterval(features.serviceLife),
    weight_grams: null,
    
    // METADATA
    _tech_original_detected: features.technology || null,
    product_url: productURL,
    imagen_url: imageURL,
    breadcrumb: filterTypeDetection.category || '',
    manufacturer: 'FRAM',
    source: 'FRAM_STAGEHAND_AI',
    timestamp: new Date().toISOString()
  };
  
  return datos;
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function verifyFilterTypeFRAM(category, title, partNumber, aiDetectedType) {
  const cat = (category || '').toLowerCase();
  const t = (title || '').toLowerCase();
  const pn = (partNumber || '').toUpperCase();
  
  // PRIORIDAD 1: Categoría
  if (cat.includes('oil')) {
    console.log(`[VERIFY] ✅ Categoría → OIL`);
    return 'OIL';
  }
  if (cat.includes('fuel')) {
    console.log(`[VERIFY] ✅ Categoría → FUEL`);
    return 'FUEL';
  }
  if (cat.includes('air') && !cat.includes('cabin')) {
    console.log(`[VERIFY] ✅ Categoría → AIR`);
    return 'AIR';
  }
  if (cat.includes('cabin')) {
    console.log(`[VERIFY] ✅ Categoría → CABIN`);
    return 'CABIN';
  }
  
  // PRIORIDAD 2: Título
  if (t.includes('oil filter')) {
    console.log(`[VERIFY] ✅ Título → OIL`);
    return 'OIL';
  }
  if (t.includes('fuel filter')) {
    console.log(`[VERIFY] ✅ Título → FUEL`);
    return 'FUEL';
  }
  if (t.includes('air filter') && !t.includes('cabin')) {
    console.log(`[VERIFY] ✅ Título → AIR`);
    return 'AIR';
  }
  if (t.includes('cabin')) {
    console.log(`[VERIFY] ✅ Título → CABIN`);
    return 'CABIN';
  }
  
  // PRIORIDAD 3: Prefijo FRAM
  if (pn.startsWith('PH') || pn.startsWith('XG') || pn.startsWith('CH')) {
    console.log(`[VERIFY] ✅ Prefijo FRAM → OIL`);
    return 'OIL';
  }
  if (pn.startsWith('G')) {
    console.log(`[VERIFY] ✅ Prefijo FRAM → FUEL`);
    return 'FUEL';
  }
  if (pn.startsWith('CA')) {
    console.log(`[VERIFY] ✅ Prefijo FRAM → AIR`);
    return 'AIR';
  }
  if (pn.startsWith('CF')) {
    console.log(`[VERIFY] ✅ Prefijo FRAM → CABIN`);
    return 'CABIN';
  }
  
  // PRIORIDAD 4: AI
  const normalized = normalizeFilterType(aiDetectedType);
  console.log(`[VERIFY] ⚠️ Usando AI → ${normalized}`);
  return normalized;
}

function generateELIMFILTERSDescriptionLD(type, vehicleApps, engineInfo) {
  const tech = ELIMFILTERS_TECH[type] || 'ELIMTEK™ EXTENDED 99%';
  
  // Extraer las 2-3 aplicaciones de vehículos más importantes
  const topApps = extractTopApplicationsLD(vehicleApps, engineInfo);
  
  if (topApps && topApps.length > 0) {
    return `ELIMFILTERS ${type} Filter - ${tech} - ${topApps}`;
  }
  
  // Fallback
  return `ELIMFILTERS ${type} Filter - ${tech} - Light Duty Gasoline`;
}

function extractTopApplicationsLD(vehicleApps, engineInfo) {
  const apps = [];
  
  // Parsear vehículos
  if (vehicleApps) {
    const vehicles = vehicleApps.split(/[,;]/).map(v => v.trim()).filter(v => v.length > 3);
    apps.push(...vehicles.slice(0, 2)); // Primeros 2 vehículos
  }
  
  // Agregar info de motor si hay espacio
  if (engineInfo && apps.length < 3) {
    const engines = engineInfo.split(/[,;]/).map(e => e.trim()).filter(e => e.length > 2);
    apps.push(...engines.slice(0, 3 - apps.length));
  }
  
  // Retornar los primeros 3, limitados a 100 caracteres
  const result = apps.slice(0, 3).join(', ');
  return result.length > 100 ? result.substring(0, 97) + '...' : result;
}

function normalizeFilterType(type) {
  if (!type) return 'UNKNOWN';
  const t = type.toLowerCase();
  
  if (t.includes('oil')) return 'OIL';
  if (t.includes('fuel')) return 'FUEL';
  if (t.includes('air') && !t.includes('cabin')) return 'AIR';
  if (t.includes('cabin')) return 'CABIN';
  if (t.includes('hydraulic')) return 'HYDRAULIC';
  if (t.includes('transmission')) return 'TRANSMISSION';
  
  return 'UNKNOWN';
}

function detectSubtypeFRAM(title, features) {
  const text = `${title} ${features}`.toLowerCase();
  
  if (text.includes('synthetic') || text.includes('ultra')) return 'SYNTHETIC';
  if (text.includes('premium') || text.includes('extra guard')) return 'PREMIUM';
  if (text.includes('tough guard')) return 'PREMIUM';
  
  return 'STANDARD';
}

function normalizeMediaType(media) {
  if (!media) return 'STANDARD';
  const m = media.toLowerCase();
  
  if (m.includes('synthetic')) return 'SYNTHETIC';
  if (m.includes('cellulose')) return 'CELLULOSE';
  if (m.includes('blend')) return 'BLEND';
  
  return 'STANDARD';
}

function buildEngineApplications(applications) {
  const parts = [];
  
  if (applications.engineInfo) {
    parts.push(applications.engineInfo);
  }
  
  if (applications.yearRange) {
    parts.push(applications.yearRange);
  }
  
  if (parts.length === 0) {
    return 'GASOLINE_LD';
  }
  
  return parts.join(' - ');
}

function extractEfficiency(micronRating) {
  if (!micronRating) return null;
  const match = String(micronRating).match(/(\d+)%/);
  return match ? parseFloat(match[1]) : null;
}

function extractSealMaterial(features) {
  if (!features) return null;
  const f = features.toLowerCase();
  
  if (f.includes('nitrile')) return 'NITRILE';
  if (f.includes('silicone')) return 'SILICONE';
  if (f.includes('rubber')) return 'RUBBER';
  
  return null;
}

function extractServiceLife(serviceLife) {
  if (!serviceLife) return null;
  const match = String(serviceLife).match(/(\d+)\s*(?:hour|hr)/i);
  return match ? parseInt(match[1]) : null;
}

function extractChangeInterval(serviceLife) {
  if (!serviceLife) return null;
  const match = String(serviceLife).match(/(\d+)\s*(?:km|mile|miles)/i);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[0].toLowerCase();
  
  if (unit.includes('mile')) {
    return Math.round(value * 1.60934);
  }
  
  return value;
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

module.exports = { scrapeFRAM };
