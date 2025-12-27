// ============================================================================
// SKU VALIDATION MIDDLEWARE v7.0.0 - FINAL
// Validación estricta según Tabla de Decisión ELIMFILTERS
// ============================================================================

// ============================================================================
// TABLA DE DECISIÓN v7.0.0 - OFICIAL ELIMFILTERS
// ============================================================================
const SKU_DECISION_TABLE = {
  // ACEITE (OIL) - HD/LD usan mismo prefijo
  'OIL|HD': 'EL8',
  'OIL|LD': 'EL8',
  
  // COMBUSTIBLE (FUEL) - HD/LD usan mismo prefijo
  'FUEL|HD': 'EF9',
  'FUEL|LD': 'EF9',
  
  // AIRE (AIR) - HD/LD usan mismo prefijo
  'AIR|HD': 'EA1',
  'AIR|LD': 'EA1',
  
  // SEPARADOR FUEL/WATER (SEPARATOR) - Solo HD
  'SEPARATOR|HD': 'ES9',
  
  // HIDRÁULICO (HYDRAULIC) - Solo HD
  'HYDRAULIC|HD': 'EH6',
  
  // SECADOR DE AIRE (AIR_DRYER) - Solo HD
  'AIR_DRYER|HD': 'ED4',
  
  // CABINA (CABIN) - HD/LD usan mismo prefijo
  'CABIN|HD': 'EC1',
  'CABIN|LD': 'EC1',
  
  // REFRIGERANTE (COOLANT) - Solo HD
  'COOLANT|HD': 'EW7',
  
  // MARINOS (MARINE) - HD/LD usan mismo prefijo
  'MARINE|HD': 'EM9',
  'MARINE|LD': 'EM9',
  
  // TURBINAS RACOR/PARKER (TURBINE) - Solo HD
  'TURBINE|HD': 'ET9',
  
  // CARCASAS PARA FILTROS DE AIRE (AIR_HOUSING) - Solo HD
  'AIR_HOUSING|HD': 'EA2',
  
  // KITS PARA MOTORES (KIT)
  'KIT|HD': 'EK5',  // Kits Heavy Duty
  'KIT|LD': 'EK3'   // Kits Light Duty
};

// Mapa inverso: Prefijo → Tipos permitidos
const PREFIX_TO_TYPES = {
  'EL8': ['OIL'],        // Oil HD/LD
  'EF9': ['FUEL'],       // Fuel HD/LD
  'EA1': ['AIR'],        // Air HD/LD
  'EA2': ['AIR_HOUSING'], // Air Housing (solo HD)
  'ES9': ['SEPARATOR'],  // Fuel/Water Separator (solo HD)
  'EH6': ['HYDRAULIC'],  // Hydraulic (solo HD)
  'ED4': ['AIR_DRYER'],  // Air Dryer (solo HD)
  'EC1': ['CABIN'],      // Cabin Air HD/LD
  'EW7': ['COOLANT'],    // Coolant (solo HD)
  'EM9': ['MARINE'],     // Marine HD/LD
  'ET9': ['TURBINE'],    // Turbine Racor/Parker (solo HD)
  'EK5': ['KIT'],        // Kits para motores HD
  'EK3': ['KIT']         // Kits para motores LD
};

// Restricciones de Duty por categoría
const DUTY_RESTRICTIONS = {
  'SEPARATOR': ['HD'],      // Solo Heavy Duty
  'HYDRAULIC': ['HD'],      // Solo Heavy Duty
  'AIR_DRYER': ['HD'],      // Solo Heavy Duty
  'COOLANT': ['HD'],        // Solo Heavy Duty
  'TURBINE': ['HD'],        // Solo Heavy Duty
  'AIR_HOUSING': ['HD'],    // Solo Heavy Duty
  'OIL': ['HD', 'LD'],      // Ambos
  'FUEL': ['HD', 'LD'],     // Ambos
  'AIR': ['HD', 'LD'],      // Ambos
  'CABIN': ['HD', 'LD'],    // Ambos
  'MARINE': ['HD', 'LD'],   // Ambos
  'KIT': ['HD', 'LD']       // Ambos
};

