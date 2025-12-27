// ============================================================================
// DETERMINE DUTY v2.0 - Lógica mejorada para clasificar HD vs LD
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
    // Motores diesel
    'diesel', 'turbo diesel', 'compression ignition', 'turbodiesel',
    'common rail diesel', 'direct injection diesel',
    
    // Equipos de construcción
    'excavator', 'excavadora', 'bulldozer', 'dozer',
    'loader', 'cargador', 'wheel loader', 'front loader',
    'grader', 'niveladora', 'motor grader',
    'crane', 'grua', 'mobile crane',
    'forklift', 'montacargas',
    'backhoe', 'retroexcavadora',
    'skid steer', 'minicargador',
    'compactor', 'compactadora', 'roller',
    
    // Equipos agrícolas pesados
    'tractor', 'combine', 'cosechadora', 'harvester',
    'sprayer', 'fumigadora', 'planter', 'sembradora',
    'baler', 'empacadora', 'forage harvester',
    
    // Camiones comerciales pesados
    'heavy truck', 'camion pesado', 'semi-truck', 'semi truck',
    'commercial truck', 'delivery truck', 'dump truck',
    'mack', 'peterbilt', 'kenworth', 'freightliner',
    'volvo truck', 'international truck', 'western star',
    'class 7', 'class 8', 'clase 7', 'clase 8',
    
    // Equipos industriales
    'generator', 'generador', 'genset',
    'compressor', 'compresor', 'air compressor',
    'industrial engine', 'motor industrial',
    'stationary', 'estacionario', 'power unit',
    'pump', 'bomba industrial',
    
    // Marino comercial
    'marine diesel', 'motor marino diesel',
    'ship', 'barco comercial', 'vessel',
    'tugboat', 'remolcador', 'fishing boat',
    
    // Minería
    'mining', 'mineria', 'haul truck', 'dump truck',
    'drilling', 'perforadora',
    
    // Otros indicadores HD
    'construction', 'construccion', 'off-road', 'off road',
    'highway', 'carretera', 'over the road', 'otr'
  ];
  
  // ========================================================================
  // INDICADORES LIGHT DUTY (LD)
  // ========================================================================
  
  const ldKeywords = [
    // Motores gasolina
    'gasoline', 'gasolina', 'petrol', 'gas engine',
    'spark ignition', 'carburetor', 'carburador',
    'fuel injection gasoline', 'port injection', 'direct injection gas',
    
    // Vehículos particulares
    'passenger car', 'passenger vehicle', 'auto particular',
    'sedan', 'coupe', 'convertible', 'roadster',
    'hatchback', 'wagon', 'station wagon',
    'minivan', 'van familiar',
    'city car', 'subcompact', 'compact car',
    
    // SUVs y crossovers (uso personal/familiar)
    'suv', 'crossover', 'cuv', 'sport utility',
    'compact suv', 'mid-size suv', 'suv familiar',
    
    // Pickups ligeras (uso personal)
    'pickup ligera', 'light truck', 'compact pickup',
    'mid-size pickup', 'personal use truck',
    
    // Marcas de vehículos de consumo
    'toyota camry', 'toyota corolla', 'toyota rav4', 'toyota highlander',
    'honda civic', 'honda accord', 'honda cr-v', 'honda pilot',
    'ford focus', 'ford fusion', 'ford escape', 'ford explorer',
    'chevrolet malibu', 'chevrolet equinox', 'chevrolet traverse',
    'nissan altima', 'nissan sentra', 'nissan rogue', 'nissan murano',
    'mazda 3', 'mazda 6', 'mazda cx-5', 'mazda cx-9',
    'hyundai elantra', 'hyundai sonata', 'hyundai tucson', 'hyundai santa fe',
    'kia optima', 'kia forte', 'kia sportage', 'kia sorento',
    'volkswagen jetta', 'volkswagen passat', 'volkswagen tiguan',
    'subaru outback', 'subaru forester', 'subaru crosstrek',
    
    // Vehículos de lujo personal
    'bmw', 'mercedes-benz car', 'audi', 'lexus',
    'acura', 'infiniti', 'cadillac car', 'lincoln car',
    
    // Motores pequeños
    'small engine', 'motor pequeno', 'motor chico',
    'lawn mower', 'cortadora de cesped', 'cortacesped',
    'garden tractor', 'tractor de jardin',
    'chainsaw', 'motosierra', 'leaf blower',
    'pressure washer', 'lavadora de presion',
    'generator portable', 'generador portatil',
    
    // Motores marinos recreativos
    'outboard', 'fuera de borda', 'motor fuera borda',
    'outboard motor', 'recreational boat', 'lancha',
    'jet ski', 'moto acuatica', 'personal watercraft',
    'inboard gasoline', 'sterndrive',
    
    // Motocicletas y ATVs
    'motorcycle', 'motocicleta', 'moto',
    'atv', 'quad', 'cuatrimoto',
    'utv', 'side by side', 'rzr', 'utvs',
    'dirt bike', 'scooter',
    
    // Uso residencial/recreativo
    'residential', 'residencial', 'home use', 'uso domestico',
    'domestic', 'consumer', 'consumidor',
    'recreational', 'recreativo', 'personal use',
    
    // Vehículos eléctricos híbridos (típicamente LD)
    'hybrid', 'hibrido', 'plug-in hybrid', 'phev',
    
    // Indicadores de tamaño pequeño
    '4-cylinder', '4 cylinder', '4 cilindros',
    'v6', 'v-6', 'inline-4', 'inline-6',
    'small displacement', 'bajo cilindraje'
  ];
  
  // ========================================================================
  // LÓGICA DE DECISIÓN CON PONDERACIÓN
  // ========================================================================
  
  // Contar coincidencias
  let hdScore = 0;
  let ldScore = 0;
  
  const foundHdKeywords = [];
  const foundLdKeywords = [];
  
  for (const keyword of hdKeywords) {
    if (text.includes(keyword)) {
      hdScore++;
      foundHdKeywords.push(keyword);
    }
  }
  
  for (const keyword of ldKeywords) {
    if (text.includes(keyword)) {
      ldScore++;
      foundLdKeywords.push(keyword);
    }
  }
  
  // ========================================================================
  // REGLAS DE PRIORIDAD ALTA
  // ========================================================================
  
  // REGLA 1: DIESEL casi siempre es HD (peso +5)
  if (text.includes('diesel') && !text.includes('light duty diesel')) {
    hdScore += 5;
    console.log(`[DUTY DETECTION] DIESEL detectado → +5 HD`);
  }
  
  // REGLA 2: GASOLINE/GASOLINA casi siempre es LD (peso +5)
  if (text.includes('gasoline') || text.includes('gasolina') || text.includes('petrol')) {
    ldScore += 5;
    console.log(`[DUTY DETECTION] GASOLINE detectado → +5 LD`);
  }
  
  // REGLA 3: Marcas de camiones comerciales → HD (peso +3)
  const hdTruckBrands = ['mack', 'peterbilt', 'kenworth', 'freightliner', 'volvo truck', 'international truck'];
  for (const brand of hdTruckBrands) {
    if (text.includes(brand)) {
      hdScore += 3;
      console.log(`[DUTY DETECTION] Camión comercial HD detectado (${brand}) → +3 HD`);
      break;
    }
  }
  
  // REGLA 4: Equipos de construcción → HD (peso +3)
  const constructionEquipment = ['excavator', 'bulldozer', 'loader', 'grader', 'crane', 'backhoe'];
  for (const equip of constructionEquipment) {
    if (text.includes(equip)) {
      hdScore += 3;
      console.log(`[DUTY DETECTION] Equipo de construcción detectado (${equip}) → +3 HD`);
      break;
    }
  }
  
  // REGLA 5: Outboard / fuera de borda → LD (peso +3)
  if (text.includes('outboard') || text.includes('fuera de borda')) {
    ldScore += 3;
    console.log(`[DUTY DETECTION] Motor fuera de borda detectado → +3 LD`);
  }
  
  // REGLA 6: Passenger car / vehículo particular → LD (peso +3)
  if (text.includes('passenger') || text.includes('particular')) {
    ldScore += 3;
    console.log(`[DUTY DETECTION] Vehículo particular detectado → +3 LD`);
  }
  
  // REGLA 7: Small engine / motor pequeño → LD (peso +3)
  if (text.includes('small engine') || text.includes('lawn mower') || text.includes('motor pequeno')) {
    ldScore += 3;
    console.log(`[DUTY DETECTION] Motor pequeño detectado → +3 LD`);
  }
  
  // ========================================================================
  // DECISIÓN FINAL
  // ========================================================================
  
  console.log(`[DUTY DETECTION] Keywords encontrados:`);
  console.log(`[DUTY DETECTION] HD: ${foundHdKeywords.join(', ')}`);
  console.log(`[DUTY DETECTION] LD: ${foundLdKeywords.join(', ')}`);
  console.log(`[DUTY DETECTION] Scores → HD: ${hdScore}, LD: ${ldScore}`);
  
  if (hdScore > ldScore) {
    console.log(`[DUTY DETECTION] ✅ RESULTADO: HD`);
    return 'HD';
  } else if (ldScore > hdScore) {
    console.log(`[DUTY DETECTION] ✅ RESULTADO: LD`);
    return 'LD';
  }
  
  // Default: si no hay suficiente info, asumir HD
  // (mayoría de filtros industriales son HD)
  console.log(`[DUTY DETECTION] ⚠️ Sin datos suficientes → DEFAULT: HD`);
  return 'HD';
}

module.exports = { determineDuty };
