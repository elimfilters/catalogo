// ============================================================================
// DONALDSON SCRAPER v8.1.0 - URL DIRECTA + DUTY DETECTION
// URL: https://shop.donaldson.com
// ============================================================================

const axios = require('axios');
const cheerio = require('cheerio');
const { extract4Digits } = require('../utils/digitExtractor');
const { determineDuty } = require('../utils/determineDuty');

async function scrapeDonaldson(codigo) {
  try {
    const normalized = String(codigo).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // ✅ ESTRATEGIA 1: Intentar URL directa primero
    // Formato: https://shop.donaldson.com/store/es-us/product/P552100
    const directURL = `https://shop.donaldson.com/store/es-us/product/${normalized}`;
    
    console.log(`[DONALDSON] Intentando URL directa: ${directURL}`);
    
    try {
      const directResponse = await axios.get(directURL, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-US,es;q=0.9,en;q=0.8'
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Aceptar redirects
        }
      });
      
      // Si llegamos aquí, la URL directa funcionó
      const $ = cheerio.load(directResponse.data);
      
      // Verificar que sea una página de producto válida
      const titulo = $('h1, .product-title, .prodTitle').first().text().trim();
      
      if (titulo && titulo.length > 0) {
        console.log(`[DONALDSON] ✅ URL directa exitosa`);
        const datos = extractFullData($, normalized, directResponse.request.res.responseUrl || directURL);
        
        console.log(`[DONALDSON] Encontrado: ${normalized} | Tipo: ${datos.type} | Duty: ${datos.duty_type}`);
        return { encontrado: true, datos };
      }
    } catch (directError) {
      console.log(`[DONALDSON] URL directa falló, intentando búsqueda...`);
    }
    
    // ✅ ESTRATEGIA 2: Fallback a búsqueda (si la URL directa falla)
    const searchURL = `https://shop.donaldson.com/store/es-us/search?text=${normalized}`;
    
    console.log(`[DONALDSON] Buscando: ${searchURL}`);
    
    const searchResponse = await axios.get(searchURL, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    });
    
    const $search = cheerio.load(searchResponse.data);
    
    // Intentar múltiples selectores para el link del producto
    let productLink = null;
    
    const selectors = [
      'a[href*="/product/"]',
      '.product-link',
      '.product-tile a',
      '[data-product-url]',
      'a.tile-link',
      '.search-result a'
    ];
    
    for (const selector of selectors) {
      productLink = $search(selector).first().attr('href');
      if (productLink) {
        console.log(`[DONALDSON] Link encontrado con selector: ${selector}`);
        break;
      }
    }
    
    if (!productLink) {
      console.log(`[DONALDSON] No encontrado: ${normalized}`);
      return { encontrado: false, razon: 'No encontrado en Donaldson' };
    }
    
    // Construir URL completa si es relativa
    const productURL = productLink.startsWith('http') 
      ? productLink 
      : `https://shop.donaldson.com${productLink}`;
    
    console.log(`[DONALDSON] Obteniendo producto: ${productURL}`);
    
    const productResponse = await axios.get(productURL, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(productResponse.data);
    
    const datos = extractFullData($, normalized, productURL);
    
    console.log(`[DONALDSON] Encontrado: ${normalized} | Tipo: ${datos.type} | Duty: ${datos.duty_type}`);
    
    return { encontrado: true, datos };
    
  } catch (error) {
    console.error(`[DONALDSON] Error:`, error.message);
    return { encontrado: false, razon: error.message };
  }
}