/**
 * Validar coherencia entre SKU y F_type
 * @param {string} sku - SKU ELIMFILTERS (ej: "EL82100")
 * @param {string} type - Categoría técnica (ej: "OIL")
 * @param {string} duty - HD o LD
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateSKUCoherence(sku, type, duty) {
  // Validar formato SKU
  if (!sku || sku.length < 5) {
    return {
      valid: false,
      error: 'SKU inválido: debe tener al menos 5 caracteres (prefijo 3 + sufijo 2+)'
    };
  }
  
  const prefix = sku.substring(0, 3).toUpperCase();
  const suffix = sku.substring(3);
  
  // Validar que el prefijo existe
  if (!PREFIX_TO_TYPES[prefix]) {
    return {
      valid: false,
      error: `Prefijo SKU desconocido: ${prefix}. Prefijos válidos: ${Object.keys(PREFIX_TO_TYPES).join(', ')}`
    };
  }
  
  // Validar que el tipo corresponde al prefijo
  const allowedTypes = PREFIX_TO_TYPES[prefix];
  if (!allowedTypes.includes(type)) {
    return {
      valid: false,
      error: `ABORT: Prefijo ${prefix} no corresponde a tipo ${type}. El prefijo ${prefix} solo acepta: ${allowedTypes.join(', ')}`
    };
  }
  
  // Validar que el duty es correcto
  if (!['HD', 'LD'].includes(duty)) {
    return {
      valid: false,
      error: `Duty inválido: ${duty}. Debe ser HD o LD`
    };
  }
  
  // Validar restricciones de duty por categoría
  const allowedDuties = DUTY_RESTRICTIONS[type];
  if (allowedDuties && !allowedDuties.includes(duty)) {
    return {
      valid: false,
      error: `ABORT: Tipo ${type} solo permite duty: ${allowedDuties.join(', ')}. No se acepta ${duty}`
    };
  }
  
  // Validar contra tabla de decisión
  const key = `${type}|${duty}`;
  const expectedPrefix = SKU_DECISION_TABLE[key];
  
  if (!expectedPrefix) {
    return {
      valid: false,
      error: `Combinación no soportada: ${type}|${duty}. Verifica la tabla de decisión v7.0.0`
    };
  }
  
  if (prefix !== expectedPrefix) {
    return {
      valid: false,
      error: `ABORT: SKU prefix ${prefix} no coincide con esperado ${expectedPrefix} para ${type}|${duty}`
    };
  }
  
  // Validar que el sufijo son números
  if (!/^\d+$/.test(suffix)) {
    return {
      valid: false,
      error: `Sufijo SKU inválido: ${suffix}. Debe contener solo dígitos`
    };
  }
  
  return {
    valid: true,
    error: null
  };
}

/**
 * Obtener prefijo correcto según tipo y duty
 * @param {string} type - Categoría técnica
 * @param {string} duty - HD o LD
 * @returns {string|null} - Prefijo o null si no existe
 */
function getExpectedPrefix(type, duty) {
  const key = `${type}|${duty}`;
  return SKU_DECISION_TABLE[key] || null;
}

/**
 * Middleware Express para validar SKU antes de guardar
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function validateSKUMiddleware(req, res, next) {
  const { sku, type, duty_type } = req.body;
  
  if (!sku || !type || !duty_type) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Faltan campos requeridos: sku, type, duty_type'
    });
  }
  
  const validation = validateSKUCoherence(sku, type, duty_type);
  
  if (!validation.valid) {
    console.error(`[VALIDATION] ❌ ${validation.error}`);
    return res.status(400).json({
      success: false,
      error: 'SKU_VALIDATION_FAILED',
      message: validation.error,
      sku: sku,
      type: type,
      duty: duty_type
    });
  }
  
  console.log(`[VALIDATION] ✅ SKU válido: ${sku} (${type}|${duty_type})`);
  next();
}

/**
 * Validar datos completos de filtro antes de persistir
 * @param {Object} filterData - Datos del filtro
 * @returns {Object} { valid: boolean, errors: Array }
 */
