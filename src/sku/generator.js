// ============================================================================
// SKU GENERATOR - v5.0.0
// Official ELIMFILTERS SKU generation system
// ============================================================================

const { extract4Digits } = require('../utils/digitExtractor');
const skuRules = require('../config/skuRules.json');

// ============================================================================
// SKU GENERATION RULES
// ============================================================================
// Sanctioned Rules:
// ✔ Valid prefix (e.g., EA1, EL8, EF9…) from skuRules.json
// ✔ + exactly 4 digits from OEM code
// ✔ No letters in the 4 digits
// ✔ No inventions
// ✔ No duplications
// ✔ If something is missing → controlled error
// ============================================================================

/**
 * Get prefix from SKU rules based on family and duty
 * @param {string} family - Filter family (AIRE, OIL, FUEL, etc.)
 * @param {string} duty - HD or LD
 * @returns {string|null} - Prefix or null if not found
 */
function getPrefix(family, duty) {
    if (!skuRules || !skuRules.decisionTable) {
        console.error('❌ SKU rules not loaded');
        return null;
    }

    const key = `${family.toUpperCase()}|${duty.toUpperCase()}`;
    const prefix = skuRules.decisionTable[key];

    if (!prefix) {
        console.log(`⚠️  No prefix found for: ${key}`);
    }

    return prefix || null;
}

/**
 * Generate ELIMFILTERS SKU
 * @param {string} family - Filter family
 * @param {string} duty - HD or LD
 * @param {string} last4 - Last 4 digits from OEM code
 * @returns {string|object} - SKU string or error object
 */
function generateSKU(family, duty, last4) {
    // Validation
    if (!family || !duty) {
        return { error: 'Missing family or duty for SKU generation' };
    }

    if (!last4) {
        return { error: 'Missing last4 digits for SKU generation' };
    }

    // Get prefix from rules
    const prefix = getPrefix(family, duty);

    if (!prefix) {
        return { error: `No prefix rule found for ${family} | ${duty}` };
    }

    // Validate last4 is exactly 4 digits
    if (!/^\d{4}$/.test(last4)) {
        return { error: `Invalid last4 digits: '${last4}' (must be 4 numeric digits)` };
    }

    // Generate final SKU
    const sku = prefix + last4;

    console.log(`✅ SKU Generated: ${sku} (${prefix} + ${last4})`);

    return sku;
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
    generateSKU,
    getPrefix
};
