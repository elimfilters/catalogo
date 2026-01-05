/**
 * ELIMFILTERS® Engineering Core - SKU Builder
 * v10.1 - Prefijos Oficiales y Lógica de Turbinas/Carcasas
 */

const SKU_MAP = {
    'Air': 'EA1',        // HD/LD
    'Lube': 'EL8',       // HD/LD
    'Fuel': 'EF9',       // HD/LD
    'Hydraulic': 'EH6',  // HD
    'Coolant': 'EW7',    // HD
    'Cabin': 'EC1',      // HD/LD
    'Breather': 'ED4',   // HD
    'Marine': 'EM9',     // HD/LD - All Marine Engines
    'Turbine': 'ET9',    // Racor/Parker & Elements
    'Housing': 'EA2'     // Air Filter Housings HD
};

/**
 * Obtiene el prefijo institucional según el tipo de filtro
 */
function getPrefixByType(type) {
    return SKU_MAP[type] || 'EX0'; 
}

/**
 * Construye el SKU final aplicando el Protocolo 1R1808
 */
function generateFinalSKU(type, originalCode, microns) {
    const prefix = getPrefixByType(type);
    
    // 1. Limpieza de código: Quita guiones y toma los últimos 4 caracteres
    // Ejemplo: 1R-1808 -> 1808 | 2020PM -> 2020 (o 20PM según longitud)
    const cleanCode = originalCode.replace(/[^a-zA-Z0-9]/g, '');
    let coreCode = cleanCode.slice(-4);

    // 2. Lógica de Sufijos para Serie ET9 (Turbinas)
    // S (2 micras) | T (10 micras) | P (30 micras)
    let suffix = '';
    if (prefix === 'ET9') {
        if (microns <= 2) suffix = 'S';
        else if (microns <= 10) suffix = 'T';
        else suffix = 'P';
    }

    return `${prefix}${coreCode}${suffix}`;
}

module.exports = { 
    getPrefixByType, 
    generateFinalSKU 
};