function validateFilterData(filterData) {
  const errors = [];
  
  // Campos requeridos
  const required = ['sku', 'type', 'duty_type', 'norm', 'description'];
  for (const field of required) {
    if (!filterData[field]) {
      errors.push(`Campo requerido faltante: ${field}`);
    }
  }
  
  // Validar SKU coherence
  if (filterData.sku && filterData.type && filterData.duty_type) {
    const validation = validateSKUCoherence(
      filterData.sku,
      filterData.type,
      filterData.duty_type
    );
    
    if (!validation.valid) {
      errors.push(validation.error);
    }
  }
  
  // Validar manufacturer
  const validManufacturers = ['DONALDSON', 'FRAM', 'FLEETGUARD', 'RACOR', 'PARKER'];
  if (filterData.manufacturer && !validManufacturers.includes(filterData.manufacturer)) {
    errors.push(`Manufacturer inválido: ${filterData.manufacturer}`);
  }
  
  // Validar source
  const validSources = [
    'DONALDSON_STAGEHAND_AI',
    'FRAM_STAGEHAND_AI',
    'FLEETGUARD_STAGEHAND_AI',
    'RACOR_STAGEHAND_AI',
    'PARKER_STAGEHAND_AI'
  ];
  if (filterData.source && !validSources.includes(filterData.source)) {
    errors.push(`Source inválido: ${filterData.source}`);
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Obtener información del prefijo SKU
 * @param {string} prefix - Prefijo de 3 caracteres (ej: "EL8")
 * @returns {Object|null} - Info del prefijo o null
 */
function getPrefixInfo(prefix) {
  const info = {
    'EL8': { type: 'OIL', duty: 'HD/LD', name: 'Oil Filter' },
    'EF9': { type: 'FUEL', duty: 'HD/LD', name: 'Fuel Filter' },
    'EA1': { type: 'AIR', duty: 'HD/LD', name: 'Air Filter' },
    'EA2': { type: 'AIR_HOUSING', duty: 'HD', name: 'Air Filter Housing' },
    'ES9': { type: 'SEPARATOR', duty: 'HD', name: 'Fuel/Water Separator' },
    'EH6': { type: 'HYDRAULIC', duty: 'HD', name: 'Hydraulic Filter' },
    'ED4': { type: 'AIR_DRYER', duty: 'HD', name: 'Air Dryer' },
    'EC1': { type: 'CABIN', duty: 'HD/LD', name: 'Cabin Air Filter' },
    'EW7': { type: 'COOLANT', duty: 'HD', name: 'Coolant Filter' },
    'EM9': { type: 'MARINE', duty: 'HD/LD', name: 'Marine Filter' },
    'ET9': { type: 'TURBINE', duty: 'HD', name: 'Turbine Racor/Parker' },
    'EK5': { type: 'KIT', duty: 'HD', name: 'Kit para Motores Heavy Duty' },
    'EK3': { type: 'KIT', duty: 'LD', name: 'Kit para Motores Light Duty' }
  };
  
  return info[prefix] || null;
}

/**
 * Validar si una categoría soporta un duty específico
 * @param {string} type - Categoría técnica
 * @param {string} duty - HD o LD
 * @returns {boolean}
 */
function isDutySupported(type, duty) {
  const allowed = DUTY_RESTRICTIONS[type];
  if (!allowed) return false;
  return allowed.includes(duty);
}

module.exports = {
  validateSKUCoherence,
  getExpectedPrefix,
  validateSKUMiddleware,
  validateFilterData,
  getPrefixInfo,
  isDutySupported,
  SKU_DECISION_TABLE,
  PREFIX_TO_TYPES,
  DUTY_RESTRICTIONS
};
