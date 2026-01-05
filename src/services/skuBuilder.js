/**
 * ELIMFILTERS® Engineering Core - SKU Builder
 * v9.4 - Lógica de Duty (HD/LD) y Sufijos de Turbina (P/T/S)
 */

const PREFIX_CONFIG = {
    // Aplicaciones duales (HD y LD)
    "EL8": { type: "Lube", duty: "BOTH" },
    "EA1": { type: "Air", duty: "BOTH" },
    "EF9": { type: "Fuel", duty: "BOTH" },
    "EC1": { type: "Cabin", duty: "BOTH" },
    "EM9": { type: "Mariner", duty: "BOTH" }, // Motores fuera/dentro de borda

    // Aplicaciones exclusivas HD
    "EH6": { type: "Hydraulic", duty: "HD_ONLY" },
    "EW7": { type: "Coolant", duty: "HD_ONLY" },
    "ED4": { type: "Brake", duty: "HD_ONLY" },
    "ES9": { type: "Separator", duty: "HD_ONLY" },

    // Caso Especial: Turbinas (Racor/Parker)
    "ET9": { type: "Turbine", duty: "BOTH" }
};

/**
 * @param {string} prefix - Prefijo ElimFilters (EL8, ET9, etc.)
 * @param {string} competitorCode - Código Donaldson/FRAM/Racor
 * @param {number} microns - Micraje detectado por el scraper o Groq
 */
function buildDynamicSKU(prefix, competitorCode, microns) {
    // 1. Limpiar el código base (tomar últimos 4)
    const cleanCode = competitorCode.toString().replace(/[^0-9]/g, '');
    let baseSKU = `${prefix}${cleanCode.slice(-4)}`;

    // 2. Lógica Especial para Turbinas ET9 (Sufijos de micraje)
    if (prefix === "ET9") {
        if (microns <= 2) baseSKU += "S";      // 2 micrones (Final)
        else if (microns <= 10) baseSKU += "T"; // 10 micrones (Secundario)
        else if (microns >= 30) baseSKU += "P"; // 30 micrones (Primario)
    }

    return baseSKU;
}

module.exports = { buildDynamicSKU, PREFIX_CONFIG };
