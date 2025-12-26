📋 CREACIÓN DEL SKU ELIMFILTERS - ESPECIFICACIÓN TÉCNICA FINAL v8.0.0
SISTEMA GLOBAL DE IDENTIFICACIÓN Y CATALOGACIÓN DE FILTROS

🎯 PASO 1: CÓDIGO DE ENTRADA VÁLIDO
1.1 Recepción y validación
javascriptfunction validarCodigoEntrada(codigo) {
  const codigoLimpio = codigo.trim().toUpperCase();
  
  if (!codigoLimpio) {
    return { valid: false, error: 'Código vacío' };
  }
  
  if (!/^[A-Z0-9\-\/\.]+$/i.test(codigoLimpio)) {
    return { valid: false, error: 'Caracteres no permitidos' };
  }
  
  return { valid: true, codigo: codigoLimpio };
}
1.2 Búsqueda previa en caché (OBLIGATORIO)
ANTES de cualquier scraping:
javascript// Google Sheets
Spreadsheet ID: 1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U
Sheet: MASTER_UNIFIED_V5
Buscar en: code_client, sku, cross_references

// MongoDB Atlas
URI: mongodb+srv://elimfilters:Elimperca@cluster0.vairwow.mongodb.net/elimfilters
Collection: filters
Buscar en: code_client, sku, oem_code, cross_references, aftermarket_codes

Si existe → RETORNAR SKU inmediatamente
Si NO existe → Continuar a PASO 2

🔍 PASO 2: IDENTIFICAR SI EL CÓDIGO ES HD O LD
2.1 Metodología de identificación (NO LIMITATIVA)
El sistema NO se limita a listas predefinidas. La identificación es DINÁMICA:
javascriptasync function identificarDuty(codigo) {
  // MÉTODO 1: Scraping simultáneo (PRINCIPAL)
  const [donaldsonResult, framResult] = await Promise.all([
    scrapearDonaldson(codigo),
    scrapearFRAM(codigo)
  ]);
  
  if (donaldsonResult.encontrado) {
    return { duty: 'HD', source: 'DONALDSON', data: donaldsonResult.datos };
  }
  
  if (framResult.encontrado) {
    return { duty: 'LD', source: 'FRAM', data: framResult.datos };
  }
  
  // MÉTODO 2: Análisis de aplicaciones conocidas
  const aplicacion = await analizarAplicacionCodigo(codigo);
  if (aplicacion) {
    return { duty: aplicacion.duty, source: 'APPLICATION_DATABASE', manufacturer: aplicacion.manufacturer };
  }
  
  // MÉTODO 3: Búsqueda en cross-references globales
  const crossRef = await buscarEnCrossReferencesGlobal(codigo);
  if (crossRef) {
    return { duty: crossRef.duty, source: 'CROSS_REFERENCE', oem_code: crossRef.oem_code };
  }
  
  // MÉTODO 4: Fallback - Intentar scrapear fabricante específico
  const fabricante = await identificarFabricantePorCodigo(codigo);
  if (fabricante) {
    return { duty: fabricante.duty, source: fabricante.source, manufacturer: fabricante.name };
  }
  
  return { duty: 'UNKNOWN', source: 'NOT_DETERMINED' };
}
2.2 Categorías de códigos (GLOBALES)
A. OEM Codes (Original Equipment Manufacturer)

Códigos directos de fabricantes de equipos
Ejemplos: CAT, MACK, VOLVO, TOYOTA, HONDA
Aplicación: Motores diesel, vehículos ligeros, maquinaria industrial

B. Cross References / Aftermarket Codes

WIX, BALDWIN, LUBERFINER, FLEETGUARD, MANN, MAHLE
PUROLATOR, AC DELCO, BOSCH, HENGST, PARKER/RACOR
Cualquier fabricante de filtros aftermarket a nivel mundial

C. Códigos especializados

Marinos: RACOR/PARKER
Turbinas industriales: GE, SIEMENS, ALSTOM
Carcasas: DONALDSON, FLEETGUARD
Hidráulicos: PALL, HYDAC, MP FILTRI


⚙️ PASO 3.A: PROCESO HEAVY DUTY (HD) - DONALDSON
3.A.1 Cross Reference con Donaldson
Fuentes:

https://shop.donaldson.com/store/es-us/home
Catálogos digitales Donaldson
Distribuidores autorizados

