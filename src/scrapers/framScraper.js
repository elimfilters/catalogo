// ============================================================================
// FRAM SCRAPER v8.0.0 - EXTRACCIÓN COMPLETA
// URL: https://www.fram.com
// ============================================================================

const axios = require('axios');
const cheerio = require('cheerio');
const { extract4Digits } = require('../utils/digitExtractor');

async function scrapeFRAM(codigo) {
  try {
    const normalized = String(codigo).trim().toUpperCase();
    const searchURL = `https://www.fram.com/parts-search?q=${normalized}`;
    
    console.log(`🌐 [FRAM] Scraping: ${searchURL}`);
    
    const response = await axios.get(searchURL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const titulo = $('.product-title, h1').first().text().trim();
    
    if (!titulo) {
      console.log(`ℹ️ [FRAM] No encontrado: ${normalized}`);
      return { encontrado: false, razon: 'No encontrado en FRAM' };
    }
    
    const datos = extractFullDataFRAM($, normalized, response.request.res.responseUrl);
    
    console.log(`✅ [FRAM] Encontrado: ${normalized} | Tipo: ${datos.type}`);
    
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
    duty_type: 'LD',
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
    
    // COMPATIBILIDAD
    fluid_compatibility: extractFluidCompatibilityFRAM($, specs),
    disposal_method: 'RECYCLABLE',
    
    // ESTÁNDARES
    manufacturing_standards: null,
    certification_standards: null,
    
    // VIDA ÚTIL
    service_life_hours: null,
    change_interval_km: extractChangeIntervalFRAM($, specs),
    
    // PESO
    weight_grams: extractWeightFRAM($, specs),
    
    // TECNOLOGÍA ORIGINAL
    _tech_original_detected: extractTechOriginalFRAM($, allText),
    
    // METADATA
    product_url: productURL,
    imagen_url: extractImageURLFRAM($),
    breadcrumb: categoria,
    manufacturer: 'FRAM',
    source: 'FRAM_OFFICIAL',
    timestamp: new Date().toISOString()
  };
}

// FUNCIONES DE EXTRACCIÓN FRAM

function detectTypeFRAM(categoria, titulo) {
  const text = (categoria + ' ' + titulo).toLowerCase();
  if (text.includes('oil') || text.includes('aceite')) return 'OIL';
  if (text.includes('fuel') || text.includes('combustible')) return 'FUEL';
  if (text.includes('air') && !text.includes('cabin')) return 'AIR';
  if (text.includes('cabin') || text.includes('cabina')) return 'CABIN';
  if (text.includes('coolant')) return 'COOLANT';
  return 'OIL';
}

function detectSubtype(text) {
  if (text.includes('spin-on')) return 'SPIN-ON';
  if (text.includes('cartridge')) return 'CARTRIDGE';
  if (text.includes('element')) return 'ELEMENT';
  if (text.includes('panel')) return 'PANEL';
  return 'STANDARD';
}

function extractCodigoFRAM($, fallback) {
  const partNum = $('.part-number, [class*="partNumber"]').first().text().trim();
  return partNum.replace(/[^A-Z0-9]/gi, '').toUpperCase() || fallback;
}

function extractOEMCodesFRAM($) {
  const codes = [];
  $('.oem-codes, [class*="oem"]').each((i, el) => {
    const text = $(el).text().trim();
    if (text) codes.push(text);
  });
  return codes.join('|');
}

function extractCrossReferencesFRAM($) {
  const refs = [];
  $('.cross-reference tr, [class*="crossRef"] tr').each((i, row) => {
    const mfr = $(row).find('td').eq(0).text().trim();
    const pn = $(row).find('td').eq(1).text().trim();
    if (mfr && pn) refs.push({ manufacturer: mfr, part_number: pn });
  });
  return refs;
}

function extractMediaTypeFRAM($, text) {
  if (text.includes('synthetic endurance') || text.includes('titanium')) return 'SYNTHETIC';
  if (text.includes('force') || text.includes('blend')) return 'SYNTHETIC_BLEND';
  if (text.includes('extra guard')) return 'CELLULOSE';
  return 'STANDARD';
}

function extractApplicationsFRAM($) {
  const apps = [];
  $('.applications, [class*="application"], [class*="fitment"]').find('li, p').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 100) apps.push(text);
  });
  return apps.slice(0, 20).join('|');
}