function extractFullData($, codigo, productURL) {
  const breadcrumb = $('.breadcrumb, [class*="breadcrumb"]').text().toLowerCase();
  const titulo = $('h1, .product-title, .prodTitle').first().text().trim();
  const descripcion = $('.prodDesc, .product-description, [class*="description"]').text().trim();
  const specs = $('.productSpecsSection, .specifications, [class*="spec"]').text();
  const allText = [breadcrumb, titulo, descripcion, specs].join(' ').toLowerCase();
  
  const engineApps = extractEngineApps($);
  const equipmentApps = extractEquipmentApps($);
  const detectedDuty = determineDuty(engineApps, equipmentApps, allText);
  
  return {
    query: codigo,
    norm: extractCodigoDonaldson($, codigo),
    duty_type: detectedDuty,
    type: detectType(breadcrumb, titulo),
    subtype: detectSubtype(allText),
    description: titulo || descripcion.substring(0, 200),
    
    oem_codes: extractOEMCodes($),
    cross_reference: extractCrossReferences($),
    
    media_type: extractMediaType($, allText),
    equipment_applications: equipmentApps,
    engine_applications: engineApps,
    
    height_mm: convertToMM(extractSpec($, 'Height', 'Altura', 'A')),
    outer_diameter_mm: convertToMM(extractSpec($, 'Outer Diameter', 'OD', 'B')),
    inner_diameter_mm: convertToMM(extractSpec($, 'Inner Diameter', 'ID', 'C')),
    thread_size: extractSpec($, 'Thread Size', 'Thread', 'Rosca'),
    
    micron_rating: extractSpec($, 'Micron Rating', 'Micron', 'Filtration'),
    beta_200: extractBeta($, specs),
    iso_main_efficiency_percent: extractEfficiency($, specs),
    iso_test_method: extractTestMethod($, specs),
    
    operating_temperature_min_c: extractTempMin($, specs),
    operating_temperature_max_c: extractTempMax($, specs),
    operating_pressure_min_psi: extractPressureMin($, specs),
    operating_pressure_max_psi: extractPressureMax($, specs),
    
    bypass_valve_psi: extractBypassPressure($, specs),
    hydrostatic_burst_psi: extractBurstPressure($, specs),
    dirt_capacity_grams: extractDirtCapacity($, specs),
    water_separation_efficiency_percent: extractWaterSeparation($, specs),
    drain_type: extractDrainType($, allText),
    rated_flow_cfm: extractFlowCFM($, specs),
    pleat_count: extractPleatCount($, specs),
    panel_width_mm: convertToMM(extractSpec($, 'Width', 'Ancho', 'W')),
    panel_depth_mm: convertToMM(extractSpec($, 'Depth', 'Profundidad', 'D')),
    rated_flow_gpm: extractFlowGPM($, specs),
    
    seal_material: extractSealMaterial($, specs),
    housing_material: extractHousingMaterial($, specs),
    gasket_od_mm: convertToMM(extractSpec($, 'Gasket OD', 'OD Empaque')),
    gasket_id_mm: convertToMM(extractSpec($, 'Gasket ID', 'ID Empaque')),
    fluid_compatibility: extractFluidCompatibility($, specs),
    disposal_method: 'RECYCLABLE',
    
    manufacturing_standards: extractManufacturingStandards($, specs),
    certification_standards: extractCertifications($, specs),
    service_life_hours: extractServiceLife($, specs),
    change_interval_km: extractChangeInterval($, specs),
    weight_grams: extractWeight($, specs),
    
    _tech_original_detected: null,
    product_url: productURL,
    imagen_url: extractImage($),
    breadcrumb: breadcrumb,
    manufacturer: 'DONALDSON',
    source: 'DONALDSON_OFFICIAL',
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// FUNCIONES DE EXTRACCIÓN (mantener todas las funciones originales)
// ============================================================================

function extractCodigoDonaldson($, codigo) {
  const partNumber = $('.part-number, [class*="partNumber"], [data-part]').first().text().trim();
  return partNumber || codigo;
}

function detectType(breadcrumb, titulo) {
  const text = `${breadcrumb} ${titulo}`.toLowerCase();
  
  if (text.includes('oil') || text.includes('aceite') || text.includes('lubrication')) return 'OIL';
  if (text.includes('fuel') || text.includes('combustible') || text.includes('diesel fuel')) return 'FUEL';
  if (text.includes('air') || text.includes('aire') || text.includes('intake')) return 'AIR';
  if (text.includes('cabin') || text.includes('cabina') || text.includes('hvac')) return 'CABIN';
  if (text.includes('hydraulic') || text.includes('hidraulico')) return 'HYDRAULIC';
  if (text.includes('transmission') || text.includes('transmision')) return 'TRANSMISSION';
  if (text.includes('coolant') || text.includes('refrigerante')) return 'COOLANT';
  if (text.includes('separator') || text.includes('separador') || text.includes('fuel/water')) return 'SEPARATOR';
  
  return 'UNKNOWN';
}

function detectSubtype(text) {
  if (text.includes('synthetic')) return 'SYNTHETIC';
  if (text.includes('ultra') || text.includes('premium') || text.includes('endurance')) return 'PREMIUM';
  if (text.includes('blue') || text.includes('powercore')) return 'PREMIUM';
  return 'STANDARD';
}

function extractEngineApps($) {
  const apps = [];
  $('.engine-application, [class*="engine"], .applications .engine').each((i, el) => {
    const app = $(el).text().trim();
    if (app && app.length > 3) apps.push(app);
  });
  return apps.join(', ');
}

function extractEquipmentApps($) {
  const apps = [];
  $('.equipment-application, [class*="equipment"], .applications .equipment').each((i, el) => {
    const app = $(el).text().trim();
    if (app && app.length > 3) apps.push(app);
  });
  return apps.join(', ');
}

function extractOEMCodes($) {
  const oems = [];
  $('.oem-code, [class*="oem"], .cross-reference .oem').each((i, el) => {
    const code = $(el).text().trim();
    if (code) oems.push(code);
  });
  return oems.join(', ');
}

function extractCrossReferences($) {
  const refs = [];
  $('.cross-reference, [class*="cross"], .competitor').each((i, el) => {
    const ref = $(el).text().trim();
    if (ref && ref.length > 2) refs.push(ref);
  });
  return refs;
}

function extractMediaType($, text) {
  if (text.includes('synthetic')) return 'SYNTHETIC';
  if (text.includes('cellulose')) return 'CELLULOSE';
  if (text.includes('nanofiber') || text.includes('ultra-web')) return 'NANOFIBER';
  return 'STANDARD';
}

function extractSpec($, ...terms) {
  for (const term of terms) {
    const spec = $(`.spec:contains("${term}"), [class*="spec"]:contains("${term}")`).first();
    if (spec.length) {
      const value = spec.text().replace(new RegExp(term, 'i'), '').trim();
      if (value) return value;
    }
  }
  return null;
}

function extractBeta($, specs) {
  const match = specs.match(/beta.*?(\d+)/i);
  return match ? parseFloat(match[1]) : null;
}

function extractEfficiency($, specs) {
  const match = specs.match(/(\d+(?:\.\d+)?)%.*?efficiency/i);
  return match ? parseFloat(match[1]) : null;
}

function extractTestMethod($, specs) {
  if (specs.includes('ISO 16889')) return 'ISO_16889';
  if (specs.includes('ISO 4572')) return 'ISO_4572';
  return null;
}

function extractTempMin($, specs) {
  const match = specs.match(/(-?\d+)°?[CF].*?min/i);
  return match ? parseFloat(match[1]) : null;
}

function extractTempMax($, specs) {
  const match = specs.match(/(-?\d+)°?[CF].*?max/i);
  return match ? parseFloat(match[1]) : null;
}

function extractPressureMin($, specs) {
  const match = specs.match(/(\d+)\s*psi.*?min/i);
  return match ? parseFloat(match[1]) : null;
}

function extractPressureMax($, specs) {
  const match = specs.match(/(\d+)\s*psi.*?max/i);
  return match ? parseFloat(match[1]) : null;
}

function extractBypassPressure($, specs) {
  const match = specs.match(/bypass.*?(\d+)\s*psi/i);
  return match ? parseFloat(match[1]) : null;
}

function extractBurstPressure($, specs) {
  const match = specs.match(/burst.*?(\d+)\s*psi/i);
  return match ? parseFloat(match[1]) : null;
}

function extractDirtCapacity($, specs) {
  const match = specs.match(/(\d+)\s*g.*?dirt/i);
  return match ? parseFloat(match[1]) : null;
}

function extractWaterSeparation($, specs) {
  const match = specs.match(/(\d+)%.*?water/i);
  return match ? parseFloat(match[1]) : null;
}

function extractDrainType($, text) {
  if (text.includes('hand drain')) return 'HAND';
  if (text.includes('automatic')) return 'AUTOMATIC';
  return null;
}

function extractFlowCFM($, specs) {
  const match = specs.match(/(\d+)\s*cfm/i);
  return match ? parseFloat(match[1]) : null;
}

function extractPleatCount($, specs) {
  const match = specs.match(/(\d+)\s*pleat/i);
  return match ? parseInt(match[1]) : null;
}

function extractFlowGPM($, specs) {
  const match = specs.match(/(\d+)\s*gpm/i);
  return match ? parseFloat(match[1]) : null;
}

function extractSealMaterial($, specs) {
  if (specs.includes('nitrile')) return 'NITRILE';
  if (specs.includes('silicone')) return 'SILICONE';
  if (specs.includes('viton')) return 'VITON';
  return null;
}

function extractHousingMaterial($, specs) {
  if (specs.includes('steel')) return 'STEEL';
  if (specs.includes('aluminum')) return 'ALUMINUM';
  if (specs.includes('plastic')) return 'PLASTIC';
  return null;
}

function extractFluidCompatibility($, specs) {
  const fluids = [];
  if (specs.includes('petroleum')) fluids.push('PETROLEUM');
  if (specs.includes('biodiesel')) fluids.push('BIODIESEL');
  if (specs.includes('synthetic')) fluids.push('SYNTHETIC');
  return fluids.join(', ') || null;
}

function extractManufacturingStandards($, specs) {
  const standards = [];
  if (specs.includes('ISO 9001')) standards.push('ISO_9001');
  if (specs.includes('TS 16949')) standards.push('TS_16949');
  return standards.join(', ') || null;
}

function extractCertifications($, specs) {
  const certs = [];
  if (specs.includes('OEM')) certs.push('OEM_APPROVED');
  if (specs.includes('ISO')) certs.push('ISO_CERTIFIED');
  return certs.join(', ') || null;
}

function extractServiceLife($, specs) {
  const match = specs.match(/(\d+)\s*hour/i);
  return match ? parseInt(match[1]) : null;
}

function extractChangeInterval($, specs) {
  const match = specs.match(/(\d+)\s*(?:km|miles)/i);
  return match ? parseInt(match[1]) : null;
}

function extractWeight($, specs) {
  const match = specs.match(/(\d+(?:\.\d+)?)\s*(?:g|kg|lb)/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[0].toLowerCase();
  if (unit.includes('kg')) return value * 1000;
  if (unit.includes('lb')) return value * 453.592;
  return value;
}

function extractImage($) {
  const img = $('.product-image img, [class*="image"] img, [data-product-image]').first();
  return img.attr('src') || img.attr('data-src') || '';
}

function convertToMM(value) {
  if (!value) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  
  if (value.includes('in') || value.includes('"')) return Math.round(num * 25.4);
  if (value.includes('mm')) return Math.round(num);
  return Math.round(num);
}

module.exports = { scrapeDonaldson };