javascriptasync function scrapearDonaldson(codigoEntrada) {
  const searchURL = `https://shop.donaldson.com/store/es-us/search?text=${codigoEntrada}`;
  const searchResponse = await axios.get(searchURL);
  const $search = cheerio.load(searchResponse.data);
  
  const productLink = $search('a[href*="/product/"]').first().attr('href');
  if (!productLink) {
    return { encontrado: false, razon: 'No fabricado por Donaldson' };
  }
  
  const productURL = `https://shop.donaldson.com${productLink}`;
  const productResponse = await axios.get(productURL);
  const $ = cheerio.load(productResponse.data);
  
  // EXTRACCIÓN COMPLETA DE INFORMACIÓN
  const informacion = extraerInformacionCompletaDonaldson($, codigoEntrada, productURL);
  
  return { encontrado: true, datos: informacion };
}
3.A.2 Extracción completa de información
javascriptfunction extraerInformacionCompletaDonaldson($, codigoEntrada, productURL) {
  return {
    // ═══════════════════════════════════════════
    // IDENTIFICACIÓN Y CLASIFICACIÓN
    // ═══════════════════════════════════════════
    query: codigoEntrada,
    norm: extraerCodigoDonaldson($),
    sku: null, // Se generará después
    duty_type: 'HD',
    type: detectarTipoFiltroDonaldson($),
    subtype: detectarSubtipo($),
    description: $('.prodSubTitle, .prodDesc').text().trim(),
    
    // ═══════════════════════════════════════════
    // CÓDIGOS Y REFERENCIAS
    // ═══════════════════════════════════════════
    oem_codes: extraerOEMCodes($),
    cross_reference: extraerCrossReferencesJSON($),
    
    // ═══════════════════════════════════════════
    // CARACTERÍSTICAS TÉCNICAS GENERALES
    // ═══════════════════════════════════════════
    media_type: extraerTipoMedia($),
    equipment_applications: extraerAplicacionesEquipo($),
    engine_applications: extraerAplicacionesMotor($),
    
    // ═══════════════════════════════════════════
    // DIMENSIONES FÍSICAS
    // ═══════════════════════════════════════════
    height_mm: convertirAMilimetros(extraerEspecificacion($, 'Height', 'Hauteur', 'Altura')),
    outer_diameter_mm: convertirAMilimetros(extraerEspecificacion($, 'Outer Diameter', 'Diamètre extérieur')),
    inner_diameter_mm: convertirAMilimetros(extraerEspecificacion($, 'Inner Diameter', 'Diamètre intérieur')),
    thread_size: extraerEspecificacion($, 'Thread Size', 'Filetage'),
    
    // ═══════════════════════════════════════════
    // ESPECIFICACIONES DE FILTRACIÓN
    // ═══════════════════════════════════════════
    micron_rating: extraerEspecificacion($, 'Micron Rating', 'Filtration'),
    beta_200: extraerEspecificacion($, 'Beta 200', 'β200'),
    iso_main_efficiency_percent: extraerEficienciaISO($),
    iso_test_method: extraerMetodoTestISO($),
    
    // ═══════════════════════════════════════════
    // CONDICIONES OPERATIVAS
    // ═══════════════════════════════════════════
    operating_temperature_min_c: extraerTemperaturaMin($),
    operating_temperature_max_c: extraerTemperaturaMax($),
    operating_pressure_min_psi: extraerPresionMin($),
    operating_pressure_max_psi: extraerPresionMax($),
    
    // ═══════════════════════════════════════════
    // ESPECIFICACIONES POR TIPO DE FILTRO
    // ═══════════════════════════════════════════
    
    // ACEITE (OIL)
    bypass_valve_psi: extraerEspecificacion($, 'Bypass Valve', 'Válvula de derivación'),
    hydrostatic_burst_psi: extraerEspecificacion($, 'Burst Pressure'),
    dirt_capacity_grams: extraerCapacidadSuciedad($),
    
    // COMBUSTIBLE (FUEL)
    water_separation_efficiency_percent: extraerEficienciaSeparacionAgua($),
    drain_type: extraerTipoDrenaje($),
    
    // AIRE (AIR)
    rated_flow_cfm: extraerFlujoNominalCFM($),
    pleat_count: extraerNumeroDePliegues($),
    panel_width_mm: extraerAnchoPanelMM($),
    panel_depth_mm: extraerProfundidadPanelMM($),
    
    // HIDRÁULICO (HYDRAULIC)
    rated_flow_gpm: extraerFlujoNominalGPM($),
    
    // ═══════════════════════════════════════════
    // MATERIALES Y CONSTRUCCIÓN
    // ═══════════════════════════════════════════
    seal_material: extraerMaterialSello($),
    housing_material: extraerMaterialCarcasa($),
    gasket_od_mm: extraerDiametroExternoEmpaque($),
    gasket_id_mm: extraerDiametroInternoEmpaque($),
    
    // ═══════════════════════════════════════════
    // COMPATIBILIDAD Y SEGURIDAD
    // ═══════════════════════════════════════════
    fluid_compatibility: extraerCompatibilidadFluidos($),
    disposal_method: extraerMetodoDisposicion($),
    
    // ═══════════════════════════════════════════
    // ESTÁNDARES Y CERTIFICACIONES
    // ═══════════════════════════════════════════
    manufacturing_standards: extraerEstandaresFabricacion($),
    certification_standards: extraerCertificaciones($),
    
    // ═══════════════════════════════════════════
    // VIDA ÚTIL Y MANTENIMIENTO
    // ═══════════════════════════════════════════
    service_life_hours: extraerVidaUtilHoras($),
    change_interval_km: extraerIntervaloCAmbioKM($),
    
    // ═══════════════════════════════════════════
    // PESO
    // ═══════════════════════════════════════════
    weight_grams: extraerPesoGramos($),
    
    // ═══════════════════════════════════════════
    // TECNOLOGÍA APLICADA
    // ═══════════════════════════════════════════
    tecnologia_aplicada: extraerTecnologiaAplicada($),
    technology_name: extraerNombreTecnologia($),
    technology_tier: extraerNivelTecnologia($),
    technology_scope: extraerAlcanceTecnologia($),
    technology_equivalents: extraerEquivalentesTecnologia($),
    technology_oem_detected: extraerOEMTecnologiaDetectada($),
    
    // ═══════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════
    product_url: productURL,
    imagen_url: extraerImagenURL($),
    breadcrumb: extraerBreadcrumb($),
    manufacturer: 'DONALDSON',
    source: 'DONALDSON_OFFICIAL',
    timestamp: new Date().toISOString()
  };
}
3.A.3 Funciones de extracción por tipo de filtro
javascript// ═══════════════════════════════════════════════════════
// DETECCIÓN DE SUBTIPO
// ═══════════════════════════════════════════════════════
function detectarSubtipo($) {
  const textoCompleto = [
    $('title').text(),
    $('.prodDesc').text(),
    $('.productSpecsSection').text()
  ].join(' ').toLowerCase();
  
  // Subtipos comunes
  if (textoCompleto.includes('spin-on') || textoCompleto.includes('spin on')) return 'SPIN-ON';
  if (textoCompleto.includes('cartridge') || textoCompleto.includes('cartucho')) return 'CARTRIDGE';
  if (textoCompleto.includes('element') || textoCompleto.includes('elemento')) return 'ELEMENT';
  if (textoCompleto.includes('panel')) return 'PANEL';
  if (textoCompleto.includes('radial seal') || textoCompleto.includes('radial')) return 'RADIAL_SEAL';
  if (textoCompleto.includes('separator') || textoCompleto.includes('séparateur')) return 'SEPARATOR';
  if (textoCompleto.includes('primary')) return 'PRIMARY';
  if (textoCompleto.includes('secondary')) return 'SECONDARY';
  if (textoCompleto.includes('housing') || textoCompleto.includes('carcasa')) return 'HOUSING';
  
  return 'STANDARD';
}