function extractSpecFRAM($, ...keywords) {
  const specs = $('.specifications, [class*="spec"]').text();
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}[:\\s]+([\\d\\.]+[^\\n]*)`, 'i');
    const match = specs.match(regex);
    if (match) return match[1].trim();
  }
  return null;
}

function convertToMM(valueWithUnit) {
  if (!valueWithUnit) return null;
  const match = String(valueWithUnit).match(/([\d\.]+)\s*(mm|cm|in|inch)/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'mm') return val;
  if (unit === 'cm') return val * 10;
  if (unit.includes('in')) return val * 25.4;
  return null;
}

function extractEfficiencyFRAM($, specs) {
  const match = specs.match(/efficiency[:\s]+([\d\.]+)\s*%/i);
  return match ? parseFloat(match[1]) : null;
}

function extractTempMaxFRAM($, specs) {
  const match = specs.match(/temperature[:\s]+([\d\.]+)\s*(°?c|f)/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return match[2].toLowerCase().includes('f') ? (val - 32) * 5/9 : val;
}

function extractPressureMaxFRAM($, specs) {
  const match = specs.match(/pressure[:\s]+([\d\.]+)\s*(psi|bar)/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return match[2].toLowerCase() === 'bar' ? val * 14.5038 : val;
}

function extractSealMaterialFRAM($, specs) {
  const text = specs.toLowerCase();
  if (text.includes('nitrile')) return 'NITRILE';
  if (text.includes('viton')) return 'VITON';
  if (text.includes('silicone')) return 'SILICONE';
  return null;
}

function extractFluidCompatibilityFRAM($, specs) {
  const fluids = [];
  const text = specs.toLowerCase();
  if (text.includes('petroleum')) fluids.push('PETROLEUM');
  if (text.includes('synthetic')) fluids.push('SYNTHETIC');
  return fluids.length > 0 ? fluids.join('|') : null;
}

function extractChangeIntervalFRAM($, specs) {
  const matchKM = specs.match(/interval[:\s]+([\d]+)\s*km/i);
  if (matchKM) return parseInt(matchKM[1]);
  const matchMiles = specs.match(/interval[:\s]+([\d]+)\s*mile/i);
  return matchMiles ? parseInt(matchMiles[1]) * 1.60934 : null;
}

function extractWeightFRAM($, specs) {
  const match = specs.match(/weight[:\s]+([\d\.]+)\s*(g|kg|lb|oz)/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'g') return val;
  if (unit === 'kg') return val * 1000;
  if (unit === 'lb') return val * 453.592;
  if (unit === 'oz') return val * 28.3495;
  return null;
}

function extractTechOriginalFRAM($, text) {
  if (text.includes('synthetic endurance')) return 'FRAM_SYNTHETIC_ENDURANCE';
  if (text.includes('titanium') && text.includes('oil')) return 'FRAM_TITANIUM_OIL';
  if (text.includes('titanium') && text.includes('air')) return 'FRAM_TITANIUM_AIR';
  if (text.includes('titanium') && text.includes('cabin')) return 'FRAM_TITANIUM_CABIN';
  if (text.includes('ultra synthetic')) return 'FRAM_ULTRA_SYNTHETIC';
  if (text.includes('tough guard')) return 'FRAM_TOUGH_GUARD_AIR';
  if (text.includes('force')) return 'FRAM_FORCE';
  if (text.includes('fresh breeze')) return 'FRAM_FRESH_BREEZE';
  if (text.includes('trueair')) return 'FRAM_TRUEAIR';
  if (text.includes('drive') && text.includes('cabin')) return 'FRAM_DRIVE_CABIN';
  if (text.includes('extra guard') && text.includes('air')) return 'FRAM_EXTRA_GUARD_AIR';
  if (text.includes('extra guard') && text.includes('oil')) return 'FRAM_EXTRA_GUARD_OIL';
  if (text.includes('ultra')) return 'FRAM_ULTRA';
  return null;
}

function extractImageURLFRAM($) {
  const img = $('.product-image img, [class*="product"] img').first();
  return img.attr('src') || img.attr('data-src') || '';
}

module.exports = { scrapeFRAM };
