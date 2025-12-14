// ============================================================================
// SCRAPER BRIDGE - Donaldson-first strategy
// Regla principal: Buscar en Donaldson primero; luego FRAM según duty
// ============================================================================

const normalize = require('../utils/normalize');
const prefixMap = require('../config/prefixMap');

const { validateDonaldsonCode } = require('./donaldson');
const { validateFramCode } = require('./fram');

/**
 * Bridge to determine which scraper to use
 * CRITICAL RULE:
 * - Donaldson (HD) first
 * - FRAM only for LD
 */
async function scraperBridge(code, duty) {
  try {
    const normalizedCode = normalize.code(code);

    console.log(`🌉 Scraper Bridge: ${normalizedCode} | Duty input: ${duty || 'N/A'}`);

    const hint = prefixMap.resolveBrandFamilyDutyByPrefix(normalizedCode) || {};
    const effectiveDuty = hint.duty || duty || null;

    // =========================================================================
    // STEP 1: Try DONALDSON first (HD or unknown)
    // =========================================================================
    if (
      prefixMap.DONALDSON_STRICT_REGEX.test(normalizedCode) ||
      hint.brand === 'DONALDSON' ||
      !hint.brand
    ) {
      const don = await validateDonaldsonCode(normalizedCode);
      if (don && don.valid) {
        return don;
      }
    }

    // =========================================================================
    // STEP 2: Try FRAM only if LD
    // =========================================================================
    if (effectiveDuty === 'LD' || hint.brand === 'FRAM') {
      const fr = await validateFramCode(normalizedCode);
      if (fr && fr.valid) {
        return fr;
      }
    }

    // =========================================================================
    // STEP 3: Classified by prefix (no scraper match)
    // =========================================================================
    if (hint.brand) {
      return {
        valid: false,
        code: normalizedCode,
        source: hint.brand,
        family: hint.family || null,
        duty: effectiveDuty,
        prefix: hint.prefix || null,
        reason: 'CLASSIFIED_BY_PREFIX'
      };
    }

    return {
      valid: false,
      code: normalizedCode,
      reason: 'NOT_FOUND_IN_SCRAPERS'
    };

  } catch (err) {
    console.error('❌ scraperBridge error:', err);
    return null;
  }
}

/**
 * Helpers
 */
function isDonaldsonCode(code) {
  return prefixMap.DONALDSON_STRICT_REGEX.test(normalize.code(code));
}

function isFramCode(code) {
  const framPatterns = [
    /^PH\d{3,5}[A-Z]?$/,
    /^TG\d{3,5}[A-Z]?$/,
    /^XG\d{3,5}[A-Z]?$/,
    /^HM\d{3,5}[A-Z]?$/,
    /^CA\d{3,5}[A-Z]?$/,
    /^CF\d{3,5}[A-Z]?$/,
    /^CH\d{3,5}[A-Z]?$/,
    /^G\d{3,5}[A-Z]?$/,
    /^PS\d{3,5}[A-Z]?$/
  ];

  return framPatterns.some(p => p.test(code));
}

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
  scraperBridge,
  isDonaldsonCode,
  isFramCode
};
