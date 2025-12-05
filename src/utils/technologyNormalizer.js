'use strict';

const { getTechnology: getProductTechnology } = require('../utils/elimfiltersTechnologies');
const { resolveMarineTurbineTechnology, getMarineTurbineTechInfo } = require('./marineTurbineTech');

function mapTier(techName) {
  const t = String(techName || '').toUpperCase();
  if (/NANOMAX|AQUACORE|HYDROFLOW|AERODRY/.test(t)) return 'Premium';
  if (/MULTICORE|CARBON|THERMORELEASE/.test(t)) return 'Advanced';
  if (/BLEND|MACROCORE|PARTICULATE|STANDARD/.test(t)) return 'Standard';
  return '';
}

function buildScope(family, duty) {
  const fam = String(family || '').toUpperCase();
  const dy = String(duty || '').toUpperCase();
  const famPretty = (fam === 'AIR_DRYER' ? 'AIR DRYER' : fam).replace(/_/g, ' ');
  const dyPretty = dy === 'HD' || dy === 'LD' ? dy : '';
  return [dyPretty, famPretty].filter(Boolean).join(' ');
}

function normalizeTechnology(name, family, duty = '') {
  const fam = String(family || '').toUpperCase();
  const dy = String(duty || '').toUpperCase();
  const raw = String(name || '').trim();
  const t = raw.toUpperCase();

  let internal = '';
  const equivalents = [];
  let scopeOverride = '';

  // AIR (Donaldson/Fleetguard señales)
  if (fam.includes('AIR')) {
    if (/ULTRA[- ]?WEB|NANOFIBER|NANONET|SURFACE[- ]?LOADING|SYNTEQ/.test(t)) {
      internal = 'MACROCORE™ NanoMax';
      equivalents.push('ULTRA WEB','NANOFIBER','NANONET','SURFACE LOADING','SYNTEQ');
    } else if (/CELLULOSE|STANDARD|PAPER/.test(t)) {
      internal = 'MACROCORE™';
      equivalents.push('CELLULOSE','STANDARD','PAPER');
    }
  }

  // CABIN
  if (!internal && fam.includes('CABIN')) {
    if (/CARBON|ACTIVATED/.test(t)) {
      internal = 'MICROKAPPA™ Carbon';
      equivalents.push('CARBON','ACTIVATED');
    } else {
      internal = 'MICROKAPPA™ Particulate';
    }
  }

  // OIL (FRAM/Fleetguard señales)
  if (!internal && fam === 'OIL') {
    if (/ULTRA\s+SYNTHETIC|SYNTEQ|SYNTHETIC\s+LUBE/.test(t)) {
      internal = 'ELIMTEK™ MultiCore';
      equivalents.push('ULTRA SYNTHETIC','SYNTEQ','SYNTHETIC LUBE');
    } else if (/HIGH\s+MILEAGE/.test(t)) {
      internal = dy === 'HD' ? 'ELIMTEK™ MultiCore' : 'ELIMTEK™ Blend';
      equivalents.push('HIGH MILEAGE');
    } else if (/EXTRA\s+GUARD|CELLULOSE\s+LUBE/.test(t)) {
      internal = 'ELIMTEK™ Standard';
      equivalents.push('EXTRA GUARD','CELLULOSE LUBE');
    }
  }

  // FUEL
  if (!internal && fam === 'FUEL') {
    if (/WATER|SEPARATOR|COALESC/.test(t)) {
      internal = 'AquaCore Pro';
      equivalents.push('WATER SEPARATION','SEPARATOR','COALESCENT');
    } else if (/FUEL\s+FILTRATION|STANDARD\s+FUEL/.test(t)) {
      internal = dy === 'HD' ? 'ELIMTEK™ MultiCore' : 'ELIMTEK™ Blend';
      equivalents.push('FUEL FILTRATION','STANDARD FUEL');
    }
  }

  // HYDRAULIC
  if (!internal && (fam === 'HYDRAULIC' || fam === 'HIDRAULIC')) {
    if (/MICROGLASS|SYNTHETIC|HYDRAULIC/.test(t)) {
      internal = 'HydroFlow 5000';
      equivalents.push('MICROGLASS','SYNTHETIC','HYDRAULIC');
    }
  }

  // COOLANT
  if (!internal && fam === 'COOLANT') {
    if (/DCA|ADDITIVE|COOLANT/.test(t)) {
      internal = 'ThermoRelease™';
      equivalents.push('DCA','ADDITIVE','COOLANT');
    }
  }

  // AIR DRYER
  if (!internal && (fam === 'AIR DRYER' || fam === 'AIR_DRYER')) {
    if (/DESICCANT|AIR\s+DRYER/.test(t)) {
      internal = 'AeroDry Max';
      equivalents.push('DESICCANT','AIR DRYER');
    }
  }

  // MARINE
  if (!internal && (fam === 'MARINE' || fam === 'MARINE FILTER' || fam.includes('TURBINE'))) {
    // Try dedicated Marine/Turbine resolver first
    const resolved = resolveMarineTurbineTechnology({ name: raw, family: fam, duty: dy, code: raw });
    if (resolved && resolved.name) {
      internal = resolved.name;
      scopeOverride = resolved.scope || '';
      const info = getMarineTurbineTechInfo(internal);
      if (info && Array.isArray(info.technology_equivalents)) {
        equivalents.push(...info.technology_equivalents);
      }
    } else if (/SEPARATOR|WATER|FUEL|OIL|MARINE/.test(t)) {
      internal = dy === 'HD' ? 'ELIMTEK™ MultiCore' : 'ELIMTEK™ Blend';
      equivalents.push('MARINE','SEPARATOR','WATER','FUEL','OIL');
    }
  }

  // Sin coincidencias claras: usar selección interna por familia/duty
  if (!internal) {
    internal = getProductTechnology(fam, dy, '');
  }

  return {
    tecnologia_aplicada: internal,
    technology_name: internal,
    technology_tier: mapTier(internal),
    technology_scope: scopeOverride || buildScope(fam, dy),
    technology_equivalents: equivalents.join(', '),
    technology_oem_detected: raw
  };
}

module.exports = {
  normalizeTechnology
};