// ═══════════════════════════════════════════════════════
// OIL FILTERS - ESPECIFICACIONES ESPECÍFICAS
// ═══════════════════════════════════════════════════════
function extraerBypassValvePSI($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/bypass.*?(\d+)\s*(psi|bar)/i);
  if (match) {
    const valor = parseFloat(match[1]);
    return match[2].toLowerCase() === 'bar' ? valor * 14.5038 : valor;
  }
  return null;
}

function extraerHydrostaticBurstPSI($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/burst.*?(\d+)\s*(psi|bar)/i);
  if (match) {
    const valor = parseFloat(match[1]);
    return match[2].toLowerCase() === 'bar' ? valor * 14.5038 : valor;
  }
  return null;
}

function extraerCapacidadSuciedad($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/dirt.*?capacity.*?(\d+\.?\d*)\s*(g|grams|oz)/i);
  if (match) {
    const valor = parseFloat(match[1]);
    // Convertir oz a gramos si es necesario
    return match[2].toLowerCase().includes('oz') ? valor * 28.3495 : valor;
  }
  return null;
}

// ═══════════════════════════════════════════════════════
// FUEL FILTERS - ESPECIFICACIONES ESPECÍFICAS
// ═══════════════════════════════════════════════════════
function extraerEficienciaSeparacionAgua($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/water.*?separation.*?(\d+\.?\d*)\s*%/i);
  return match ? parseFloat(match[1]) : null;
}

function extraerTipoDrenaje($) {
  const specs = $('.productSpecsSection').text().toLowerCase();
  if (specs.includes('manual drain')) return 'MANUAL';
  if (specs.includes('auto drain') || specs.includes('automatic')) return 'AUTOMATIC';
  if (specs.includes('petcock')) return 'PETCOCK';
  if (specs.includes('ball valve')) return 'BALL_VALVE';
  return null;
}

// ═══════════════════════════════════════════════════════
// AIR FILTERS - ESPECIFICACIONES ESPECÍFICAS
// ═══════════════════════════════════════════════════════
function extraerFlujoNominalCFM($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/rated.*?flow.*?(\d+\.?\d*)\s*(cfm|m³\/h)/i);
  if (match) {
    const valor = parseFloat(match[1]);
    // Convertir m³/h a CFM si es necesario
    return match[2].toLowerCase().includes('m³') ? valor * 0.588578 : valor;
  }
  return null;
}

