const PREFIXES = require('../config/prefixes');

/**
 * Obtiene el prefijo oficial (inmutable) basado en family + duty.
 */
function getPrefix(family, duty) {
    const fam = String(family).toUpperCase();
    const dt = String(duty).toUpperCase();

    const map = {
        'OIL|LD': PREFIXES.OIL_LD,
        'OIL|HD': PREFIXES.OIL_HD,

        'FUEL|LD': PREFIXES.FUEL_LD,
        'FUEL|HD': PREFIXES.FUEL_HD,

        'AIRE|LD': PREFIXES.AIRE_LD,
        'AIRE|HD': PREFIXES.AIRE_HD,

        'CABIN|LD': PREFIXES.CABIN_LD,
        'CABIN|HD': PREFIXES.CABIN_HD,

        'TURBINE|HD': PREFIXES.TURBINE_HD,
        'HYDRAULIC|HD': PREFIXES.HYDRAULIC_HD,
        'SEPARATOR|HD': PREFIXES.SEPARATOR_HD,
        'COOLANT|HD': PREFIXES.COOLANT_HD,

        'HOUSING|LD': PREFIXES.AIR_HOUSING_LD,
        'HOUSING|HD': PREFIXES.AIR_HOUSING_HD,

        'MARINE|LD': PREFIXES.MARINE_ANY,
        'MARINE|HD': PREFIXES.MARINE_ANY
    };

    const key = `${fam}|${dt}`;
    const result = map[key];

    if (!result) {
        console.error(`❌ No prefix rule found for ${key}`);
        return null;
    }

    return result;
}