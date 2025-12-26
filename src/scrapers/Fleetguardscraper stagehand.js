// ============================================================================
// FLEETGUARD SCRAPER v10.0.0 - STAGEHAND + GEMINI 2.5 FLASH
// ESPECIFICACIONES TÉCNICAS DETALLADAS Y CROSS-REFERENCES
// ============================================================================

const { Stagehand } = require('@browserbasehq/stagehand');

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
async function scrapeFleetguard(codigo) {
  const normalized = String(codigo).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  console.log(`[FLEETGUARD STAGEHAND] 🤖 Iniciando búsqueda: ${normalized}`);
  
  const stagehand = new Stagehand(STAGEHAND_CONFIG);
  
  try {
    await stagehand.init();
    const page = stagehand.page;
    
    // ========================================================================
    // ESTRATEGIA: BÚSQUEDA EN FLEETGUARD
    // ========================================================================
    const searchURL = `https://www.fleetguard.com/part/${normalized}`;
    
    console.log(`[FLEETGUARD STAGEHAND] Accediendo: ${searchURL}`);
    
    await page.goto(searchURL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Esperar a que cargue el contenido
    await page.waitForTimeout(2000);
    
    // Verificar si el producto existe
    const hasContent = await page.evaluate(() => {
      const notFound = document.querySelector('.not-found, .error-404, [class*="notfound"]');
      const title = document.querySelector('h1, .product-title, .part-title');
      return !notFound && title && title.textContent.trim().length > 0;
    });
    
    if (!hasContent) {
      console.log(`[FLEETGUARD STAGEHAND] ❌ No encontrado: ${normalized}`);
      await stagehand.close();
      return { encontrado: false, razon: 'No encontrado en Fleetguard' };
    }
    
    // ========================================================================
    // EXTRAER DATOS CON AI
    // ========================================================================
    console.log(`[FLEETGUARD STAGEHAND] ✅ Producto encontrado, extrayendo datos...`);
    const datos = await extractDataWithAI(stagehand, page, normalized, searchURL);
    
    console.log(`[FLEETGUARD STAGEHAND] ✅ Completado: ${normalized}`);
    await stagehand.close();
    return { encontrado: true, datos };
    
  } catch (error) {
    console.error(`[FLEETGUARD STAGEHAND] ❌ Error:`, error.message);
    
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
  console.log(`[FLEETGUARD STAGEHAND] 🤖 Extrayendo especificaciones técnicas...`);
  
  // ========================================================================
  // PASO 1: INFORMACIÓN BÁSICA
  // ========================================================================
  const basicInfo = await stagehand.extract({
    instruction: `Extract basic product information:
      - Product title/name
      - Filter type (oil, fuel, air, hydraulic, coolant, etc.)
      - Fleetguard part number
      - Product description or overview`,
    schema: {
      title: "string",
      filterType: "string",
      partNumber: "string",
      description: "string"
    }
  });
  
  console.log(`[FLEETGUARD STAGEHAND] ℹ️ Part: ${basicInfo.partNumber} - ${basicInfo.filterType}`);
  
  // ========================================================================
  // PASO 2: CROSS-REFERENCES (Clave de Fleetguard)
  // ========================================================================
  const crossReferences = await stagehand.extract({
    instruction: `Find all cross-reference part numbers from other manufacturers.
      Look for sections like "Competitive Cross References", "OEM Numbers", "Interchange".
      Extract:
      - Baldwin part numbers
      - Donaldson part numbers
      - WIX part numbers
      - Mann Filter part numbers
      - OEM manufacturer part numbers (Cummins, Detroit, Caterpillar, etc.)
      Return as comma-separated lists.`,
    schema: {
      baldwin: "string",
      donaldson: "string",
      wix: "string",
      mann: "string",
      oem: "string",
      otherBrands: "string"
    }
  });
  
  console.log(`[FLEETGUARD STAGEHAND] ℹ️ Cross-refs: Baldwin=${crossReferences.baldwin?.substring(0, 20)}...`);
  
  // ========================================================================
  // PASO 3: APLICACIONES DE MOTOR Y EQUIPO
  // ========================================================================
  const applications = await stagehand.extract({
    instruction: `Extract engine and equipment applications:
      - Engine makes and models (e.g., "Cummins ISX15", "Detroit DD15", "Caterpillar C15")
      - Equipment types (e.g., "Heavy Duty Trucks", "Construction Equipment")
      - Specific vehicle models if listed
      - Year ranges if available`,
    schema: {
      engineApplications: "string",
      equipmentApplications: "string",
      vehicleModels: "string",
      yearRange: "string"
    }
  });
  
  // ========================================================================
  // PASO 4: ESPECIFICACIONES TÉCNICAS DETALLADAS
  // ========================================================================
  const specifications = await stagehand.extract({
    instruction: `Extract detailed technical specifications:
      DIMENSIONS:
      - Height/Length (A dimension)
      - Outer Diameter (B dimension)
      - Inner Diameter (C dimension)
      - Thread size
      - Gasket OD and ID
      
      FILTRATION:
      - Micron rating
      - Beta ratio (e.g., "Beta 200 = 75")
      - Efficiency percentage
      - ISO test method
      - Media type (synthetic, cellulose, nanofiber)
      - Pleat count
      
      PERFORMANCE:
      - Operating pressure (min/max PSI)
      - Operating temperature (min/max °F or °C)
      - Bypass valve opening pressure
      - Collapse pressure
      - Dirt holding capacity (grams)
      - Flow rate (GPM or CFM)
      
      MATERIALS:
      - Seal/gasket material
      - Housing material
      - End cap material
      
      Return null if not found.`,
    schema: {
      height: "string",
      outerDiameter: "string",
      innerDiameter: "string",
      threadSize: "string",
      gasketOD: "string",
      gasketID: "string",
      micronRating: "string",
      betaRatio: "string",
      efficiency: "string",
      isoTestMethod: "string",
      mediaType: "string",
      pleatCount: "string",
      pressureMin: "string",
      pressureMax: "string",
      temperatureMin: "string",
      temperatureMax: "string",
      bypassPressure: "string",
      collapsePressure: "string",
      dirtCapacity: "string",
      flowRate: "string",
      sealMaterial: "string",
      housingMaterial: "string",
      endCapMaterial: "string"
    }
  });
  
  // ========================================================================
  // PASO 5: CARACTERÍSTICAS ADICIONALES
  // ========================================================================
  const features = await stagehand.extract({
    instruction: `Extract additional product features:
      - Technology name (e.g., "StrataPore", "NanoNet", "OptiPure")
      - Special features or benefits
      - Service life or change interval recommendations
      - Certifications or standards (ISO, OEM approvals)
      - Water separation efficiency (for fuel filters)
      - Drain type (manual, automatic)`,
    schema: {
      technology: "string",
      features: "string",
      serviceLife: "string",
      certifications: "string",
      waterSeparation: "string",
      drainType: "string"
    }
  });
  
  // ========================================================================
  // PASO 6: IMAGEN Y DIAGRAMA
  // ========================================================================
  const imageURL = await page.evaluate(() => {
    const img = document.querySelector('.product-image img, [class*="image"] img, [class*="diagram"] img');
    return img ? (img.src || img.dataset.src || '') : '';
  });
  
  // ========================================================================
  // PASO 7: CONSTRUIR OBJETO DE DATOS COMPLETO
  // ========================================================================
  const datos = {
    query: codigo,
    norm: basicInfo.partNumber || codigo,
    
    // TIPO (no determina duty, solo specs)
    type: normalizeFilterType(basicInfo.filterType),
    subtype: detectSubtype(features.technology, features.features),
    description: basicInfo.title || basicInfo.description?.substring(0, 200) || '',
    
    // CROSS-REFERENCES (Principal valor de Fleetguard)
    oem_codes: buildOEMCodes(crossReferences),
    cross_reference: buildCrossReferences(crossReferences),
    
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
    beta_200: extractBeta(specifications.betaRatio),
    iso_main_efficiency_percent: extractEfficiency(specifications.efficiency),
    iso_test_method: specifications.isoTestMethod || null,
    
    // OPERACIÓN
    operating_temperature_min_c: convertToC(specifications.temperatureMin),
    operating_temperature_max_c: convertToC(specifications.temperatureMax),
    operating_pressure_min_psi: extractPSI(specifications.pressureMin),
    operating_pressure_max_psi: extractPSI(specifications.pressureMax),
    
    // ESPECÍFICOS
    bypass_valve_psi: extractPSI(specifications.bypassPressure),
    hydrostatic_burst_psi: extractPSI(specifications.collapsePressure),
    dirt_capacity_grams: extractGrams(specifications.dirtCapacity),
    water_separation_efficiency_percent: extractEfficiency(features.waterSeparation),
    drain_type: normalizeDrainType(features.drainType),
    rated_flow_cfm: extractFlowCFM(specifications.flowRate),
    pleat_count: extractNumber(specifications.pleatCount),
    panel_width_mm: null,
    panel_depth_mm: null,
    rated_flow_gpm: extractFlowGPM(specifications.flowRate),
    
    // MATERIALES
    seal_material: normalizeMaterial(specifications.sealMaterial),
    housing_material: normalizeMaterial(specifications.housingMaterial),
    gasket_od_mm: convertToMM(specifications.gasketOD),
    gasket_id_mm: convertToMM(specifications.gasketID),
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
    breadcrumb: '',
    manufacturer: 'FLEETGUARD',
    source: 'FLEETGUARD_STAGEHAND_AI',
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
  
  if (t.includes('oil') || t.includes('lube')) return 'OIL';
  if (t.includes('fuel')) return 'FUEL';
  if (t.includes('air')) return 'AIR';
  if (t.includes('cabin') || t.includes('hvac')) return 'CABIN';
  if (t.includes('hydraulic')) return 'HYDRAULIC';
  if (t.includes('transmission')) return 'TRANSMISSION';
  if (t.includes('coolant')) return 'COOLANT';
  if (t.includes('separator')) return 'SEPARATOR';
  
  return 'UNKNOWN';
}

function detectSubtype(technology, features) {
  const text = `${technology} ${features}`.toLowerCase();
  
  if (text.includes('stratapore') || text.includes('nanonet')) return 'PREMIUM';
  if (text.includes('synthetic')) return 'SYNTHETIC';
  if (text.includes('premium') || text.includes('extended life')) return 'PREMIUM';
  
  return 'STANDARD';
}

function normalizeMediaType(media) {
  if (!media) return 'STANDARD';
  const m = media.toLowerCase();
  
  if (m.includes('synthetic')) return 'SYNTHETIC';
  if (m.includes('cellulose')) return 'CELLULOSE';
  if (m.includes('nanofiber') || m.includes('stratapore')) return 'NANOFIBER';
  
  return 'STANDARD';
}

function buildOEMCodes(crossRefs) {
  const oems = [];
  if (crossRefs.oem) oems.push(crossRefs.oem);
  return oems.join(', ');
}

function buildCrossReferences(crossRefs) {
  const refs = [];
  
  if (crossRefs.baldwin) refs.push({ brand: 'Baldwin', code: crossRefs.baldwin });
  if (crossRefs.donaldson) refs.push({ brand: 'Donaldson', code: crossRefs.donaldson });
  if (crossRefs.wix) refs.push({ brand: 'WIX', code: crossRefs.wix });
  if (crossRefs.mann) refs.push({ brand: 'Mann', code: crossRefs.mann });
  if (crossRefs.otherBrands) {
    crossRefs.otherBrands.split(',').forEach(code => {
      if (code.trim()) refs.push({ brand: 'Other', code: code.trim() });
    });
  }
  
  return refs;
}

function extractBeta(betaRatio) {
  if (!betaRatio) return null;
  const match = String(betaRatio).match(/(\d+)/);
  return match ? parseFloat(match[1]) : null;
}

function extractEfficiency(efficiency) {
  if (!efficiency) return null;
  const match = String(efficiency).match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]) : null;
}

function convertToC(temp) {
  if (!temp) return null;
  const num = parseFloat(String(temp).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return null;
  
  // Si contiene F, convertir a C
  if (String(temp).toLowerCase().includes('f')) {
    return Math.round((num - 32) * 5 / 9);
  }
  
  return Math.round(num);
}

function extractPSI(pressure) {
  if (!pressure) return null;
  const match = String(pressure).match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function extractGrams(capacity) {
  if (!capacity) return null;
  const match = String(capacity).match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function normalizeDrainType(drain) {
  if (!drain) return null;
  const d = drain.toLowerCase();
  
  if (d.includes('hand') || d.includes('manual')) return 'HAND';
  if (d.includes('automatic') || d.includes('auto')) return 'AUTOMATIC';
  
  return null;
}

function extractFlowCFM(flow) {
  if (!flow) return null;
  const match = String(flow).toLowerCase().match(/(\d+(?:\.\d+)?)\s*cfm/);
  return match ? parseFloat(match[1]) : null;
}

function extractFlowGPM(flow) {
  if (!flow) return null;
  const match = String(flow).toLowerCase().match(/(\d+(?:\.\d+)?)\s*gpm/);
  return match ? parseFloat(match[1]) : null;
}

function extractNumber(value) {
  if (!value) return null;
  const match = String(value).match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function normalizeMaterial(material) {
  if (!material) return null;
  const m = material.toLowerCase();
  
  if (m.includes('nitrile')) return 'NITRILE';
  if (m.includes('silicone')) return 'SILICONE';
  if (m.includes('viton')) return 'VITON';
  if (m.includes('steel')) return 'STEEL';
  if (m.includes('aluminum')) return 'ALUMINUM';
  if (m.includes('plastic')) return 'PLASTIC';
  
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

module.exports = { scrapeFleetguard };