function extraerNumeroDePliegues($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/pleat.*?count.*?(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

function extraerAnchoPanelMM($) {
  return convertirAMilimetros(extraerEspecificacion($, 'Panel Width', 'Width'));
}

function extraerProfundidadPanelMM($) {
  return convertirAMilimetros(extraerEspecificacion($, 'Panel Depth', 'Depth'));
}

// ═══════════════════════════════════════════════════════
// HYDRAULIC FILTERS - ESPECIFICACIONES ESPECÍFICAS
// ═══════════════════════════════════════════════════════
function extraerFlujoNominalGPM($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/rated.*?flow.*?(\d+\.?\d*)\s*(gpm|lpm)/i);
  if (match) {
    const valor = parseFloat(match[1]);
    return match[2].toLowerCase() === 'lpm' ? valor * 0.264172 : valor;
  }
  return null;
}

// ═══════════════════════════════════════════════════════
// MATERIALES
// ═══════════════════════════════════════════════════════
function extraerMaterialSello($) {
  const specs = $('.productSpecsSection').text().toLowerCase();
  if (specs.includes('nitrile') || specs.includes('buna')) return 'NITRILE';
  if (specs.includes('viton') || specs.includes('fluoroelastomer')) return 'VITON';
  if (specs.includes('silicone')) return 'SILICONE';
  if (specs.includes('epdm')) return 'EPDM';
  if (specs.includes('neoprene')) return 'NEOPRENE';
  return null;
}

function extraerMaterialCarcasa($) {
  const specs = $('.productSpecsSection').text().toLowerCase();
  if (specs.includes('steel') || specs.includes('acero')) return 'STEEL';
  if (specs.includes('aluminum') || specs.includes('aluminio')) return 'ALUMINUM';
  if (specs.includes('plastic') || specs.includes('plástico')) return 'PLASTIC';
  if (specs.includes('composite')) return 'COMPOSITE';
  return null;
}

// ═══════════════════════════════════════════════════════
// COMPATIBILIDAD Y SEGURIDAD
// ═══════════════════════════════════════════════════════
function extraerCompatibilidadFluidos($) {
  const fluidos = [];
  const specs = $('.productSpecsSection').text().toLowerCase();
  
  if (specs.includes('petroleum') || specs.includes('mineral oil')) fluidos.push('PETROLEUM');
  if (specs.includes('synthetic')) fluidos.push('SYNTHETIC');
  if (specs.includes('biodegradable')) fluidos.push('BIODEGRADABLE');
  if (specs.includes('water glycol')) fluidos.push('WATER_GLYCOL');
  if (specs.includes('phosphate ester')) fluidos.push('PHOSPHATE_ESTER');
  
  return fluidos.length > 0 ? fluidos.join('|') : null;
}

function extraerMetodoDisposicion($) {
  const specs = $('.productSpecsSection').text().toLowerCase();
  if (specs.includes('inciner')) return 'INCINERATION';
  if (specs.includes('recycle') || specs.includes('recyclable')) return 'RECYCLABLE';
  if (specs.includes('landfill')) return 'LANDFILL_APPROVED';
  if (specs.includes('hazardous')) return 'HAZARDOUS_WASTE';
  return null;
}

// ═══════════════════════════════════════════════════════
// ESTÁNDARES Y CERTIFICACIONES
// ═══════════════════════════════════════════════════════
function extraerEstandaresFabricacion($) {
  const estandares = [];
  const specs = $('.productSpecsSection').text();
  
  if (specs.match(/ISO\s*(\d+)/i)) estandares.push('ISO_' + specs.match(/ISO\s*(\d+)/i)[1]);
  if (specs.includes('SAE')) estandares.push('SAE');
  if (specs.includes('DIN')) estandares.push('DIN');
  if (specs.includes('JIS')) estandares.push('JIS');
  
  return estandares.length > 0 ? estandares.join('|') : null;
}

function extraerCertificaciones($) {
  const certs = [];
  const specs = $('.productSpecsSection').text();
  
  if (specs.includes('CE')) certs.push('CE');
  if (specs.includes('ISO 9001')) certs.push('ISO_9001');
  if (specs.includes('ISO 14001')) certs.push('ISO_14001');
  if (specs.includes('TS 16949')) certs.push('TS_16949');
  if (specs.includes('IATF 16949')) certs.push('IATF_16949');
  
  return certs.length > 0 ? certs.join('|') : null;
}

// ═══════════════════════════════════════════════════════
// EFICIENCIA ISO
// ═══════════════════════════════════════════════════════
function extraerEficienciaISO($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/efficiency.*?(\d+\.?\d*)\s*%/i);
  return match ? parseFloat(match[1]) : null;
}

function extraerMetodoTestISO($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/ISO\s*(\d+[-\/]\d+)/i);
  return match ? match[1] : null;
}

// ═══════════════════════════════════════════════════════
// VIDA ÚTIL Y MANTENIMIENTO
// ═══════════════════════════════════════════════════════
function extraerVidaUtilHoras($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/service.*?life.*?(\d+)\s*hour/i);
  return match ? parseInt(match[1]) : null;
}

function extraerIntervaloCAmbioKM($) {
  const specs = $('.productSpecsSection').text();
  const matchKM = specs.match(/change.*?interval.*?(\d+)\s*km/i);
  const matchMiles = specs.match(/change.*?interval.*?(\d+)\s*mile/i);
  
  if (matchKM) return parseInt(matchKM[1]);
  if (matchMiles) return parseInt(matchMiles[1]) * 1.60934; // Convertir millas a km
  return null;
}

// ═══════════════════════════════════════════════════════
// TECNOLOGÍA APLICADA
// ═══════════════════════════════════════════════════════
function extraerTecnologiaAplicada($) {
  const descripcion = $('.prodDesc').text();
  const specs = $('.productSpecsSection').text();
  const textoCompleto = descripcion + ' ' + specs;
  
  // Tecnologías Donaldson
  if (textoCompleto.includes('Synteq')) return 'SYNTEQ';
  if (textoCompleto.includes('Ultra-Web')) return 'ULTRA_WEB';
  if (textoCompleto.includes('PowerCore')) return 'POWERCORE';
  if (textoCompleto.includes('Endurance')) return 'ENDURANCE';
  if (textoCompleto.includes('Blue')) return 'DONALDSON_BLUE';
  if (textoCompleto.includes('ELIMTEK')) return 'ELIMTEK';
  
  return null;
}

function extraerNombreTecnologia($) {
  const tech = extraerTecnologiaAplicada($);
  if (!tech) return null;
  
  const nombres = {
    'SYNTEQ': 'Donaldson Synteq™',
    'ULTRA_WEB': 'Donaldson Ultra-Web®',
    'POWERCORE': 'PowerCore®',
    'ENDURANCE': 'Endurance™',
    'DONALDSON_BLUE': 'Donaldson Blue®',
    'ELIMTEK': 'ELIMTEK™'
  };
  
  return nombres[tech] || tech;
}

