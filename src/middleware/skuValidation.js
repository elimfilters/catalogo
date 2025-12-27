// ============================================================================
// SKU VALIDATION MIDDLEWARE v7.0.0 - FINAL
// Validación estricta según Tabla de Decisión ELIMFILTERS
// ============================================================================

const SKU_DECISION_TABLE = {
  'OIL|HD': 'EL8',
  'OIL|LD': 'EL8',
  'FUEL|HD': 'EF9',
  'FUEL|LD': 'EF9',
  'AIR|HD': 'EA1',
  'AIR|LD': 'EA1',
  'SEPARATOR|HD': 'ES9',
  'HYDRAULIC|HD': 'EH6',
  'AIR_DRYER|HD': 'ED4',
  'CABIN|HD': 'EC1',
  'CABIN|LD': 'EC1',
  'COOLANT|HD': 'EW7',
  'MARINE|HD': 'EM9',
  'MARINE|LD': 'EM9',
  'TURBINE|HD': 'ET9',
  'AIR_HOUSING|HD': 'EA2',
  'KIT|HD': 'EK5',
  'KIT|LD': 'EK3'
};

const PREFIX_TO_TYPES = {
  'EL8': ['OIL'],
  'EF9': ['FUEL'],
  'EA1': ['AIR'],
  'EA2': ['AIR_HOUSING'],
  'ES9': ['SEPARATOR'],
  'EH6': ['HYDRAULIC'],
  'ED4': ['AIR_DRYER'],
  'EC1': ['CABIN'],
  'EW7': ['COOLANT'],
  'EM9': ['MARINE'],
  'ET9': ['TURBINE'],
  'EK5': ['KIT'],
  'EK3': ['KIT']
};

const DUTY_RESTRICTIONS = {
  'SEPARATOR': ['HD'],
  'HYDRAULIC': ['HD'],
  'AIR_DRYER': ['HD'],
  'COOLANT': ['HD'],
  'TURBINE': ['HD'],
  'AIR_HOUSING': ['HD'],
  'OIL': ['HD', 'LD'],
  'FUEL': ['HD', 'LD'],
  'AIR': ['HD', 'LD'],
  'CABIN': ['HD', 'LD'],
  'MARINE': ['HD', 'LD'],
  'KIT': ['HD', 'LD']
};

function validateSKUCoherence(sku, type, duty) {
  if (!sku || sku.length < 5) {
    return {
      valid: false,
      error: 'SKU inválido: debe tener al menos 5 caracteres'
    };
  }
  
  const prefix = sku.substring(0, 3).toUpperCase();
  const suffix = sku.substring(3);
  
  if (!PREFIX_TO_TYPES[prefix]) {
    return {
      valid: false,
      error: `Prefijo SKU desconocido: ${prefix}`
    };
  }
  
  const allowedTypes = PREFIX_TO_TYPES[prefix];
  if (!allowedTypes.includes(type)) {
    return {
      valid: false,
      error: `ABORT: Prefijo ${prefix} no corresponde a tipo ${type}`
    };
  }
  
  if (!['HD', 'LD'].includes(duty)) {
    return {
      valid: false,
      error: `Duty inválido: ${duty}`
    };
  }
  
  const allowedDuties = DUTY_RESTRICTIONS[type];
  if (allowedDuties && !allowedDuties.includes(duty)) {
    return {
      valid: false,
      error: `ABORT: Tipo ${type} solo permite duty: ${allowedDuties.join(', ')}`
    };
  }
  
  const key = `${type}|${duty}`;
  const expectedPrefix = SKU_DECISION_TABLE[key];
  
  if (!expectedPrefix) {
    return {
      valid: false,
      error: `Combinación no soportada: ${type}|${duty}`
    };
  }
  
  if (prefix !== expectedPrefix) {
    return {
      valid: false,
      error: `ABORT: SKU prefix ${prefix} no coincide con esperado ${expectedPrefix}`
    };
  }
  
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

function getExpectedPrefix(type, duty) {
  const key = `${type}|${duty}`;
  return SKU_DECISION_TABLE[key] || null;
}

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
      message: validation.error
    });
  }
  
  console.log(`[VALIDATION] ✅ SKU válido: ${sku}`);
  next();
}

function validateFilterData(filterData) {
  const errors = [];
  
  const required = ['sku', 'type', 'duty_type', 'norm', 'description'];
  for (const field of required) {
    if (!filterData[field]) {
      errors.push(`Campo requerido faltante: ${field}`);
    }
  }
  
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
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

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
    'EK5': { type: 'KIT', duty: 'HD', name: 'Kit para Motores HD' },
    'EK3': { type: 'KIT', duty: 'LD', name: 'Kit para Motores LD' }
  };
  
  return info[prefix] || null;
}

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
