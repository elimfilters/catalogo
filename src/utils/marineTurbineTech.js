'use strict';

// MARINE & TURBINE technologies resolver for ELIMFILTERS
// Integrates AQUACORE™ Marine Series, TURBINE X-Series, HYDROFLOW™ TurboMax, AQUASENSE™

const TECH_DEF = {
  'AQUACORE™ Marine 1000 – Primary Coalescing Stage': {
    technology_name: 'AQUACORE™ Marine 1000 – Primary Coalescing Stage',
    technology_description: 'Medio coalescente de alta capacidad para captura de agua libre y emulsificada en primera etapa marina.',
    technology_equivalents: [
      'Racor/Parker: 500FG / 900FG / 1000FG (primaria)',
      'Fleetguard: FS19594 (primario MARINE)',
      'Donaldson: Kit primario MARINE Water Separator'
    ],
    technology_scope: 'Marine'
  },
  'AQUACORE™ Marine 2000 – Ultra-Separator Secondary Stage': {
    technology_name: 'AQUACORE™ Marine 2000 – Ultra-Separator Secondary Stage',
    technology_description: 'Etapa secundaria para HPCR, filtra agua disuelta y emulsiones finas; protege inyectores MARINEs modernos.',
    technology_equivalents: [
      'Racor/Parker: S3201 / S3209 (secundaria)',
      'Fleetguard: FH230 / FS36231',
      'Donaldson: Synteq DRY Marina'
    ],
    technology_scope: 'Marine'
  },
  'AQUACORE™ Marine 3000 – Cartridge Marine Series (Reemplazo Racor)': {
    technology_name: 'AQUACORE™ Marine 3000 – Cartridge Marine Series (Reemplazo Racor)',
    technology_description: 'Cartuchos equivalentes para cabezales Racor Serie Turbine; mejor restricción, capacidad y eficiencia coalescente.',
    technology_equivalents: [
      'Racor: S3206, S3227, S3213, S3214, S3216, S3230',
      'Baldwin: BF Series (MARINEs)',
      'Donaldson: MAR Series (coalescing cartridges)'
    ],
    technology_scope: 'Marine'
  },
  'AQUACORE™ Marine 4000 – High Flow Water Block + Coalescing': {
    technology_name: 'AQUACORE™ Marine 4000 – High Flow Water Block + Coalescing',
    technology_description: 'Sistema dual (coalescente + hidrofóbico) de alto flujo para aplicaciones marinas comerciales e industriales.',
    technology_equivalents: [
      'Racor/Parker: Turbine High Flow',
      'Fleetguard: FS1212 / FS36200',
      'Donaldson: High Flow Water Separator Series'
    ],
    technology_scope: 'Marine'
  },
  'TURBINE X500 – Assembly Replacement': {
    technology_name: 'TURBINE X500 – Assembly Replacement',
    technology_description: 'Cabezal y AIR HOUSING equivalentes a Racor 500FG con mejoras en UV y drenaje.',
    technology_equivalents: [
      'Racor/Parker: 500FG',
      'Donaldson: MAR500 Assembly',
      'Fleetguard: FS19594 Assembly'
    ],
    technology_scope: 'Turbine'
  },
  'TURBINE X900 – Assembly Replacement': {
    technology_name: 'TURBINE X900 – Assembly Replacement',
    technology_description: 'Sistema equivalente al 900FG con mayor flujo y medio AquaCore optimizado.',
    technology_equivalents: [
      'Racor/Parker: 900FG',
      'Donaldson: MAR900',
      'Fleetguard: FH234'
    ],
    technology_scope: 'Turbine'
  },
  'TURBINE X1000 – High-Capacity Assembly': {
    technology_name: 'TURBINE X1000 – High-Capacity Assembly',
    technology_description: 'Reemplazo completo del Racor 1000FG para embarcaciones mayores y generadores de alta demanda.',
    technology_equivalents: [
      'Racor/Parker: 1000FG',
      'Donaldson: MAR1000',
      'Fleetguard: FH256'
    ],
    technology_scope: 'Turbine'
  },
  'HYDROFLOW™ TurboMax – Industrial/Marine Turbine Filtration': {
    technology_name: 'HYDROFLOW™ TurboMax – Industrial/Marine Turbine Filtration',
    technology_description: 'MicroGlass β2000 con estructura antiestática y AIR HOUSING reforzada para vibración marina.',
    technology_equivalents: [
      'Racor/Parker: Sistema de TURBINE industrial',
      'Donaldson: High Efficiency Glass Turbine Filters',
      'Fleetguard: MicroGlass Industrial'
    ],
    technology_scope: 'Turbine'
  },
  'AQUASENSE™ – Sensor Inteligente de Agua': {
    technology_name: 'AQUASENSE™ – Sensor Inteligente de Agua',
    technology_description: 'Sensor para bowls transparentes, detecta nivel de agua y soporta mantenimiento predictivo.',
    technology_equivalents: [
      'Racor: Water-In-Fuel (WIF) Sensor',
      'Donaldson: WIF Kit',
      'Fleetguard: WIF Module'
    ],
    technology_scope: 'Marine'
  }
};

