// ============================================================================
// SCRAPER BRIDGE - Updated with Strict Validation
// CRITICAL: Only Donaldson and FRAM codes can generate SKUs
// ============================================================================

const { validateDonaldsonCode } = require('./donaldson');
const { validateFramCode } = require('./fram');

/**
 * Bridge to determine which scraper to use
 * CRITICAL RULE: Only Donaldson (HD) or FRAM (LD) codes are valid for SKU generation
 * Other brands (Fleetguard, Baldwin, WIX) must be rejected or cross-referenced
 */
async function scraperBridge(code, duty) {
    const normalizedCode = code.toUpperCase().trim();
    
    console.log(`🌉 Scraper Bridge: ${normalizedCode} | Duty: ${duty}`);
    
    // =========================================================================
    // STEP 1: Validate code belongs to Donaldson or FRAM
    // =========================================================================
    
    const isDonaldson = isDonaldsonCode(normalizedCode);
    const isFram = isFramCode(normalizedCode);
    
    if (!isDonaldson && !isFram) {
        console.log(`❌ REJECTED: ${normalizedCode} is not Donaldson or FRAM`);
        console.log(`   This code cannot generate SKU directly`);
        console.log(`   Brands like Fleetguard (LF), Baldwin (B), WIX must use cross-reference`);
        
        return {
            valid: false,
            code: normalizedCode,
            reason: 'NOT_DONALDSON_OR_FRAM',
            message: 'Only Donaldson or FRAM codes can generate SKUs. Use cross-reference lookup for other brands.'
        };
    }
    
    // =========================================================================
    // STEP 2: Call appropriate scraper based on DUTY
    // =========================================================================
    
    if (duty === 'HD') {
        // HD must be Donaldson
        if (!isDonaldson) {
            console.log(`❌ MISMATCH: HD duty requires Donaldson code, got: ${normalizedCode}`);
            return { valid: false, reason: 'HD_REQUIRES_DONALDSON' };
        }
        
        console.log(`📡 Calling Donaldson scraper...`);
        return await validateDonaldsonCode(normalizedCode);
        
    } else if (duty === 'LD') {
        // LD must be FRAM
        if (!isFram) {
            console.log(`❌ MISMATCH: LD duty requires FRAM code, got: ${normalizedCode}`);
            return { valid: false, reason: 'LD_REQUIRES_FRAM' };
        }
        
        console.log(`📡 Calling FRAM scraper...`);
        return await validateFramCode(normalizedCode);
        
    } else {
        console.log(`❌ Invalid duty: ${duty}`);
        return { valid: false, reason: 'INVALID_DUTY' };
    }
}

/**
 * Check if code is Donaldson (any series)
 */
function isDonaldsonCode(code) {
    // Donaldson series patterns
    const donaldsonPatterns = [
        /^P\d{5,6}[A-Z]?$/,        // P-series (most common)
        /^DBL\d{4,5}$/,             // Lube filters
        /^ECC\d{5}$/,               // Coolant filters
        /^FPG\d{5}$/,               // Fuel primary
        /^FFP\d{5}$/,               // Fuel primary
        /^FFS\d{5}$/,               // Fuel secondary
        /^HFA\d{4,5}$/,             // Air primary
        /^HFP\d{5}$/,               // Air primary
        /^EAF\d{5}$/,               // Air safety
        /^X\d{5,6}$/                // X-series
    ];
    
    return donaldsonPatterns.some(pattern => pattern.test(code));
}

/**
 * Check if code is FRAM
 */
function isFramCode(code) {
    // FRAM series patterns
    const framPatterns = [
        /^PH\d{3,5}[A-Z]?$/,        // Oil Standard
        /^TG\d{3,5}[A-Z]?$/,        // Oil Tough Guard
        /^XG\d{3,5}[A-Z]?$/,        // Oil Extra Guard
        /^HM\d{3,5}[A-Z]?$/,        // Oil High Mileage
        /^CA\d{3,5}[A-Z]?$/,        // Air
        /^CF\d{3,5}[A-Z]?$/,        // Cabin FreshBreeze
        /^CH\d{3,5}[A-Z]?$/,        // Cabin Standard
        /^G\d{3,5}[A-Z]?$/,         // Fuel In-Line
        /^PS\d{3,5}[A-Z]?$/         // Fuel Separator
    ];
    
    return framPatterns.some(pattern => pattern.test(code));
}

/**
 * Get rejected brands list (for error messages)
 */
function getRejectedBrands() {
    return [
        'LF (Fleetguard)',
        'B (Baldwin)',
        '51xxx (WIX)',
        'ML (Mann Filter)',
        'And other non-Donaldson/FRAM brands'
    ];
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    scraperBridge,
    isDonaldsonCode,
    isFramCode,
    getRejectedBrands
};
