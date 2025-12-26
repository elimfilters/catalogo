// ============================================================================
// DONALDSON SCRAPER v8.0.0 - EXTRACCIÓN COMPLETA 70+ CAMPOS
// URL: https://shop.donaldson.com
// ============================================================================

const axios = require('axios');
const cheerio = require('cheerio');
const { extract4Digits } = require('../utils/digitExtractor');

async function scrapeDonaldson(codigo) {
  try {
    const normalized = String(codigo).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const searchURL = `https://shop.donaldson.com/store/es-us/search?text=${normalized}`;
    
    console.log(`🌐 [DONALDSON] Scraping: ${searchURL}`);
    
    const searchResponse = await axios.get(searchURL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000
    });
    
    const $search = cheerio.load(searchResponse.data);
    const productLink = $search('a[href*="/product/"]').first().attr('href');
    
    if (!productLink) {
      console.log(`ℹ️ [DONALDSON] No encontrado: ${normalized}`);
      return { encontrado: false, razon: 'No encontrado en Donaldson' };
    }
    
    const productURL = `https://shop.donaldson.com${productLink}`;
    const productResponse = await axios.get(productURL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000
    });
    
    const $ = cheerio.load(productResponse.data);
    
    // Extraer información completa
    const datos = extractFullData($, normalized, productURL);
    
    console.log(`✅ [DONALDSON] Encontrado: ${normalized} | Tipo: ${datos.type}`);
    
    return { encontrado: true, datos };
    
  } catch (error) {
    console.error(`❌ [DONALDSON] Error:`, error.message);
    return { encontrado: false, razon: error.message };
  }
}

function extractFullData($, codigo, productURL) {
  const breadcrumb = $('.breadcrumb, [class*="breadcrumb"]').text().toLowerCase();
  const titulo = $('h1, .product-title, .prodTitle').first().text().trim();
  const descripcion = $('.prodDesc, .product-description, [class*="description"]').text().trim();
  const specs = $('.productSpecsSection, .specifications, [class*="spec"]').text();
  const allText = [breadcrumb, titulo, descripcion, specs].join(' ').toLowerCase();
  
  return {
    query: codigo,
    norm: extractCodigoDonaldson($, codigo),
    duty_type: 'HD',
    type: detectType(breadcrumb, titulo),
    subtype: detectSubtype(allText),
    description: titulo || descripcion.substring(0, 200),
    
    // CÓDIGOS
    oem_codes: extractOEMCodes($),
    cross_reference: extractCrossReferences($),
    
    // CARACTERÍSTICAS
    media_type: extractMediaType($),
    equipment_applications: extractEquipmentApps($),
    engine_applications: extractEngineApps($),
    
    // DIMENSIONES
    height_mm: convertToMM(extractSpec($, 'Height', 'Hauteur', 'Altura')),
    outer_diameter_mm: convertToMM(extractSpec($, 'Outer Diameter', 'Diamètre extérieur', 'OD')),
    inner_diameter_mm: convertToMM(extractSpec($, 'Inner Diameter', 'Diamètre intérieur', 'ID')),
    thread_size: extractSpec($, 'Thread Size', 'Filetage', 'Thread'),
    
    // FILTRACIÓN
    micron_rating: extractSpec($, 'Micron Rating', 'Filtration', 'Micron'),
    beta_200: extractSpec($, 'Beta 200', 'β200', 'Beta'),
    iso_main_efficiency_percent: extractEfficiency($, specs),
    iso_test_method: extractSpec($, 'ISO', 'Test Method'),
    
    // OPERACIÓN
    operating_temperature_min_c: extractTempMin($, specs),
    operating_temperature_max_c: extractTempMax($, specs),
    operating_pressure_min_psi: extractPressureMin($, specs),
    operating_pressure_max_psi: extractPressureMax($, specs),
    
    // ESPECÍFICOS POR TIPO
    bypass_valve_psi: extractSpec($, 'Bypass', 'Valve'),
    hydrostatic_burst_psi: extractSpec($, 'Burst', 'Pressure'),
    dirt_capacity_grams: extractDirtCapacity($, specs),
    water_separation_efficiency_percent: extractWaterSep($, specs),
    drain_type: extractDrainType($, specs),
    rated_flow_cfm: extractFlowCFM($, specs),
    pleat_count: extractPleatCount($, specs),
    panel_width_mm: convertToMM(extractSpec($, 'Width', 'Panel Width')),
    panel_depth_mm: convertToMM(extractSpec($, 'Depth', 'Panel Depth')),
    rated_flow_gpm: extractFlowGPM($, specs),
    
    // MATERIALES
    seal_material: extractSealMaterial($, specs),
    housing_material: extractHousingMaterial($, specs),
    gasket_od_mm: convertToMM(extractSpec($, 'Gasket OD', 'Gasket Outer')),
    gasket_id_mm: convertToMM(extractSpec($, 'Gasket ID', 'Gasket Inner')),
    
    // COMPATIBILIDAD
    fluid_compatibility: extractFluidCompatibility($, specs),
    disposal_method: extractDisposalMethod($, specs),
    
    // ESTÁNDARES
    manufacturing_standards: extractStandards($, specs),
    certification_standards: extractCertifications($, specs),
    
    // VIDA ÚTIL
    service_life_hours: extractServiceLife($, specs),
    change_interval_km: extractChangeInterval($, specs),
    
    // PESO
    weight_grams: extractWeight($, specs),
    
    // TECNOLOGÍA ORIGINAL (para mapeo)
    _tech_original_detected: extractTechOriginal($, allText),
    
    // METADATA
    product_url: productURL,
    imagen_url: extractImageURL($),
    breadcrumb: breadcrumb,
    manufacturer: 'DONALDSON',
    source: 'DONALDSON_OFFICIAL',
    timestamp: new Date().toISOString()
  };
}

