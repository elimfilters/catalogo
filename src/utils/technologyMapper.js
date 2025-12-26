const TECHNOLOGY_MAP = require('../config/technologyMap.json');
const technologyDatabase = require('../config/technologyDatabase');

function mapToElimfiltersTechnology(techDetected, family, duty) {
  try {
    const normalized = normalizeDetectedTech(techDetected);
    let mapping = TECHNOLOGY_MAP[normalized];
    
    if (!mapping && techDetected) {
      mapping = findByKeywords(techDetected, family, duty);
    }
    
    if (!mapping) {
      mapping = getDefaultTechnology(family, duty);
    }
    
    return {
      tecnologia_aplicada: mapping.elimfilters_tech || mapping.technology_name || 'ELIMTEK™',
      technology_name: mapping.technology_name || `ELIMTEK™ – ${family} Filter (${duty})`,
      technology_tier: mapping.technology_tier || 'STANDARD',
      technology_scope: mapping.technology_scope || `${family}|${duty}`,
      technology_equivalents: normalized || '',
      technology_oem_detected: techDetected || ''
    };
  } catch (error) {
    console.error('❌ [TECH MAPPER] Error:', error);
    return getDefaultTechnology(family, duty);
  }
}

function normalizeDetectedTech(tech) {
  if (!tech) return null;
  
  const techStr = String(tech).toUpperCase()
    .replace(/[®™©]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
  
  const prefixes = ['DONALDSON_', 'FRAM_', 'FLEETGUARD_', 'RACOR_'];
  for (const prefix of prefixes) {
    if (techStr.startsWith(prefix)) {
      return techStr;
    }
  }
  
  if (techStr.includes('SYNTEQ')) {
    if (techStr.includes('XP')) return 'DONALDSON_SYNTEQ_XP';
    if (techStr.includes('DRY')) return 'DONALDSON_SYNTEQ_DRY';
    return 'DONALDSON_SYNTEQ';
  }
  
  if (techStr.includes('ULTRA_WEB') || techStr.includes('ULTRAWEB')) {
    if (techStr.includes('HD')) return 'DONALDSON_ULTRA_WEB_HD';
    if (techStr.includes('FR')) return 'DONALDSON_ULTRA_WEB_FR';
    return 'DONALDSON_ULTRA_WEB';
  }
  
  if (techStr.includes('POWERCORE')) return 'DONALDSON_POWERCORE';
  if (techStr.includes('BLUE')) return 'DONALDSON_BLUE';
  
  if (techStr.includes('TITANIUM')) {
    if (techStr.includes('OIL')) return 'FRAM_TITANIUM_OIL';
    if (techStr.includes('AIR')) return 'FRAM_TITANIUM_AIR';
  }
  
  if (techStr.includes('SYNTHETIC_ENDURANCE') || techStr.includes('ENDURANCE')) return 'FRAM_SYNTHETIC_ENDURANCE';
  if (techStr.includes('FORCE')) return 'FRAM_FORCE';
  if (techStr.includes('EXTRA_GUARD')) return 'FRAM_EXTRA_GUARD_OIL';
  
  return null;
}

function findByKeywords(techDetected, family, duty) {
  const keywords = String(techDetected).toLowerCase();
  
  if (keywords.includes('synthetic') || keywords.includes('nano')) {
    if (family === 'OIL') {
      return TECHNOLOGY_MAP['DONALDSON_SYNTEQ'] || TECHNOLOGY_MAP['FRAM_SYNTHETIC_ENDURANCE'];
    }
    if (family === 'AIR') {
      return TECHNOLOGY_MAP['DONALDSON_ULTRA_WEB'] || TECHNOLOGY_MAP['FRAM_TITANIUM_AIR'];
    }
  }
  
  return null;
}

function getDefaultTechnology(family, duty) {
  const normalizedFamily = String(family || '').toUpperCase();
  const normalizedDuty = String(duty || '').toUpperCase();
  
  const dutyKey = normalizedDuty === 'LD' ? 'LD' : 'HD';
  const technologies = technologyDatabase[dutyKey]?.[normalizedFamily];
  
  if (technologies && technologies.length > 0) {
    const defaultTech = technologies[0];
    return {
      elimfilters_tech: defaultTech.media_type || 'ELIMTEK™',
      technology_name: defaultTech.name,
      technology_tier: defaultTech.tier || 'STANDARD',
      technology_scope: `${normalizedFamily}|${normalizedDuty}`,
      technology_equivalents: defaultTech.equivalents || ''
    };
  }
  
  return {
    elimfilters_tech: 'ELIMTEK™',
    technology_name: `ELIMTEK™ – ${normalizedFamily} Filter (${normalizedDuty})`,
    technology_tier: 'STANDARD',
    technology_scope: `${normalizedFamily}|${normalizedDuty}`,
    technology_equivalents: ''
  };
}

function mapTechnology(family, duty, attributes = {}) {
  const normalizedFamily = String(family || '').toUpperCase();
  const normalizedDuty = String(duty || '').toUpperCase();
  
  const dutyKey = normalizedDuty === 'LD' ? 'LD' : 'HD';
  const technologies = technologyDatabase[dutyKey]?.[normalizedFamily] || [];
  
  if (technologies.length === 0) {
    return getDefaultTechnology(normalizedFamily, normalizedDuty);
  }
  
  const selectedTech = selectBestTechnology(technologies, attributes);
  
  return {
    elimfilters_tech: selectedTech.media_type,
    technology_name: selectedTech.name,
    technology_tier: selectedTech.tier,
    technology_scope: normalizedDuty,
    technology_equivalents: selectedTech.equivalents || ''
  };
}

function selectBestTechnology(technologies, attributes) {
  if (technologies.length === 1) return technologies[0];
  
  const mediaType = String(attributes.media_type || '').toLowerCase();
  
  if (mediaType.includes('synthetic') && !mediaType.includes('blend')) {
    const synthetic = technologies.find(t => 
      t.tier === 'MultiCore' || t.tier === 'Ultra'
    );
    if (synthetic) return synthetic;
  }
  
  if (mediaType.includes('blend')) {
    const blend = technologies.find(t => t.tier === 'Blend' || t.tier === 'Plus');
    if (blend) return blend;
  }
  
  return technologies[0];
}

module.exports = {
  mapToElimfiltersTechnology,
  mapTechnology,
  selectBestTechnology
};
