const descriptions = require('../config/ELIM_MASTER_DESCRIPTIONS.json');

module.exports = {
    mapToHorizontalRow: (aiData, query) => {
        const row = new Array(56).fill(""); 
        row[0] = query; 

        let prefix = aiData.prefix;
        // Detectar si la búsqueda proviene de las pestañas VIN o EQUIPMENT para asignar KIT
        const isKit = (aiData.search_type === 'VIN' || aiData.search_type === 'EQUIPMENT');
        
        if (isKit) {
            prefix = (aiData.duty === 'HD') ? 'EK5' : 'EK3';
        }

        const base = aiData.base_numeric_code;
        const config = descriptions.definitions[prefix] || { tech: "STANDARD", benefit: "protection" };
        
        // Detección de forma física para la redacción
        let form = descriptions.physical_form_logic["spin-on"];
        if (isKit) form = descriptions.physical_form_logic.kit;
        else if (aiData.is_cartridge) form = descriptions.physical_form_logic.cartridge;
        else if (prefix === 'EA1') form = descriptions.physical_form_logic.radial;

        // --- DISTRIBUCIÓN HORIZONTAL EN EL MASTER50 ---

        if (prefix === 'ET9') {
            const variants = [
                { sfx: 'P', mic: '30μ', idxSKU: 6, idxDesc: 9 },
                { sfx: 'T', mic: '10μ', idxSKU: 16, idxDesc: 19 },
                { sfx: 'S', idxSKU: 26, idxDesc: 29, mic: '2μ' }
            ];
            variants.forEach(v => {
                row[v.idxSKU] = `ET9${base}${v.sfx}`;
                row[v.idxDesc] = `Elimfilters® ET9${base}${v.sfx} (${config.tech}) ${form} is designed for reliable protection (${v.mic}). ${config.tech} offers unique features that provide significant benefits for ${config.benefit}.`;
            });
        } else {
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
        }

        // --- COLUMNAS TÉCNICAS Y DE CONTROL ---
        row[39] = aiData.iso_norm || "ISO 9001:2015";
        row[52] = config.tech; // SISTEMGUARD™ para los EK
        row[55] = aiData.duty; // HD o LD

        return row;
    }
};
