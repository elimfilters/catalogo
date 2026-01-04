const techSpecs = require('../config/ELIM_MASTER_DESCRIPTIONS.json');

function mapToMasterRow(aiAnalysis, query) {
    // 1. Identificar Prefijo ELIM basado en Aplicación Técnica (NO en prefijos competencia)
    const app = aiAnalysis.technical_application; // Ejemplo: "LUBE_OIL"
    const isCartridge = aiAnalysis.physical_structure === 'CARTRIDGE';
    
    // Mapeo de Prefijo
    const prefixMap = {
        "LUBE_OIL": "EL8",
        "AIR_PRIMARY": "EA1",
        "FUEL_SECONDARY": "EF9",
        "WATER_SEPARATOR": "ES9",
        "TURBINE_ELEMENT": "ET9",
        "CABIN_AIR": "EC1",
        "HYDRAULIC": "EH6",
        "COOLANT": "EW7",
        "MARINE": "EM9",
        "BRAKE_DRYER": "ED4"
    };

    const prefix = prefixMap[app] || "UNK";
    const baseCode = aiAnalysis.base_numeric_code;
    const form = isCartridge ? techSpecs.physical_form_logic.cartridge : techSpecs.physical_form_logic.spin_on;

    // 2. Generar Descripciones usando la "Regla de Oro"
    const buildDesc = (tierKey, tierLabel) => {
        const config = techSpecs.definitions[prefix];
        if (!config) return "Technical description pending engineering review.";
        
        return `Elimfilters® ${prefix}${baseCode} ${tierLabel} (${config.tech}) ${form} is designed to ${techSpecs.performance_tiers[tierKey].performance_claim}. ${config.tech} offers unique features that provide significant benefits for ${config.benefit}.`;
    };

    // 3. Retornar Fila para Master50 (Estructura Horizontal)
    return {
        prefix: prefix,
        // TIER STANDARD (Col G, J)
        sku_std: `${prefix}${baseCode}9000`,
        desc_std: buildDesc("STANDARD", "STANDARD"),
        // TIER PERFORMANCE (Col Q, T)
        sku_perf: `${prefix}${baseCode}0949`,
        desc_perf: buildDesc("PERFORMANCE", "PERFORMANCE"),
        // TIER ELITE (Col AA, AD)
        sku_elite: `${prefix}${baseCode}7900`,
        desc_elite: buildDesc("ELITE", "ELITE"),
        // ISO (Col AO/40)
        iso_standard: aiAnalysis.iso_norm
    };
}

// Exportación correcta para CommonJS
module.exports = { mapToMasterRow };
