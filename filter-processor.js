// ============================================
// ELIMFILTERS FILTER PROCESSOR v8.8
// Business Logic: Classification, SKU Generation, 51 Fields
// ============================================

const fs = require('fs');
const path = require('path');

// Cargar technology matrix
let technologyMatrix = null;
try {
  const matrixPath = path.join(__dirname, 'technology_matrix.json');
  technologyMatrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  console.log('✅ Technology matrix loaded');
} catch (err) {
  console.error('❌ Failed to load technology matrix');
}

// ============================================
// FUNCIÓN PRINCIPAL: PROCESAR FILTRO
// ============================================
async function processFilter(oemCode, scrapedSpecs) {
  console.log(`\n⚙️  [PROCESSOR v8.8] Processing: ${oemCode}`);
  
  if (!scrapedSpecs || scrapedSpecs.error) {
    throw new Error('Invalid scraped specs');
  }
  
  // 1. Usar duty del análisis técnico v8.8
  const dutyType = scrapedSpecs.target_duty || 'HD';
  console.log(`   Duty (from specs): ${dutyType}`);
  console.log(`   Reasoning: ${scrapedSpecs.technical_reasoning}`);
  
  // 2. Clasificar tipo de filtro
  const classification = classifyByFunction(scrapedSpecs);
  console.log(`   Type: ${classification.type} (${classification.elimPrefix})`);
  
  // 3. Aplicar tecnología (con reglas especiales)
  const technology = applyTechnology(
    classification.elimPrefix,
    dutyType,
    scrapedSpecs
  );
  
  // 4. Generar SKU desde root limpio
  const elimSKU = generateSKU(
    scrapedSpecs.normsku_root,
    technology.elimPrefix
  );
  
  console.log(`   ✅ ELIM SKU: ${elimSKU}`);
  
  // 5. Construir respuesta 51 campos
  return build51Fields(
    oemCode,
    elimSKU,
    dutyType,
    classification,
    technology,
    scrapedSpecs
  );
}

// ============================================
// CLASIFICAR POR FUNCIÓN
// ============================================
function classifyByFunction(specs) {
  const func = (specs.filter_function || '').toUpperCase();
  const desc = (specs.manufacturer_description || '').toUpperCase();
  
  // Oil
  if (func.includes('OIL') || func.includes('LUBE') || desc.includes('LUBE')) {
    return { type: 'Oil Filter', elimPrefix: 'EL8' };
  }
  
  // Fuel Water Separator
  if (func.includes('FUEL_WATER') || func.includes('WATER_SEPARATOR')) {
    return { type: 'Fuel Water Separator', elimPrefix: 'ES9' };
  }
  
  // Fuel Standard
  if (func.includes('FUEL')) {
    return { type: 'Fuel Filter', elimPrefix: 'EF9' };
  }
  
  // Air (todos los tipos)
  if (func.includes('AIR') && !func.includes('CABIN')) {
    return { type: 'Air Filter', elimPrefix: 'EA1' };
  }
  
  // Cabin
  if (func.includes('CABIN') || func.includes('HVAC')) {
    return { type: 'Cabin Air Filter', elimPrefix: 'EC1' };
  }
  
  // Hydraulic
  if (func.includes('HYDRAULIC')) {
    return { type: 'Hydraulic Filter', elimPrefix: 'EH6' };
  }
  
  // Coolant
  if (func.includes('COOLANT') || func.includes('WATER')) {
    return { type: 'Coolant Filter', elimPrefix: 'EW7' };
  }
  
  // Default
  return { type: 'Filter', elimPrefix: 'EF9' };
}

// ============================================
// APLICAR TECNOLOGÍA
// ============================================
function applyTechnology(elimPrefix, dutyType, specs) {
  if (!technologyMatrix) {
    return {
      elimPrefix,
      technology_name: 'ELIMTEK™ Industrial Grade',
      technology_tier: dutyType === 'HD' ? 'Premium Industrial Grade' : 'Premium Automotive Grade',
      technology_description: 'Advanced filtration technology'
    };
  }
  
  let finalPrefix = elimPrefix;
  const desc = (specs.manufacturer_description || '').toUpperCase();
  
  // Regla especial: Turbina
  if (desc.includes('TURBINE') || desc.includes('RACOR')) {
    finalPrefix = 'ET9';
    console.log('   ⚠️  Turbine detected → ET9');
  }
  
  // Regla especial: Marine
  if (dutyType === 'MARINE') {
    finalPrefix = 'EM9';
    console.log('   ⚠️  Marine duty → EM9');
  }
  
  const tech = technologyMatrix.technology_matrix[finalPrefix];
  if (!tech) {
    return {
      elimPrefix: finalPrefix,
      technology_name: 'ELIMTEK™ Industrial Grade',
      technology_tier: 'Premium Industrial Grade'
    };
  }
  
  const tier = dutyType === 'HD' ? tech.tier_hd : 
               dutyType === 'MARINE' ? 'Premium Marine Grade' :
               tech.tier_ld;
  
  return {
    elimPrefix: finalPrefix,
    technology_name: tech.technology_name,
    technology_tier: tier,
    technology_description: tech.technology_description,
    key_attribute: tech.key_attribute
  };
}

