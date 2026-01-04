const descriptions = require('../config/ELIM_MASTER_DESCRIPTIONS.json');

module.exports = {
    mapToHorizontalRow: (aiData, query) => {
        const row = new Array(56).fill(""); 
        row[0] = query; // Columna A: Input del usuario (Part/VIN/Equip)

        // 1. Detección de Prefijo y Contexto (Pieza vs Kit)
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

        // --- DISTRIBUCIÓN HORIZONTAL EN EL MASTER50 ---

        if (prefix === 'ET9') {
            // REGLA ESPECIAL TURBINAS (P, T, S)
            const variants = [
                { sfx: 'P', mic: '30μ', idxSKU: 6, idxDesc: 9 },
                { sfx: 'T', mic: '10μ', idxSKU: 16, idxDesc: 19 },
                { sfx: 'S', mic: '2μ', idxSKU: 26, idxDesc: 29 }
            ];
            variants.forEach(v => {
                row[v.idxSKU] = `ET9${base}${v.sfx}`;
                row[v.idxDesc] = `Elimfilters® ET9${base}${v.sfx} (${config.tech}) ${form} is designed for reliable protection (${v.mic}). ${config.tech} offers unique features that provide significant benefits for ${config.benefit}.`;
            });
        } else {
            // REGLA TRILOGY (Standard 9000, Performance 0949, Elite 7900)
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

        // --- DATOS TÉCNICOS ---
        row[39] = aiData.iso_norm || "ISO 9001:2015"; // Col AO (40)
        row[52] = config.tech; // Col BA (53)
        row[55] = aiData.duty; // Col BD (56): HD o LD

        return row;
    }
};