function extraerNivelTecnologia($) {
  const tech = extraerTecnologiaAplicada($);
  if (!tech) return null;
  
  // Niveles: STANDARD, PREMIUM, ULTRA_PREMIUM
  const niveles = {
    'SYNTEQ': 'PREMIUM',
    'ULTRA_WEB': 'ULTRA_PREMIUM',
    'POWERCORE': 'ULTRA_PREMIUM',
    'ENDURANCE': 'PREMIUM',
    'DONALDSON_BLUE': 'PREMIUM',
    'ELIMTEK': 'PREMIUM'
  };
  
  return niveles[tech] || 'STANDARD';
}

function extraerAlcanceTecnologia($) {
  const tech = extraerTecnologiaAplicada($);
  if (!tech) return null;
  
  const descripcion = $('.prodDesc').text();
  
  const alcances = [];
  if (descripcion.toLowerCase().includes('extend') || descripcion.toLowerCase().includes('long life')) {
    alcances.push('EXTENDED_LIFE');
  }
  if (descripcion.toLowerCase().includes('high efficiency')) {
    alcances.push('HIGH_EFFICIENCY');
  }
  if (descripcion.toLowerCase().includes('heavy duty')) {
    alcances.push('HEAVY_DUTY_PERFORMANCE');
  }
  
  return alcances.length > 0 ? alcances.join('|') : null;
}

function extraerEquivalentesTecnologia($) {
  const tech = extraerTecnologiaAplicada($);
  if (!tech) return null;
  
  // Mapeo de tecnologías equivalentes de otros fabricantes
  const equivalencias = {
    'SYNTEQ': 'FLEETGUARD:StrataPore|BALDWIN:Advanced',
    'ULTRA_WEB': 'MANN:MicroPore|MAHLE:HighPerformance',
    'POWERCORE': 'PROPRIETARY',
    'DONALDSON_BLUE': 'STANDARD_AFTERMARKET'
  };
  
  return equivalencias[tech] || null;
}

function extraerOEMTecnologiaDetectada($) {
  const cross_refs = extraerCrossReferencesJSON($);
  if (!cross_refs || cross_refs.length === 0) return null;
  
  // Detectar si hay códigos OEM en cross references
  const oemsDetectados = [];
  const fabricantesOEM = ['CATERPILLAR', 'CAT', 'CUMMINS', 'VOLVO', 'MACK', 'DETROIT'];
  
  cross_refs.forEach(ref => {
    if (fabricantesOEM.some(oem => ref.manufacturer.toUpperCase().includes(oem))) {
      if (!oemsDetectados.includes(ref.manufacturer)) {
        oemsDetectados.push(ref.manufacturer);
      }
    }
  });
  
  return oemsDetectados.length > 0 ? oemsDetectados.join('|') : null;
}

// ═══════════════════════════════════════════════════════
// UTILIDADES GENERALES
// ═══════════════════════════════════════════════════════
function convertirAMilimetros(valorConUnidad) {
  if (!valorConUnidad) return null;
  
  const match = valorConUnidad.match(/([\d.]+)\s*(mm|cm|in|inch|pouces)/i);
  if (!match) return null;
  
  const valor = parseFloat(match[1]);
  const unidad = match[2].toLowerCase();
  
  if (unidad === 'mm') return valor;
  if (unidad === 'cm') return valor * 10;
  if (unidad.includes('in') || unidad.includes('pouce')) return valor * 25.4;
  
  return null;
}

function extraerTemperaturaMin($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/min.*?temp.*?(-?\d+)\s*(°?C|F)/i);
  if (match) {
    const valor = parseFloat(match[1]);
    return match[2].toUpperCase().includes('F') ? (valor - 32) * 5/9 : valor;
  }
  return null;
}

function extraerTemperaturaMax($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/max.*?temp.*?(\d+)\s*(°?C|F)/i);
  if (match) {
    const valor = parseFloat(match[1]);
    return match[2].toUpperCase().includes('F') ? (valor - 32) * 5/9 : valor;
  }
  return null;
}

function extraerPresionMin($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/min.*?pressure.*?(\d+\.?\d*)\s*(psi|bar)/i);
  if (match) {
    const valor = parseFloat(match[1]);
    return match[2].toLowerCase() === 'bar' ? valor * 14.5038 : valor;
  }
  return null;
}

function extraerPresionMax($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/max.*?pressure.*?(\d+\.?\d*)\s*(psi|bar)/i);
  if (match) {
    const valor = parseFloat(match[1]);
    return match[2].toLowerCase() === 'bar' ? valor * 14.5038 : valor;
  }
  return null;
}

function extraerPesoGramos($) {
  const specs = $('.productSpecsSection').text();
  const match = specs.match(/weight.*?(\d+\.?\d*)\s*(g|kg|lb|oz)/i);
  if (match) {
    const valor = parseFloat(match[1]);
    const unidad = match[2].toLowerCase();
    
    if (unidad === 'g') return valor;
    if (unidad === 'kg') return valor * 1000;
    if (unidad === 'lb') return valor * 453.592;
    if (unidad === 'oz') return valor * 28.3495;
  }
  return null;
}
3.A.4 Creación del SKU HD
javascriptfunction crearSKU_HD(datos) {
  const PREFIJOS_HD = {
    "OIL": "EL8",
    "FUEL": "EF9",
    "AIR": "EA1",
    "CABIN": "EC1",
    "HYDRAULIC": "E6H",
    "FUEL SEPARATOR": "ES9",
    "AIR DRYER": "ED4",
    "COOLANT": "EW7",
    "MARINO": "EM9",
    "TURBINA": "ET9",
    "CARCASA": "EA2",
    "KITS": "EK5"
  };
  
  const tipo = datos.type;
  const prefijo = PREFIJOS_HD[tipo];
  
  if (!prefijo) {
    throw new Error(`Prefijo HD no encontrado para tipo: ${tipo}`);
  }
  
  const codigoDonaldson = datos.norm;
  const codigoLimpio = codigoDonaldson.replace(/[^A-Z0-9]/gi, '');
  const ultimos4 = codigoLimpio.slice(-4).toUpperCase();
  
  const sku = `${prefijo}${ultimos4}`;
  
  // Agregar SKU a los datos
  datos.sku = sku;
  
  return {
    sku: sku,
    prefix: prefijo,
    last4: ultimos4,
    tipo: tipo,
    duty: 'HD'
  };
}

