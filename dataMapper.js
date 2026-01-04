/**
 * ELIMFILTERS® Data Mapper v6.1 
 * TODO-EN-UNO (Sin necesidad de carpetas externas)
 */

// --- DICCIONARIO DE INGENIERÍA INTEGRADO ---
const descriptions = {
  "brand_identity": "Elimfilters®",
  "performance_tiers": {
    "STANDARD": { "performance_claim": "reliable filtration for standard service intervals" },
    "PERFORMANCE": { "performance_claim": "enhanced filtration efficiency and high dirt-holding capacity" },
    "ELITE": { "performance_claim": "maximum synthetic protection for extreme service conditions" }
  },
  "definitions": {
    "EL8": { "name": "full-flow lube", "tech": "SYNTRAX™", "benefit": "superior engine protection and consistent oil flow under high-pressure" },
    "EA1": { "name": "primary air", "tech": "NANOFORCE™", "benefit": "longer service life and optimum performance when the job demands it" },
    "EF9": { "name": "secondary high-efficiency fuel", "tech": "SYNTEPORE™", "benefit": "protecting sensitive high-pressure common rail (HPCR) systems" },
    "ES9": { "name": "fuel/water separator", "tech": "AQUASEP™", "benefit": "effective water removal and particulate filtration to prevent corrosion" },
    "ET9": { "name": "turbine series replacement", "tech": "AQUAGUARD®", "benefit": "active water repulsion and reliable protection for critical turbines" },
    "EC1": { "name": "advanced cabin air", "tech": "BIOGUARD™", "benefit": "maintaining a clean environment by capturing allergens and odors" },
    "EH6": { "name": "high-pressure hydraulic", "tech": "CINTEK™", "benefit": "maintaining fluid cleanliness in precision hydraulic circuits" },
    "EW7": { "name": "thermal-protection coolant", "tech": "THERM™", "benefit": "balancing coolant chemistry and preventing liner pitting" },
    "EM9": { "name": "mariner pro™ series", "tech": "MARINER PRO™", "benefit": "corrosion resistance and reliability in saltwater environments" },
    "ED4": { "name": "pneumatic air brake dryer", "tech": "BRAKEGUARD™", "benefit": "removing moisture to ensure the safety of braking systems" },
    "EK5": { "name": "Heavy-Duty Master Service Kit", "tech": "SISTEMGUARD™", "benefit": "all-in-one comprehensive protection for heavy machinery" },
    "EK3": { "name": "Light-Duty Service Kit", "tech": "SISTEMGUARD™", "benefit": "optimized maintenance package for passenger and light truck vehicles" }
  },
  "physical_form_logic": {
    "spin-on": "spin-on filter",
    "cartridge": "cartridge filtration element",
    "radial": "radial seal element",
    "kit": "complete service package"
  }
};

// --- LÓGICA DE MAPEO DE 56 COLUMNAS ---
module.exports = {
    mapToHorizontalRow: (aiData, query) => {
        const row = new Array(56).fill(""); 
        row[0] = query; 

        let prefix = aiData.prefix;
        const isKit = (aiData.search_type === 'VIN' || aiData.search_type === 'EQUIPMENT');
        
        if (isKit) {
            prefix = (aiData.duty === 'HD') ? 'EK5' : 'EK3';
        }

        const base = aiData.base_numeric_code;
        const config = descriptions.definitions[prefix] || { tech: "STANDARD", benefit: "protection" };
        
        // Determinar forma física
        let form = descriptions.physical_form_logic["spin-on"];
        if (isKit) form = descriptions.physical_form_logic.kit;
        else if (aiData.is_cartridge) form = descriptions.physical_form_logic.cartridge;
        else if (prefix === 'EA1') form = descriptions.physical_form_logic.radial;

        // Distribución en la fila (Trilogía: Std, Perf, Elite)
        const tiers = [
            { tier: 'STANDARD', sfx: '9000', idxSKU: 6, idxDesc: 9 },
            { tier: 'PERFORMANCE', sfx: '0949', idxSKU: 16, idxDesc: 19 },
            { tier: 'ELITE', sfx: '7900', idxSKU: 26, idxDesc: 29 }
        ];
        
        tiers.forEach(t => {
            row[t.idxSKU] = `${prefix}${base}${t.sfx}`;
            const claim = descriptions.performance_tiers[t.tier].performance_claim;
            row[t.idxDesc] = `Elimfilters® ${prefix}${base}${t.sfx} ${t.tier} (${config.tech}) ${form} is designed to ${claim}. ${config.tech} offers unique features that provide significant benefits for ${config.benefit}.`;
        });

        row[39] = aiData.iso_norm || "ISO 9001:2015";
        row[52] = config.tech; 
        row[55] = aiData.duty; 

        return row;
    }
};