// ============================================
// GENERAR SKU
// ============================================
function generateSKU(numericRoot, elimPrefix) {
  // Root ya viene limpio del scraper v8.8
  if (!numericRoot || !/^\d+$/.test(numericRoot)) {
    console.error(`   ❌ Invalid numeric root: ${numericRoot}`);
    return elimPrefix + '0000';
  }
  
  // Asegurar 4 dígitos
  const base = numericRoot.padStart(4, '0').slice(-4);
  
  return elimPrefix + base;
}

// ============================================
// BUILD 51 CAMPOS
// ============================================
function build51Fields(query, elimSKU, dutyType, classification, technology, specs) {
  return {
    '1_query': query,
    '2_normsku': elimSKU,
    '3_duty_type': dutyType,
    '4_type': classification.type,
    '5_subtype': specs.style || 'Standard',
    '6_description': `ELIMTEK™ ${technology.technology_name} - ${classification.type}`,
    '7_oem_codes': query,
    '8_cross_reference_codes': buildCrossReferenceCodes(specs),
    '9_price_usd': '0.00',
    '10_equipment_applications': specs.equipment_applications || specs.applications || '',
    '11_engine_applications': specs.engine_applications || '',
    '12_industry_segments': specs.industry_segments || '',
    '13_media_type': specs.media_type || '',
    '14_thread_size': specs.thread_size || '',
    '15_height_mm': specs.height_mm || 0,
    '16_outer_diameter_mm': specs.outer_diameter_mm || 0,
    '17_inner_diameter_mm': specs.inner_diameter_mm || 0,
    '18_gasket_od_mm': specs.gasket_od_mm || 0,
    '19_gasket_id_mm': specs.gasket_id_mm || 0,
    '20_gasket_thickness_mm': 0,
    '21_panel_length_mm': 0,
    '22_panel_width_mm': 0,
    '23_panel_depth_mm': 0,
    '24_drain_type': '',
    '25_micron_rating': specs.micron_rating || 0,
    '26_beta_ratio': '',
    '27_iso_test_method': specs.efficiency_standard || '',
    '28_rated_flow_gpm': specs.flow_rating_gpm || 0,
    '29_rated_flow_cfm': 0,
    '30_max_pressure_psi': specs.pressure_rating_psi || 0,
    '31_burst_pressure_psi': 0,
    '32_collapse_pressure_psi': 0,
    '33_operating_temp_min_c': specs.operating_temp_min_c || -40,
    '34_operating_temp_max_c': specs.operating_temp_max_c || 120,
    '35_fluid_compatibility': '',
    '36_seal_material': '',
    '37_housing_material': '',
    '38_end_cap_material': '',
    '39_weight_grams': 0,
    '40_service_life_hours': 0,
    '41_change_interval_km': 0,
    '42_warranty_months': 12,
    '43_certifications': 'ISO 9001',
    '44_stock_status': 'Available',
    '45_tecnologia_aplicada': technology.technology_name,
    '46_technology_tier': technology.technology_tier,
    '47_technology_scope': technology.technology_description,
    '48_manufacturer_detected': 'ELIMFILTERS',
    '49_oem_brand_detected': 'OEM Equivalent',
    '50_technology_oem_detected': dutyType === 'HD' ? 'Industrial Grade Filtration' : 
                                   dutyType === 'MARINE' ? 'Marine Grade Filtration' :
                                   'Automotive Grade Filtration',
    '51_kit_components': null,
    
    _metadata: {
      normsku_root: specs.normsku_root,
      technical_reasoning: specs.technical_reasoning,
      duty_factors: specs.duty_determination_factors,
      original_manufacturer: specs.manufacturer
    }
  };
}

function buildCrossReferenceCodes(specs) {
  const codes = [specs.oem_code];
  
  if (specs.cross_reference) {
    Object.values(specs.cross_reference).forEach(code => {
      if (code && code !== specs.oem_code) {
        codes.push(code);
      }
    });
  }
  
  return codes.filter(Boolean).join(', ');
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
  processFilter
};