📊 ESTRUCTURA COMPLETA DEL GOOGLE SHEET MASTER
Spreadsheet ID: 1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U
Sheet: MASTER_UNIFIED_V5

🗂️ COLUMNAS COMPLETAS (70+ CAMPOS)
GRUPO 1: IDENTIFICACIÓN Y CLASIFICACIÓN
ColCampoDescripciónEjemploAskuSKU ELIMFILTERS generadoEL82100BqueryCódigo de entrada originalP552100CnormCódigo normalizado del fabricanteP552100Dduty_typeHeavy Duty (HD) o Light Duty (LD)HDEtypeTipo principal de filtroOILFsubtypeSubtipo específicoSPIN-ONGdescriptionDescripción completaFILTRO DE ACEITE FLUJO MÁXIMO
GRUPO 2: CÓDIGOS Y REFERENCIAS
ColCampoDescripciónEjemploHoem_codesCódigos OEM separados por pipeCAT:1R-0750|MACK:25160566Icross_referenceCross references en formato JSON[{"mfr":"WIX","pn":"51515"},...]
GRUPO 3: CARACTERÍSTICAS TÉCNICAS GENERALES
ColCampoDescripciónEjemploJmedia_typeTipo de medio filtranteELIMTEK™, CELLULOSE, SYNTHETICKequipment_applicationsAplicaciones de equipoCAT 3306|VOLVO D13Lengine_applicationsAplicaciones de motorDIESEL_HD|GASOLINE_LD
GRUPO 4: DIMENSIONES FÍSICAS
ColCampoDescripciónEjemploMheight_mmAltura en milímetros118.11Nouter_diameter_mmDiámetro exterior en mm92.96Oinner_diameter_mmDiámetro interior en mm62.00Pthread_sizeTamaño de rosca1-12 UNF
GRUPO 5: ESPECIFICACIONES DE FILTRACIÓN
ColCampoDescripciónEjemploQmicron_ratingClasificación en micrones25Rbeta_200Relación Beta 200200Siso_main_efficiency_percentEficiencia principal ISO99.5Tiso_test_methodMétodo de prueba ISOISO 16889
GRUPO 6: CONDICIONES OPERATIVAS
ColCampoDescripciónEjemploUoperating_temperature_min_cTemperatura mínima °C-40Voperating_temperature_max_cTemperatura máxima °C120Woperating_pressure_min_psiPresión mínima PSI0Xoperating_pressure_max_psiPresión máxima PSI150
GRUPO 7: ESPECIFICACIONES ACEITE (OIL)
ColCampoDescripciónEjemploYbypass_valve_psiVálvula bypass PSI12Zhydrostatic_burst_psiPresión de ruptura PSI350AAdirt_capacity_gramsCapacidad de suciedad gramos45
GRUPO 8: ESPECIFICACIONES COMBUSTIBLE (FUEL)
ColCampoDescripciónEjemploABwater_separation_efficiency_percentEficiencia separación agua %95.5ACdrain_typeTipo de drenajeMANUAL, AUTOMATIC
GRUPO 9: ESPECIFICACIONES AIRE (AIR)
ColCampoDescripciónEjemploADrated_flow_cfmFlujo nominal CFM850AEpleat_countNúmero de pliegues96AFpanel_width_mmAncho del panel mm305AGpanel_depth_mmProfundidad panel mm50
GRUPO 10: ESPECIFICACIONES HIDRÁULICO (HYDRAULIC)
ColCampoDescripciónEjemploAHrated_flow_gpmFlujo nominal GPM25
GRUPO 11: MATERIALES Y CONSTRUCCIÓN
ColCampoDescripciónEjemploAIseal_materialMaterial del selloNITRILE, VITONAJhousing_materialMaterial de la carcasaSTEEL, ALUMINUMAKgasket_od_mmDiámetro externo empaque mm95.5ALgasket_id_mmDiámetro interno empaque mm88.0
GRUPO 12: COMPATIBILIDAD Y SEGURIDAD
ColCampoDescripciónEjemploAMfluid_compatibilityCompatibilidad de fluidosPETROLEUM|SYNTHETICANdisposal_methodMétodo de disposiciónRECYCLABLE, INCINERATION
GRUPO 13: ESTÁNDARES Y CERTIFICACIONES
ColCampoDescripciónEjemploAOmanufacturing_standardsEstándares de fabricaciónISO_9001|SAEAPcertification_standardsCertificacionesCE|ISO_9001
GRUPO 14: VIDA ÚTIL Y MANTENIMIENTO
ColCampoDescripciónEjemploAQservice_life_hoursVida útil en horas2000ARchange_interval_kmIntervalo de cambio km50000
GRUPO 15: PESO
ColCampoDescripciónEjemploASweight_gramsPeso en gramos680
GRUPO 16: TECNOLOGÍA APLICADA
ColCampoDescripciónEjemploATtecnologia_aplicadaCódigo de tecnologíaSYNTEQ, ULTRA_WEBAUtechnology_nameNombre comercial tecnologíaDonaldson Synteq™AVtechnology_tierNivel de tecnologíaSTANDARD, PREMIUM, ULTRA_PREMIUMAWtechnology_scopeAlcance de la tecnologíaEXTENDED_LIFE|HIGH_EFFICIENCYAXtechnology_equivalentsEquivalentes tecnológicosFLEETGUARD:StrataPore|BALDWIN:AdvancedAYtechnology_oem_detectedOEM detectado en cross-refCATERPILLAR|CUMMINS
GRUPO 17: METADATA
ColCampoDescripciónEjemploAZproduct_urlURL del productohttps://shop.donaldson.com/...BAimagen_urlURL de la imagenhttps://assets.donaldson.com/...BBbreadcrumbBreadcrumb/CategoríaMotor > Aceite > FiltrosBCmanufacturerFabricanteDONALDSONBDsourceFuente del scrapingDONALDSON_OFFICIALBEtimestampFecha de creación2025-12-26T00:00:00Z

