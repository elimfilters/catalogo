// ============================================================================
// FRAM SCRAPER v8.1.0 - SOLO LIGHT DUTY + VALIDACIÓN ESTRICTA
// URL: https://www.fram.com
// ============================================================================

const axios = require('axios');
const cheerio = require('cheerio');
const { extract4Digits } = require('../utils/digitExtractor');
const { determineDuty } = require('../utils/determineDuty');

// ============================================================================
// PREFIJOS HEAVY DUTY - RECHAZAR INMEDIATAMENTE
// ============================================================================
const HEAVY_DUTY_PREFIXES = [
  'P', 'DBL', 'DBA', 'DBF', 'DBG', 'DHP', 'ECB', 'ECC', 'FBW', 'FPG', 
  'LF', 'FS', 'FF', 'HF', 'AF', 'BF', 'DBA', 'DBF', 'ECG', 'FBO'
];

function isHeavyDutyCode(codigo) {
  const normalized = String(codigo).trim().toUpperCase();
  
  // Rechazar códigos que empiecen con prefijos HD
  for (const prefix of HEAVY_DUTY_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      return true;
    }
  }
  
  return false;
}

async function scrapeFRAM(codigo) {
  try {
    const normalized = String(codigo).trim().toUpperCase();
    
    // ✅ VALIDACIÓN 1: Rechazar códigos Heavy Duty
    if (isHeavyDutyCode(normalized)) {
      console.log(`🚫 [FRAM] RECHAZADO - Código Heavy Duty: ${normalized}`);
      return { encontrado: false, razon: 'Código Heavy Duty - usar Donaldson' };
    }
    
    const searchURL = `https://www.fram.com/parts-search?q=${normalized}`;
    
    console.log(`🌐 [FRAM] Scraping: ${searchURL}`);
    
    const response = await axios.get(searchURL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const titulo = $('.product-title, h1').first().text().trim();
    
    // ✅ VALIDACIÓN 2: Debe tener título
    if (!titulo) {
      console.log(`ℹ️ [FRAM] No encontrado: ${normalized}`);
      return { encontrado: false, razon: 'No encontrado en FRAM' };
    }
    
    // ✅ VALIDACIÓN 3: Rechazar páginas genéricas de "competitor search"
    if (titulo.toLowerCase().includes('competitor') || 
        titulo.toLowerCase().includes('parts search')) {
      console.log(`🚫 [FRAM] RECHAZADO - Página genérica: ${normalized}`);
      return { encontrado: false, razon: 'Página genérica sin datos reales' };
    }
    
    const datos = extractFullDataFRAM($, normalized, response.request.res.responseUrl);
    
    // ✅ VALIDACIÓN 4: Verificar que NO sea Heavy Duty según contenido
    const allText = [titulo, datos.description, datos.equipment_applications].join(' ');
    const detectedDuty = determineDuty('', datos.equipment_applications, allText);
    
    if (detectedDuty === 'HD') {
      console.log(`🚫 [FRAM] RECHAZADO - Contenido detectado como HD: ${normalized}`);
      return { encontrado: false, razon: 'Contenido indica Heavy Duty' };
    }
    
    console.log(`✅ [FRAM] Encontrado: ${normalized} | Tipo: ${datos.type} | Duty: LD`);
    
    return { encontrado: true, datos };
    
  } catch (error) {
    console.error(`❌ [FRAM] Error:`, error.message);
    return { encontrado: false, razon: error.message };
  }
}

function extractFullDataFRAM($, codigo, productURL) {
  const titulo = $('.product-title, h1').first().text().trim();
  const descripcion = $('.product-description, [class*="description"]').text().trim();
  const categoria = $('.breadcrumb, .category').text().toLowerCase();
  const specs = $('.specifications, [class*="spec"]').text();
  const allText = [titulo, descripcion, categoria, specs].join(' ').toLowerCase();
  
  return {
    query: codigo,
    norm: extractCodigoFRAM($, codigo),
    duty_type: 'LD',  // ✅ FRAM solo maneja Light Duty
    type: detectTypeFRAM(categoria, titulo),
    subtype: detectSubtype(allText),
    description: titulo || descripcion.substring(0, 200),
    
    // CÓDIGOS
    oem_codes: extractOEMCodesFRAM($),
    cross_reference: extractCrossReferencesFRAM($),
    
    // CARACTERÍSTICAS
    media_type: extractMediaTypeFRAM($, allText),
    equipment_applications: extractApplicationsFRAM($),
    engine_applications: 'GASOLINE_LD',
    
    // DIMENSIONES
    height_mm: convertToMM(extractSpecFRAM($, 'Height', 'Altura')),
    outer_diameter_mm: convertToMM(extractSpecFRAM($, 'Outer Diameter', 'OD', 'Diameter')),
    inner_diameter_mm: convertToMM(extractSpecFRAM($, 'Inner Diameter', 'ID')),
    thread_size: extractSpecFRAM($, 'Thread Size', 'Thread'),
    
    // FILTRACIÓN
    micron_rating: extractSpecFRAM($, 'Micron Rating', 'Micron'),
    beta_200: null,
    iso_main_efficiency_percent: extractEfficiencyFRAM($, specs),
    iso_test_method: null,
    
    // OPERACIÓN
    operating_temperature_min_c: null,
    operating_temperature_max_c: extractTempMaxFRAM($, specs),
    operating_pressure_min_psi: null,
    operating_pressure_max_psi: extractPressureMaxFRAM($, specs),
    
    // ESPECÍFICOS POR TIPO
    bypass_valve_psi: extractSpecFRAM($, 'Bypass', 'Valve'),
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
    seal_material: extractSealMaterialFRAM($, specs),
    housing_material: null,
    gasket_od_mm: null,
    gasket_id_mm: null,
    fluid_compatibility: null,
    disposal_method: 'RECYCLABLE',
    
    // CALIDAD
    manufacturing_standards: null,
    certification_standards: extractCertificationsFRAM($, specs),
    service_life_hours: null,
    change_interval_km: extractChangeIntervalFRAM($, specs),
    weight_grams: null,
    
    // METADATA
    _tech_original_detected: null,
    product_url: productURL || `https://www.fram.com/parts-search?q=${codigo}`,
    imagen_url: extractImageFRAM($),
    breadcrumb: categoria,
    manufacturer: 'FRAM',
    source: 'FRAM_OFFICIAL',
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// FUNCIONES DE EXTRACCIÓN (mantener las originales)
// ============================================================================

function extractCodigoFRAM($, codigo) {
  const partNumber = $('.part-number, [class*="partNumber"]').text().trim();
  return partNumber || codigo;
}

function detectTypeFRAM(categoria, titulo) {
  const text = `${categoria} ${titulo}`.toLowerCase();
  
  if (text.includes('oil') || text.includes('aceite')) return 'OIL';
  if (text.includes('fuel') || text.includes('combustible')) return 'FUEL';
  if (text.includes('air') || text.includes('aire')) return 'AIR';
  if (text.includes('cabin') || text.includes('cabina')) return 'CABIN';
  if (text.includes('hydraulic') || text.includes('hidraulico')) return 'HYDRAULIC';
  if (text.includes('transmission') || text.includes('transmision')) return 'TRANSMISSION';
  if (text.includes('coolant') || text.includes('refrigerante')) return 'COOLANT';
  
  return 'UNKNOWN';
}

function detectSubtype(text) {
  if (text.includes('synthetic')) return 'SYNTHETIC';
  if (text.includes('ultra') || text.includes('premium')) return 'PREMIUM';
  return 'STANDARD';
}

function extractOEMCodesFRAM($) {
  const oems = [];
  $('.oem-code, [class*="oem"]').each((i, el) => {
    const code = $(el).text().trim();
    if (code) oems.push(code);
  });
  return oems.join(', ');
}

function extractCrossReferencesFRAM($) {
  const refs = [];
  $('.cross-reference, [class*="cross"]').each((i, el) => {
    const ref = $(el).text().trim();
    if (ref) refs.push(ref);
  });
  return refs;
}

function extractMediaTypeFRAM($, text) {
  if (text.includes('synthetic')) return 'SYNTHETIC';
  if (text.includes('cellulose')) return 'CELLULOSE';
  return 'STANDARD';
}

function extractApplicationsFRAM($) {
  const apps = [];
  $('.application, [class*="application"], [class*="vehicle"]').each((i, el) => {
    const app = $(el).text().trim();
    if (app && app.length > 3) apps.push(app);
  });
  return apps.join(', ');
}

function extractSpecFRAM($, ...terms) {
  for (const term of terms) {
    const spec = $(`.spec:contains("${term}"), [class*="spec"]:contains("${term}")`).first();
    if (spec.length) {
      const value = spec.text().replace(new RegExp(term, 'i'), '').trim();
      if (value) return value;
    }
  }
  return null;
}

function extractEfficiencyFRAM($, specs) {
  const match = specs.match(/(\d+)%.*efficiency/i);
  return match ? parseFloat(match[1]) : null;
}

function extractTempMaxFRAM($, specs) {
  const match = specs.match(/(\d+)°?[CF]/i);
  return match ? parseFloat(match[1]) : null;
}

function extractPressureMaxFRAM($, specs) {
  const match = specs.match(/(\d+)\s*psi/i);
  return match ? parseFloat(match[1]) : null;
}

function extractSealMaterialFRAM($, specs) {
  if (specs.includes('nitrile')) return 'NITRILE';
  if (specs.includes('silicone')) return 'SILICONE';
  if (specs.includes('viton')) return 'VITON';
  return null;
}

function extractCertificationsFRAM($, specs) {
  const certs = [];
  if (specs.includes('ISO')) certs.push('ISO');
  if (specs.includes('OEM')) certs.push('OEM_APPROVED');
  return certs.join(', ') || null;
}

function extractChangeIntervalFRAM($, specs) {
  const match = specs.match(/(\d+)\s*(?:km|miles)/i);
  return match ? parseFloat(match[1]) : null;
}

function extractImageFRAM($) {
  const img = $('.product-image img, [class*="image"] img').first();
  return img.attr('src') || '';
}

function convertToMM(value) {
  if (!value) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  
  if (value.includes('in')) return Math.round(num * 25.4);
  return num;
}

module.exports = { scrapeFRAM };
