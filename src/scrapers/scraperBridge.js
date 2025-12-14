const normalize = require('../utils/normalize');
const prefixMap = require('../config/prefixMap');

async function scraperBridge(code, duty) {
  try {
    // Normalizar el código
    const normalizedCode = normalize.code(code);

    // Obtener sugerencias de familia y duty
    const hint = prefixMap.resolveBrandFamilyDutyByPrefix(normalizedCode) || {};

    // Si hint sugiere duty, preferirlo sobre el proporcionado
    const effectiveDuty = hint.duty || duty || null;

    console.log(`🔍 Scraper Bridge: code=${normalizedCode} | duty=${effectiveDuty} | hint.brand=${hint.brand || 'N/A'} | hint.family=${hint.family || 'N/A'}`);

    // Retornar objeto con información base para detectFilter
    return {
      code: normalizedCode,
      brand: hint.brand,
      family: hint.family,
      duty: effectiveDuty
    };

  } catch (error) {
    console.error('Error in scraperBridge:', error);
    return null;
  }
}

module.exports = scraperBridge;