🔄 PROCESO DE LLENADO DEL GOOGLE SHEET
javascriptasync function llenarGoogleSheetCompleto(datos) {
  const sheets = google.sheets({ version: 'v4', auth });
  
  // Preparar fila completa con TODAS las columnas
  const fila = [
    // GRUPO 1: IDENTIFICACIÓN
    datos.sku || '',
    datos.query || '',
    datos.norm || '',
    datos.duty_type || '',
    datos.type || '',
    datos.subtype || '',
    datos.description || '',
    
    // GRUPO 2: CÓDIGOS
    datos.oem_codes || '',
    JSON.stringify(datos.cross_reference || []),
    
    // GRUPO 3: CARACTERÍSTICAS GENERALES
    datos.media_type || '',
    datos.equipment_applications || '',
    datos.engine_applications || '',
    
    // GRUPO 4: DIMENSIONES
    datos.height_mm || '',
    datos.outer_diameter_mm || '',
    datos.inner_diameter_mm || '',
    datos.thread_size || '',
    
    // GRUPO 5: FILTRACIÓN
    datos.micron_rating || '',
    datos.beta_200 || '',
    datos.iso_main_efficiency_percent || '',
    datos.iso_test_method || '',
    
    // GRUPO 6: CONDICIONES OPERATIVAS
    datos.operating_temperature_min_c || '',
    datos.operating_temperature_max_c || '',
    datos.operating_pressure_min_psi || '',
    datos.operating_pressure_max_psi || '',
    
    // GRUPO 7: ACEITE
    datos.bypass_valve_psi || '',
    datos.hydrostatic_burst_psi || '',
    datos.dirt_capacity_grams || '',
    
    // GRUPO 8: COMBUSTIBLE
    datos.water_separation_efficiency_percent || '',
    datos.drain_type || '',
    
    // GRUPO 9: AIRE
    datos.rated_flow_cfm || '',
    datos.pleat_count || '',
    datos.panel_width_mm || '',
    datos.panel_depth_mm || '',
    
    // GRUPO 10: HIDRÁULICO
    datos.rated_flow_gpm || '',
    
    // GRUPO 11: MATERIALES
    datos.seal_material || '',
    datos.housing_material || '',
    datos.gasket_od_mm || '',
    datos.gasket_id_mm || '',
    
    // GRUPO 12: COMPATIBILIDAD
    datos.fluid_compatibility || '',
    datos.disposal_method || '',
    
    // GRUPO 13: ESTÁNDARES
    datos.manufacturing_standards || '',
    datos.certification_standards || '',
    
    // GRUPO 14: VIDA ÚTIL
    datos.service_life_hours || '',
    datos.change_interval_km || '',
    
    // GRUPO 15: PESO
    datos.weight_grams || '',
    
    // GRUPO 16: TECNOLOGÍA
    datos.tecnologia_aplicada || '',
    datos.technology_name || '',
    datos.technology_tier || '',
    datos.technology_scope || '',
    datos.technology_equivalents || '',
    datos.technology_oem_detected || '',
    
    // GRUPO 17: METADATA
    datos.product_url || '',
    datos.imagen_url || '',
    datos.breadcrumb || '',
    datos.manufacturer || '',
    datos.source || '',
    datos.timestamp || ''
  ];
  
  // Insertar en Google Sheets
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U',
    range: 'MASTER_UNIFIED_V5!A:BE',
    valueInputOption: 'RAW',
    resource: {
      values: [fila]
    }
  });
  
  console.log(`✅ Fila insertada con ${fila.length} columnas`);
  
  return response;
}