// FUNCIONES DE EXTRACCIÓN

function detectType(breadcrumb, titulo) {
  const text = (breadcrumb + ' ' + titulo).toLowerCase();
  if (text.includes('fuel') && (text.includes('separator') || text.includes('water'))) return 'FUEL SEPARATOR';
  if (text.includes('fuel') || text.includes('combustible')) return 'FUEL';
  if (text.includes('oil') || text.includes('aceite') || text.includes('huile')) return 'OIL';
  if (text.includes('air dryer')) return 'AIR DRYER';
  if (text.includes('air') && !text.includes('cabin')) return 'AIR';
  if (text.includes('cabin') || text.includes('cabine') || text.includes('cabina')) return 'CABIN';
  if (text.includes('hydraulic') || text.includes('hidráulico')) return 'HYDRAULIC';
  if (text.includes('coolant')) return 'COOLANT';
  return 'OIL';
}

function detectSubtype(text) {
  if (text.includes('spin-on') || text.includes('spin on')) return 'SPIN-ON';
  if (text.includes('cartridge') || text.includes('cartucho')) return 'CARTRIDGE';
  if (text.includes('element') || text.includes('elemento')) return 'ELEMENT';
  if (text.includes('panel')) return 'PANEL';
  if (text.includes('radial')) return 'RADIAL_SEAL';
  if (text.includes('separator') || text.includes('séparateur')) return 'SEPARATOR';
  return 'STANDARD';
}

function extractCodigoDonaldson($, fallback) {
  const partNum = $('.part-number, [class*="partNumber"], [class*="sku"]').first().text().trim();
  return partNum.replace(/[^A-Z0-9]/gi, '').toUpperCase() || fallback;
}

function extractOEMCodes($) {
  const codes = [];
  $('.cross-reference, [class*="crossRef"], [class*="oem"]').each((i, el) => {
    const text = $(el).text().trim();
    const matches = text.match(/[A-Z]{2,}[:\s]+([A-Z0-9-]+)/gi);
    if (matches) codes.push(...matches);
  });
  return codes.length > 0 ? codes.join('|') : '';
}

