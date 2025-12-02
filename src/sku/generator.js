// ============================================================================
// SKU GENERATOR - v5.0.0
// Official ELIMFILTERS SKU generation system
// ============================================================================

const { extract4Digits } = require('../utils/digitExtractor');
const skuRules = require('../config/skuRules.json');
const { appendFailure } = require('../services/selfHealingLogger');

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
function generateSKU(family, duty, last4, ctx = {}) {
    // Validation
    if (!family || !duty) {
        const err = { error: 'Missing family or duty for SKU generation' };
        if (ctx && ctx.logOnError) {
            try {
                appendFailure({
                    failed_query_code: ctx.rawCode || ctx.code || null,
                    family_inference_signals: ctx.family_inference_signals || 'sku:missingFamilyDuty',
                    suggested_family_duty: `${String(family)}|${String(duty)}`,
                    reason: err.error
                });
            } catch (_) {}
        }
        return err;
    }

    if (!last4) {
        const err = { error: 'Missing last4 digits for SKU generation' };
        if (ctx && ctx.logOnError) {
            try {
                appendFailure({
                    failed_query_code: ctx.rawCode || ctx.code || null,
                    family_inference_signals: ctx.family_inference_signals || 'sku:missingLast4',
                    suggested_family_duty: `${String(family)}|${String(duty)}`,
                    reason: err.error
                });
            } catch (_) {}
        }
        return err;
    }

    // Get prefix from rules
    const prefix = getPrefix(family, duty);

    if (!prefix) {
        const err = { error: `No prefix rule found for ${family} | ${duty}` };
        if (ctx && ctx.logOnError) {
            try {
                appendFailure({
                    failed_query_code: ctx.rawCode || ctx.code || null,
                    family_inference_signals: ctx.family_inference_signals || 'sku:missingPrefix',
                    suggested_family_duty: `${String(family)}|${String(duty)}`,
                    reason: err.error
                });
            } catch (_) {}
        }
        return err;
    }

    // Validate last4 is exactly 4 digits
    if (!/^\d{4}$/.test(last4)) {
        const err = { error: `Invalid last4 digits: '${last4}' (must be 4 numeric digits)` };
        if (ctx && ctx.logOnError) {
            try {
                appendFailure({
                    failed_query_code: ctx.rawCode || ctx.code || null,
                    family_inference_signals: ctx.family_inference_signals || 'sku:invalidLast4',
                    suggested_family_duty: `${String(family)}|${String(duty)}`,
                    reason: err.error
                });
            } catch (_) {}
        }
        return err;
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
    getPrefix,
    // Specialized generators per EM9/ET9 spec
    generateEM9SubtypeSKU,
    generateEM9SSeparatorSKU,
    generateET9SystemSKU,
    generateET9FElementSKU
};

// ----------------------------------------------------------------------------
// EM9/ET9 Specialized Generators
// ----------------------------------------------------------------------------

/**
 * Generate EM9 subtype SKU for Marine general line
 * Subtypes: FUEL -> EM9-F, OIL -> EM9-O, AIRE -> EM9-A
 * Uses last 4 alphanumeric characters (A–Z0–9)
 */
function generateEM9SubtypeSKU(subtypeFamily, last4) {
    const fam = String(subtypeFamily || '').toUpperCase();
    const map = { FUEL: 'EM9-F', OIL: 'EM9-O', AIRE: 'EM9-A' };
    const prefix = map[fam] || 'EM9-F';
    const l4 = String(last4 || '').toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(l4)) {
        return { error: `Invalid last4: '${last4}' (must be 4 alphanumeric chars)` };
    }
    return prefix + l4;
}

/**
 * Generate EM9-S Separator SKU (e.g., R90T, S3201S)
 * Concatenation without cleaning: EM9-S + original code
 */
function generateEM9SSeparatorSKU(originalCode) {
    const code = String(originalCode || '').trim();
    if (!code) return { error: 'Missing original code for EM9-S' };
    return 'EM9-S' + code;
}

/**
 * Generate ET9 System SKU (hardware/housing)
 * Concatenation without cleaning: ET9 + original code (e.g., 900MA, 1000FH)
 */
function generateET9SystemSKU(originalCode) {
    const code = String(originalCode || '').trim();
    if (!code) return { error: 'Missing original code for ET9 system' };
    return 'ET9' + code;
}

/**
 * Generate ET9-F Element SKU (non-marine turbine elements: 2010/2020/2040)
 * Rule: base numeric (e.g., 2020) + micron suffix (T/P/S)
 */
function generateET9FElementSKU(originalCode) {
    const raw = String(originalCode || '').toUpperCase().trim();
    if (!raw) return { error: 'Missing original code for ET9-F element' };
    // Extract leading numeric base (first run of digits)
    const mBase = raw.match(/^(\d{3,5})/);
    if (!mBase) return { error: `No numeric base found in '${originalCode}'` };
    const base = mBase[1];
    // Determine micron suffix: prefer explicit T/P/S letters in code
    let suffix = 'S';
    if (/[T]/.test(raw)) suffix = 'T';
    else if (/[P]/.test(raw)) suffix = 'P';
    else if (/[S]/.test(raw)) suffix = 'S';
    return 'ET9-F' + base + suffix;
}