function sanitize(s) {
  return String(s || '').trim();
}

function resolveMarineTurbineTechnology({ name = '', family = '', duty = '', code = '' } = {}) {
  const t = sanitize(name).toUpperCase();
  const fam = sanitize(family).toUpperCase();
  const c = sanitize(code).toUpperCase();

  // Direct AQUACORE series detection by name
  if (/AQUACORE/.test(t)) {
    if (/1000/.test(t)) return { name: 'AQUACORE™ Marine 1000 – Primary Coalescing Stage', scope: 'Marine' };
    if (/2000/.test(t)) return { name: 'AQUACORE™ Marine 2000 – Ultra-Separator Secondary Stage', scope: 'Marine' };
    if (/3000/.test(t)) return { name: 'AQUACORE™ Marine 3000 – Cartridge Marine Series (Reemplazo Racor)', scope: 'Marine' };
    if (/4000/.test(t)) return { name: 'AQUACORE™ Marine 4000 – High Flow Water Block + Coalescing', scope: 'Marine' };
  }

  // TURBINE X-Series by name or OEM code
  if (/TURBINE\s*X\s*500|\bX500\b/.test(t) || /(500FG|MAR500)\b/.test(c)) {
    return { name: 'TURBINE X500 – Assembly Replacement', scope: 'Turbine' };
  }
  if (/TURBINE\s*X\s*900|\bX900\b/.test(t) || /(900FG|MAR900|FH234)\b/.test(c)) {
    return { name: 'TURBINE X900 – Assembly Replacement', scope: 'Turbine' };
  }
  if (/TURBINE\s*X\s*1000|\bX1000\b/.test(t) || /(1000FG|MAR1000|FH256)\b/.test(c)) {
    return { name: 'TURBINE X1000 – High-Capacity Assembly', scope: 'Turbine' };
  }

  // HYDROFLOW TurboMax indicators
  if (/HYDROFLOW|TURBOMAX|\bBETA\s*2000\b|MICROGLASS/.test(t) || /(MICROGLASS)/.test(c)) {
    return { name: 'HYDROFLOW™ TurboMax – Industrial/Marine Turbine Filtration', scope: 'Turbine' };
  }

  // AQUASENSE sensor indicators
  if (/AQUASENSE|WIF|WATER[- ]IN[- ]FUEL|SENSOR/.test(t) || /(WIF)/.test(c)) {
    return { name: 'AQUASENSE™ – Sensor Inteligente de Agua', scope: fam.includes('TURBINE') ? 'Turbine' : 'Marine' };
  }

  // OEM code hints for AQUACORE by series when name not explicit
  if (fam.includes('MARINE') || fam.includes('TURBINE')) {
    if (/(S3201|S3209|FH230|FS36231)/.test(c)) return { name: 'AQUACORE™ Marine 2000 – Ultra-Separator Secondary Stage', scope: 'Marine' };
    if (/(S3206|S3227|S3213|S3214|S3216|S3230)/.test(c)) return { name: 'AQUACORE™ Marine 3000 – Cartridge Marine Series (Reemplazo Racor)', scope: 'Marine' };
    if (/(FS19594)/.test(c)) return { name: 'AQUACORE™ Marine 1000 – Primary Coalescing Stage', scope: 'Marine' };
    if (/(FS1212|FS36200)/.test(c)) return { name: 'AQUACORE™ Marine 4000 – High Flow Water Block + Coalescing', scope: 'Marine' };
  }

  return null;
}

function getMarineTurbineTechInfo(name) {
  const key = Object.keys(TECH_DEF).find(k => k.toUpperCase() === String(name || '').trim().toUpperCase());
  return key ? TECH_DEF[key] : null;
}

module.exports = {
  TECH_DEF,
  resolveMarineTurbineTechnology,
  getMarineTurbineTechInfo
};
