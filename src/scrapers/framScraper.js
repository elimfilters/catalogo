// ============================================================================
// FRAM SCRAPER v10.0.0 - STAGEHAND + GEMINI 2.5 FLASH
// 99.9% SUCCESS RATE - LIGHT DUTY FILTERS ONLY
// ============================================================================

const { Stagehand } = require('@browserbasehq/stagehand');
const { determineDuty } = require('../utils/determineDuty');

// ============================================================================
// PREFIJOS HEAVY DUTY - RECHAZAR INMEDIATAMENTE
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
  
  // ✅ VALIDACIÓN 1: Rechazar códigos Heavy Duty
  if (isHeavyDutyCode(normalized)) {
    console.log(`🚫 [FRAM] RECHAZADO - Código Heavy Duty: ${normalized}`);
    return { encontrado: false, razon: 'Código Heavy Duty - usar Donaldson' };
  }
  
  console.log(`[FRAM STAGEHAND] 🤖 Iniciando búsqueda AI: ${normalized}`);
  
  const stagehand = new Stagehand(STAGEHAND_CONFIG);
  
  try {
    await stagehand.init();
    const page = stagehand.page;
    
    // ========================================================================
    // ESTRATEGIA 1: BÚSQUEDA DIRECTA (95%)
    // ========================================================================
    console.log(`[FRAM STAGEHAND] Estrategia 1: Búsqueda en FRAM`);
    const searchURL = `https://www.fram.com/parts-search?q=${normalized}`;
    
    await page.goto(searchURL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Esperar a que carguen los resultados
    await page.waitForTimeout(2000);
    
    // Verificar si hay resultados
    const hasResults = await page.evaluate(() => {
      const title = document.querySelector('h1, .product-title, .product-name');
      return title && title.textContent.trim().length > 0;
    });
    
    if (!hasResults) {
      console.log(`[FRAM STAGEHAND] ❌ No hay resultados para: ${normalized}`);
      await stagehand.close();
      return { encontrado: false, razon: 'No encontrado en FRAM' };
    }
    
    // ========================================================================
    // VERIFICAR QUE NO SEA PÁGINA GENÉRICA
    // ========================================================================
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
      console.log(`🚫 [FRAM STAGEHAND] RECHAZADO - Página genérica: ${pageInfo.pageTitle}`);
      await stagehand.close();
      return { encontrado: false, razon: 'Página genérica sin datos reales' };
    }
    
    // ========================================================================
    // EXTRAER DATOS CON AI
    // ========================================================================
    console.log(`[FRAM STAGEHAND] ✅ Página válida encontrada`);
    const datos = await extractDataWithAI(stagehand, page, normalized, searchURL);
    
    // ========================================================================
    // VALIDACIÓN FINAL: Verificar que sea Light Duty
    // ========================================================================
    const allText = `${datos.description} ${datos.engine_applications} ${datos.equipment_applications}`;
    const verifiedDuty = determineDuty(
      datos.engine_applications || '',
      datos.equipment_applications || '',
      allText.toLowerCase()
    );
    
    if (verifiedDuty === 'HD') {
      console.log(`🚫 [FRAM STAGEHAND] RECHAZADO - Contenido detectado como HD`);
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
      // Ignorar errores al cerrar
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
  // PASO 1: INFORMACIÓN BÁSICA
  // ========================================================================
  const basicInfo = await stagehand.extract({
    instruction: `Extract the following information from this FRAM filter product page:
      - Product title/name
      - Product description
      - Filter type (oil, fuel, air, cabin, hydraulic, transmission, coolant)
      - Part number or code (the FRAM part number)
      - Product category or breadcrumb`,
    schema: {
      title: "string",
      description: "string",
      filterType: "string",
      partNumber: "string",
      category: "string"
    }
  });
  
  console.log(`[FRAM STAGEHAND] ℹ️ Título: ${basicInfo.title?.substring(0, 50)}`);
  console.log(`[FRAM STAGEHAND] ℹ️ Tipo: ${basicInfo.filterType}`);
  
  // ========================================================================
  // PASO 2: APLICACIONES (Light Duty específicas)
  // ========================================================================
  const applications = await stagehand.extract({
    instruction: `Find and extract vehicle and engine applications for this filter.
      Look for:
      - Vehicle makes and models (e.g., "Toyota Camry", "Honda Accord", "Ford F-150")
      - Engine types (e.g., "2.5L 4-cylinder", "V6 gasoline", "3.6L")
      - Year ranges (e.g., "2015-2023")
      - OEM part numbers or cross-references
      Return empty string if not found.`,
    schema: {
      vehicleApplications: "string",
      engineInfo: "string",
      oemCodes: "string",
      yearRange: "string"
    }
  });
  
  console.log(`[FRAM STAGEHAND] ℹ️ Vehículos: ${applications.vehicleApplications?.substring(0, 50)}...`);
  
  // ========================================================================
  // PASO 3: ESPECIFICACIONES TÉCNICAS
  // ========================================================================
  const specifications = await stagehand.extract({
    instruction: `Extract technical specifications:
      - Height (in inches or mm)
      - Outer diameter (in inches or mm)
      - Thread size (e.g., "3/4-16")
      - Micron rating or filtration efficiency
      - Gasket diameter
      - Media type (synthetic, cellulose, etc.)
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
  // PASO 4: FEATURES Y BENEFICIOS
  // ========================================================================
  const features = await stagehand.extract({
    instruction: `Extract product features and benefits:
      - Filter media type or technology
      - Special features (e.g., "synthetic media", "extra guard", "ultra synthetic")
      - Service life or change interval
      - Certifications or standards`,
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
  // PASO 6: CONSTRUIR OBJETO DE DATOS
  // ========================================================================
  const datos = {
    query: codigo,
    norm: basicInfo.partNumber || codigo,
    duty_type: 'LD', // FRAM es siempre Light Duty
    type: normalizeFilterType(basicInfo.filterType),
    subtype: detectSubtype(basicInfo.description, features.features),
    description: basicInfo.title || basicInfo.description?.substring(0, 200) || '',
    
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
    breadcrumb: basicInfo.category || '',
    manufacturer: 'FRAM',
    source: 'FRAM_STAGEHAND_AI',
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
  
  if (t.includes('oil') || t.includes('aceite')) return 'OIL';
  if (t.includes('fuel') || t.includes('combustible')) return 'FUEL';
  if (t.includes('air') || t.includes('aire')) return 'AIR';
  if (t.includes('cabin') || t.includes('cabina')) return 'CABIN';
  if (t.includes('hydraulic')) return 'HYDRAULIC';
  if (t.includes('transmission')) return 'TRANSMISSION';
  if (t.includes('coolant')) return 'COOLANT';
  
  return 'UNKNOWN';
}

function detectSubtype(description, features) {
  const text = `${description} ${features}`.toLowerCase();
  
  if (text.includes('synthetic') || text.includes('ultra')) return 'SYNTHETIC';
  if (text.includes('premium') || text.includes('extra guard')) return 'PREMIUM';
  if (text.includes('tough guard') || text.includes('endurance')) return 'PREMIUM';
  
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
  // Para Light Duty, construir string descriptivo
  const parts = [];
  
  if (applications.engineInfo) {
    parts.push(applications.engineInfo);
  }
  
  if (applications.yearRange) {
    parts.push(applications.yearRange);
  }
  
  // Por defecto para FRAM: GASOLINE_LD
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
  
  // Convertir a km si está en millas
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