function extractCrossReferences($) {
  const refs = [];
  $('.cross-reference table tr, [class*="crossRef"] tr').each((i, row) => {
    const mfr = $(row).find('td').eq(0).text().trim();
    const pn = $(row).find('td').eq(1).text().trim();
    if (mfr && pn) refs.push({ manufacturer: mfr, part_number: pn });
  });
  return refs;
}

function extractMediaType($) {
  const text = $('.specifications, [class*="spec"]').text().toLowerCase();
  if (text.includes('synteq')) return 'SYNTHETIC';
  if (text.includes('ultra-web')) return 'NANOFIBER';
  if (text.includes('cellulose')) return 'CELLULOSE';
  return 'STANDARD';
}

function extractEquipmentApps($) {
  const apps = [];
  $('.applications, [class*="application"]').find('li, p').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 100) apps.push(text);
  });
  return apps.join('|');
}

function extractEngineApps($) {
  const apps = extractEquipmentApps($);
  return apps.includes('DIESEL') ? 'DIESEL_HD' : apps.includes('GASOLINE') ? 'GASOLINE_LD' : '';
}

function extractSpec($, ...keywords) {
  const specs = $('.productSpecsSection, .specifications').text();
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}[:\\s]+([\\d\\.]+[^\\n]*)`, 'i');
    const match = specs.match(regex);
    if (match) return match[1].trim();
  }
  return null;
}

function convertToMM(valueWithUnit) {
  if (!valueWithUnit) return null;
  const match = String(valueWithUnit).match(/([\d\.]+)\s*(mm|cm|in|inch|pouces)/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'mm') return val;
  if (unit === 'cm') return val * 10;
  if (unit.includes('in') || unit.includes('pouce')) return val * 25.4;
  return null;
}

function extractEfficiency($, specs) {
  const match = specs.match(/efficiency[:\s]+([\d\.]+)\s*%/i);
  return match ? parseFloat(match[1]) : null;
}

function extractTempMin($, specs) {
  const match = specs.match(/min.*temp[:\s]+(-?[\d\.]+)\s*(°?c|f)/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return match[2].toLowerCase().includes('f') ? (val - 32) * 5/9 : val;
}

function extractTempMax($, specs) {
  const match = specs.match(/max.*temp[:\s]+([\d\.]+)\s*(°?c|f)/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return match[2].toLowerCase().includes('f') ? (val - 32) * 5/9 : val;
}

function extractPressureMin($, specs) {
  const match = specs.match(/min.*pressure[:\s]+([\d\.]+)\s*(psi|bar)/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return match[2].toLowerCase() === 'bar' ? val * 14.5038 : val;
}

function extractPressureMax($, specs) {
  const match = specs.match(/max.*pressure[:\s]+([\d\.]+)\s*(psi|bar)/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return match[2].toLowerCase() === 'bar' ? val * 14.5038 : val;
}

function extractDirtCapacity($, specs) {
  const match = specs.match(/dirt.*capacity[:\s]+([\d\.]+)\s*(g|grams|oz)/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return match[2].toLowerCase().includes('oz') ? val * 28.3495 : val;
}

function extractWaterSep($, specs) {
  const match = specs.match(/water.*separation[:\s]+([\d\.]+)\s*%/i);
  return match ? parseFloat(match[1]) : null;
}

function extractDrainType($, specs) {
  const text = specs.toLowerCase();
  if (text.includes('manual drain')) return 'MANUAL';
  if (text.includes('auto') || text.includes('automatic')) return 'AUTOMATIC';
  return null;
}

function extractFlowCFM($, specs) {
  const match = specs.match(/flow[:\s]+([\d\.]+)\s*cfm/i);
  return match ? parseFloat(match[1]) : null;
}

function extractPleatCount($, specs) {
  const match = specs.match(/pleat[:\s]+([\d]+)/i);
  return match ? parseInt(match[1]) : null;
}

function extractFlowGPM($, specs) {
  const match = specs.match(/flow[:\s]+([\d\.]+)\s*gpm/i);
  return match ? parseFloat(match[1]) : null;
}

function extractSealMaterial($, specs) {
  const text = specs.toLowerCase();
  if (text.includes('nitrile') || text.includes('buna')) return 'NITRILE';
  if (text.includes('viton')) return 'VITON';
  if (text.includes('silicone')) return 'SILICONE';
  return null;
}

function extractHousingMaterial($, specs) {
  const text = specs.toLowerCase();
  if (text.includes('steel') || text.includes('acero')) return 'STEEL';
  if (text.includes('aluminum')) return 'ALUMINUM';
  if (text.includes('plastic')) return 'PLASTIC';
  return null;
}

function extractFluidCompatibility($, specs) {
  const fluids = [];
  const text = specs.toLowerCase();
  if (text.includes('petroleum')) fluids.push('PETROLEUM');
  if (text.includes('synthetic')) fluids.push('SYNTHETIC');
  if (text.includes('biodegradable')) fluids.push('BIODEGRADABLE');
  return fluids.length > 0 ? fluids.join('|') : null;
}

function extractDisposalMethod($, specs) {
  const text = specs.toLowerCase();
  if (text.includes('recycle')) return 'RECYCLABLE';
  if (text.includes('inciner')) return 'INCINERATION';
  return null;
}

function extractStandards($, specs) {
  const standards = [];
  if (specs.match(/ISO\s*\d+/i)) standards.push('ISO');
  if (specs.includes('SAE')) standards.push('SAE');
  return standards.length > 0 ? standards.join('|') : null;
}

function extractCertifications($, specs) {
  const certs = [];
  if (specs.includes('CE')) certs.push('CE');
  if (specs.includes('ISO 9001')) certs.push('ISO_9001');
  return certs.length > 0 ? certs.join('|') : null;
}

function extractServiceLife($, specs) {
  const match = specs.match(/service.*life[:\s]+([\d]+)\s*hour/i);
  return match ? parseInt(match[1]) : null;
}

function extractChangeInterval($, specs) {
  const matchKM = specs.match(/interval[:\s]+([\d]+)\s*km/i);
  if (matchKM) return parseInt(matchKM[1]);
  const matchMiles = specs.match(/interval[:\s]+([\d]+)\s*mile/i);
  return matchMiles ? parseInt(matchMiles[1]) * 1.60934 : null;
}

function extractWeight($, specs) {
  const match = specs.match(/weight[:\s]+([\d\.]+)\s*(g|kg|lb)/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'g') return val;
  if (unit === 'kg') return val * 1000;
  if (unit === 'lb') return val * 453.592;
  return null;
}

function extractTechOriginal($, text) {
  if (text.includes('synteq xp') || text.includes('synteq™ xp')) return 'DONALDSON_SYNTEQ_XP';
  if (text.includes('synteq dry') || text.includes('synteq™ dry')) return 'DONALDSON_SYNTEQ_DRY';
  if (text.includes('synteq')) return 'DONALDSON_SYNTEQ';
  if (text.includes('ultra-web hd') || text.includes('ultra-web® hd')) return 'DONALDSON_ULTRA_WEB_HD';
  if (text.includes('ultra-web fr') || text.includes('ultra-web® fr')) return 'DONALDSON_ULTRA_WEB_FR';
  if (text.includes('ultra-web')) return 'DONALDSON_ULTRA_WEB';
  if (text.includes('powercore')) return 'DONALDSON_POWERCORE';
  if (text.includes('radialseal')) return 'DONALDSON_RADIALSEAL';
  if (text.includes('duramax he')) return 'DONALDSON_DURAMAX_HE';
  if (text.includes('blue')) return 'DONALDSON_BLUE';
  if (text.includes('endurance')) return 'DONALDSON_ENDURANCE_CABIN';
  return null;
}

function extractImageURL($) {
  const img = $('.product-image img, [class*="productImage"] img').first();
  return img.attr('src') || img.attr('data-src') || '';
}

module.exports = { scrapeDonaldson };
