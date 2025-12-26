// ============================================================================
// DETERMINE DUTY - Lógica para clasificar HD vs LD
// ============================================================================

/**
 * Determina si un filtro es Heavy Duty (HD) o Light Duty (LD)
 * basado en aplicaciones de motor, equipos y descripción
 * 
 * @param {string} engineApps - Aplicaciones de motor
 * @param {string} equipmentApps - Aplicaciones de equipo
 * @param {string} description - Descripción del producto
 * @returns {string} - 'HD' o 'LD'
 */
function determineDuty(engineApps = '', equipmentApps = '', description = '') {
  const text = [engineApps, equipmentApps, description].join(' ').toLowerCase();
  
  // ========================================================================
  // INDICADORES HEAVY DUTY (HD)
  // ========================================================================
  
  const hdKeywords = [
    // Motores
    'diesel', 'turbo diesel', 'compression ignition',
    
    // Equipos pesados
    'excavator', 'excavadora', 'bulldozer',
    'loader', 'cargador', 'grader', 'niveladora',
    'crane', 'grua', 'forklift', 'montacargas',
    'tractor', 'backhoe', 'retroexcavadora',
    
    // Camiones comerciales
    'heavy truck', 'camion pesado', 'semi-truck',
    'commercial truck', 'mack', 'peterbilt', 'kenworth',
    'freightliner', 'volvo truck', 'international truck',
    
    // Industrial
    'generator', 'generador', 'compressor', 'compresor',
    'industrial engine', 'motor industrial',
    'stationary', 'estacionario',
    
    // Marino comercial
    'marine diesel', 'ship', 'barco comercial',
    
    // Agrícola pesado
    'combine', 'cosechadora', 'harvester',
    
    // Construcción
    'construction', 'construccion', 'mining', 'mineria'
  ];
  
  // ========================================================================
  // INDICADORES LIGHT DUTY (LD)
  // ========================================================================
  
  const ldKeywords = [
    // Motores
    'gasoline', 'gasolina', 'petrol', 'spark ignition',
    
    // Vehículos particulares
    'passenger car', 'auto', 'sedan', 'coupe',
    'hatchback', 'wagon', 'minivan',
    
    // SUVs/Pickups ligeras
    'suv', 'crossover', 'pickup ligera', 'light truck',
    
    // Marcas de consumo
    'toyota', 'honda', 'ford car', 'chevrolet car',
    'nissan', 'mazda', 'hyundai', 'kia',
    'volkswagen', 'bmw', 'mercedes car',
    
    // Motores pequeños
    'small engine', 'motor pequeno', 'lawn mower',
    'outboard', 'fuera de borda', 'motorcycle', 'motocicleta',
    
    // Residencial
    'residential', 'residencial', 'home', 'domestic'
  ];
  
  // ========================================================================
  // LÓGICA DE DECISIÓN
  // ========================================================================
  
  // Contar coincidencias
  let hdScore = 0;
  let ldScore = 0;
  
  for (const keyword of hdKeywords) {
    if (text.includes(keyword)) hdScore++;
  }
  
  for (const keyword of ldKeywords) {
    if (text.includes(keyword)) ldScore++;
  }
  
  // Prioridad especial: DIESEL casi siempre es HD
  if (text.includes('diesel') && !text.includes('light duty diesel')) {
    hdScore += 5;
  }
  
  // Prioridad especial: GASOLINE casi siempre es LD
  if (text.includes('gasoline') || text.includes('gasolina')) {
    ldScore += 5;
  }
  
  // Decisión final
  if (hdScore > ldScore) {
    console.log(`[DUTY] HD detectado (score: ${hdScore} vs ${ldScore})`);
    return 'HD';
  } else if (ldScore > hdScore) {
    console.log(`[DUTY] LD detectado (score: ${hdScore} vs ${ldScore})`);
    return 'LD';
  }
  
  // Default: si no hay suficiente info, asumir HD
  // (mayoría de filtros industriales son HD)
  console.log(`[DUTY] Sin datos suficientes, default HD`);
  return 'HD';
}

module.exports = { determineDuty };
