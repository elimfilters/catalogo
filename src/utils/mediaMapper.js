// ============================================================================
// MEDIA MAPPER - v5.0.0
// Maps filter families to ELIMFILTERS™ filter media technology
// ============================================================================

// ============================================================================
// ELIMFILTERS™ PROPRIETARY FILTER MEDIA
// ============================================================================
// Sanctioned Media Types:
// - MACROCORE™      → Air Filters
// - MICROKAPPA™     → Cabin Air Filters
// - ELIMTEK™        → Oil, Fuel, Hydraulic, Coolant, Marine, Turbine
// ============================================================================

const MEDIA_BY_FAMILY = {
    // Air filters
    'AIR': 'MACROCORE™',
    'AIR': 'MACROCORE™',
    
    // Cabin air filters
    'CABIN': 'MICROKAPPA™',
    'CABIN AIR': 'MICROKAPPA™',
    
    // ELIMTEK™ covers all liquid filtration
    'OIL': 'ELIMTEK™ EXTENDED 99%',
    'FUEL': 'ELIMTEK™ EXTENDED 99%',
    'HIDRAULIC': 'ELIMTEK™ EXTENDED 99%',
    'HYDRAULIC': 'ELIMTEK™ EXTENDED 99%',
    'COOLANT': 'ELIMTEK™ EXTENDED 99%',
    'FUEL SEPARATOR': 'ELIMTEK™ EXTENDED 99%',
    'TURBINE': 'ELIMTEK™ EXTENDED 99%',
    'TURBINE SERIES': 'ELIMTEK™ EXTENDED 99%',
    'MARINE': 'ELIMTEK™ EXTENDED 99%',
    'MARINE FILTER': 'ELIMTEK™ EXTENDED 99%',
    'AIR DRYER': 'ELIMTEK™ EXTENDED 99%'
};

/**
 * Get filter media technology for a given family
 * @param {string} family - Filter family
 * @param {string} duty - HD or LD (optional, for future use)
 * @returns {string} - Filter media technology
 */
function getMedia(family, duty = null) {
    if (!family) {
        console.log('⚠️  No family provided for media selection');
        return 'ELIMTEK™ EXTENDED 99%'; // Default fallback
    }

    const normalizedFamily = family.toUpperCase().trim();
    const media = MEDIA_BY_FAMILY[normalizedFamily];

    if (!media) {
        console.log(`⚠️  No media mapping for family: ${family}, using default ELIMTEK™`);
        return 'ELIMTEK™ EXTENDED 99%'; // Default for unmapped families
    }

    console.log(`✅ Media selected: ${media} for ${family}`);
    return media;
}

/**
 * Get all available media types
 * @returns {Array} - Array of unique media types
 */
function getAllMedia() {
    return [...new Set(Object.values(MEDIA_BY_FAMILY))];
}

/**
 * Check if a family uses ELIMTEK™ media
 * @param {string} family - Filter family
 * @returns {boolean} - True if uses ELIMTEK™
 */
function usesElimtek(family) {
    const media = getMedia(family);
    return media.includes('ELIMTEK™');
}

module.exports = {
    getMedia,
    getAllMedia,
    usesElimtek,
    MEDIA_BY_FAMILY
};
