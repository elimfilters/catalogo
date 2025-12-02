// ============================================================================
// DIGIT EXTRACTOR - v5.0.0
// Extract last 4 digits from OEM codes
// ============================================================================

/**
 * Extract exactly 4 digits from OEM code
 * Rules:
 * - Take the last 4 numeric digits
 * - Ignore letters
 * - Pad with zeros if less than 4 digits
 * 
 * @param {string} code - OEM code
 * @returns {string} - 4 digits or null
 */
function extract4Digits(code) {
    if (!code) {
        console.log('⚠️  No code provided for digit extraction');
        return null;
    }

    // Extract all digits from the code
    const digits = String(code).replace(/\D/g, '');

    if (!digits) {
        console.log(`⚠️  No digits found in: ${code}`);
        return null;
    }

    // Take last 4 digits
    if (digits.length >= 4) {
        const last4 = digits.slice(-4);
        console.log(`📊 Extracted last4: ${last4} from ${code}`);
        return last4;
    }

    // Pad with zeros if less than 4 digits
    const padded = digits.padStart(4, '0');
    console.log(`📊 Padded to last4: ${padded} from ${code}`);
    return padded;
}

/**
 * Validate that string contains exactly 4 digits
 * @param {string} digits - String to validate
 * @returns {boolean} - True if valid
 */
function isValid4Digits(digits) {
    return /^\d{4}$/.test(digits);
}

/**
 * Extract exactly 4 alphanumeric characters from OEM code
 * Rules:
 * - Normalize to A–Z0–9 (remove separators and symbols)
 * - Take the last 4 alphanumeric characters
 * - Pad with zeros if less than 4
 *
 * @param {string} code - OEM code
 * @returns {string|null} - 4 alphanumeric chars or null
 */
function extract4Alnum(code) {
    if (!code) {
        console.log('⚠️  No code provided for alnum extraction');
        return null;
    }

    const cleaned = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!cleaned) {
        console.log(`⚠️  No alphanumeric content found in: ${code}`);
        return null;
    }

    if (cleaned.length >= 4) {
        const last4 = cleaned.slice(-4);
        console.log(`📊 Extracted last4 alnum: ${last4} from ${code}`);
        return last4;
    }

    const padded = cleaned.padStart(4, '0');
    console.log(`📊 Padded to last4 alnum: ${padded} from ${code}`);
    return padded;
}

/**
 * Validate that string contains exactly 4 alphanumeric chars
 * @param {string} text - String to validate
 * @returns {boolean} - True if valid
 */
function isValid4Alnum(text) {
    return /^[A-Z0-9]{4}$/.test(String(text || ''));
}

module.exports = {
    extract4Digits,
    isValid4Digits,
    extract4Alnum,
    isValid4Alnum
};