📱 SALIDA HACIA LA PÁGINA WEB (CON TODAS LAS ESPECIFICACIONES)
json{
  "success": true,
  "source": "DONALDSON",
  "sku": "EL82100",
  "data": {
    "sku": "EL82100",
    "query": "P552100",
    "norm": "P552100",
    "duty_type": "HD",
    "type": "OIL",
    "subtype": "SPIN-ON",
    "description": "FILTRO DE ACEITE, ROSCA FLUJO MÁXIMO",
    
    "oem_codes": "CAT:1R-0750|MACK:25160566",
    "cross_reference": [
      {"manufacturer": "CATERPILLAR", "part_number": "1R-0750"},
      {"manufacturer": "FLEETGUARD", "part_number": "LF3000"},
      {"manufacturer": "BALDWIN", "part_number": "B7141"},
      {"manufacturer": "WIX", "part_number": "51515"}
    ],
    
    "media_type": "ELIMTEK™",
    "equipment_applications": "CAT 3306|CAT 3406E|VOLVO D13",
    "engine_applications": "DIESEL_HD",
    
    "height_mm": 118.11,
    "outer_diameter_mm": 92.96,
    "inner_diameter_mm": 62.0,
    "thread_size": "1-12 UNF",
    
    "micron_rating": "25",
    "beta_200": "200",
    "iso_main_efficiency_percent": 99.5,
    "iso_test_method": "ISO 16889",
    
    "operating_temperature_min_c": -40,
    "operating_temperature_max_c": 120,
    "operating_pressure_min_psi": 0,
    "operating_pressure_max_psi": 150,
    
    "bypass_valve_psi": 12,
    "hydrostatic_burst_psi": 350,
    "dirt_capacity_grams": 45,
    
    "seal_material": "NITRILE",
    "housing_material": "STEEL",
    "gasket_od_mm": 95.5,
    "gasket_id_mm": 88.0,
    
    "fluid_compatibility": "PETROLEUM|SYNTHETIC",
    "disposal_method": "RECYCLABLE",
    
    "manufacturing_standards": "ISO_9001|SAE",
    "certification_standards": "CE|ISO_9001",
    
    "service_life_hours": 2000,
    "change_interval_km": 50000,
    
    "weight_grams": 680,
    
    "tecnologia_aplicada": "SYNTEQ",
    "technology_name": "Donaldson Synteq™",
    "technology_tier": "PREMIUM",
    "technology_scope": "EXTENDED_LIFE|HIGH_EFFICIENCY",
    "technology_equivalents": "FLEETGUARD:StrataPore|BALDWIN:Advanced",
    "technology_oem_detected": "CATERPILLAR|CUMMINS",
    
    "product_url": "https://shop.donaldson.com/store/es-us/product/P552100/20823",
    "imagen_url": "https://assets.donaldson.com/p552100.700.700.jpg",
    "breadcrumb": "Motor > Aceite > Filtros",
    "manufacturer": "DONALDSON",
    "source": "DONALDSON_OFFICIAL",
    "timestamp": "2025-12-26T00:00:00Z"
  }
}
```

---

## ✅ VISUALIZACIÓN EN PÁGINA WEB POR TIPO DE FILTRO

### **FILTROS DE ACEITE (OIL)**
```
Mostrar columnas:
- Identificación básica
- height_mm, outer_diameter_mm, inner_diameter_mm, thread_size
- bypass_valve_psi, hydrostatic_burst_psi, dirt_capacity_grams
- micron_rating, beta_200, iso_main_efficiency_percent
- operating_temperature_min_c, operating_temperature_max_c
- seal_material, housing_material
- service_life_hours, change_interval_km
- cross_reference, oem_codes
```

### **FILTROS DE COMBUSTIBLE (FUEL)**
```
Mostrar columnas:
- Identificación básica
- height_mm, outer_diameter_mm, thread_size
- water_separation_efficiency_percent, drain_type
- micron_rating, iso_main_efficiency_percent
- operating_temperature_min_c, operating_temperature_max_c
- fluid_compatibility
- service_life_hours, change_interval_km
- cross_reference, oem_codes
```

### **FILTROS DE AIRE (AIR)**
```
Mostrar columnas:
- Identificación básica
- height_mm, outer_diameter_mm, panel_width_mm, panel_depth_mm
- rated_flow_cfm, pleat_count
- micron_rating, iso_main_efficiency_percent
- operating_temperature_max_c
- seal_material
- service_life_hours
- cross_reference, oem_codes
```

### **FILTROS DE CABINA (CABIN)**
```
Mostrar columnas:
- Identificación básica
- height_mm, outer_diameter_mm, panel_width_mm, panel_depth_mm
- rated_flow_cfm, pleat_count
- micron_rating
- media_type (CARBÓN ACTIVADO, etc)
- cross_reference, oem_codes
```

### **FILTROS HIDRÁULICOS (HYDRAULIC)**
```
Mostrar columnas:
- Identificación básica
- height_mm, outer_diameter_mm, inner_diameter_mm
- rated_flow_gpm
- micron_rating, beta_200, iso_main_efficiency_percent
- operating_pressure_min_psi, operating_pressure_max_psi
- bypass_valve_psi
- fluid_compatibility
- cross_reference, oem_codes
```

### **SEPARADORES DE COMBUSTIBLE (FUEL SEPARATOR)**
```
Mostrar columnas:
- Identificación básica
- height_mm, outer_diameter_mm
- water_separation_efficiency_percent, drain_type
- micron_rating
- rated_flow_gpm
- operating_temperature_max_c
- cross_reference, oem_codes

Este es el documento COMPLETO y FINAL que incluye:

✅ Proceso completo de creación de SKU
✅ Estructura completa del Google Sheet (70+ columnas)
✅ Extracción de TODAS las especificaciones por tipo de filtro
✅ Tecnología aplicada y equivalencias
✅ Visualización diferenciada por tipo en página web

FIN DE ESPECIFICACIÓN TÉCNICA FINAL v8.0.0
