// ============================================================================
// NORMALIZE UTILITY - v5.0.0
// Text normalization for filter codes
// ============================================================================

/**
 * Normalize filter code
 * @param {string} code - Raw filter code
 * @returns {string} - Normalized code
 */
function code(rawCode) {
    if (!rawCode) return '';
    
    return String(rawCode)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .trim();
}

/**
 * Clean text (remove extra spaces, tabs, newlines)
 * @param {string} text - Raw text
 * @returns {string} - Cleaned text
 */
function clean(text = '') {
    return text
        .replace(/\t+/g, ' ')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Convert text to number
 * @param {string} text - Text containing number
 * @returns {number|null} - Extracted number or null
 */
function toNumber(text = '') {
    const n = parseFloat(text.replace(/[^\d\.]/g, ''));
    return isNaN(n) ? null : n;
}

/**
 * Normalize brand name
 * @param {string} brand - Raw brand name
 * @returns {string} - Normalized brand name
 */
function brand(rawBrand) {
    if (!rawBrand) return '';
    
    return String(rawBrand)
        .toUpperCase()
        .trim();
}

module.exports = {
    code,
    clean,
    toNumber,
    brand
};
