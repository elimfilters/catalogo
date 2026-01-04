/**
 * ELIMFILTERS® Data Mapper v6.1
 * Especializado en mapeo de 56 columnas con lógica SISTEMGUARD™
 */
const descriptions = require('../config/ELIM_MASTER_DESCRIPTIONS.json');

module.exports = {
    mapToHorizontalRow: (aiData, query) => {
        // Inicializamos la fila de 56 columnas (Índices 0 a 55)
        const row = new Array(56).fill(""); 
        
        // Columna A (0): El término de búsqueda original
        row[0] = query; 

        // 1. Detección de Contexto: ¿Pieza suelta o Kit de Servicio?
        let prefix = aiData.prefix;
        const isKit = (aiData.search_type === 'VIN' || aiData.search_type === 'EQUIPMENT');
        
        // Si el usuario buscó por VIN o Equipo, forzamos el prefijo de Kit
        if (isKit) {
            prefix = (aiData.duty === 'HD') ? 'EK5' : 'EK3'; // EK5 para Heavy Duty, EK3 para Light Duty
        }

        const base = aiData.base_numeric_code;
        const config = descriptions.definitions[prefix] || { tech: "STANDARD", benefit: "protection" };
        
        // 2. Definición de la forma física para la redacción técnica
        let form = descriptions.physical_form_logic["spin-on"];
        if (isKit) {
            form = descriptions.physical_form_logic.kit; // "complete service package"
        } else if (aiData.is_cartridge) {
            form = descriptions.physical_form_logic.cartridge;
        } else if (prefix === 'EA1') {
            form = descriptions.physical_form_logic.radial;
        }

        // --- DISTRIBUCIÓN HORIZONTAL EN LA FILA MAESTRA ---

        // CASO ESPECIAL: Turbinas ET9 (P, T, S)
        if (prefix === 'ET9') {
            const variants = [
                { sfx: 'P', mic: '30μ', idxSKU: 6, idxDesc: 9 },
                { sfx: 'T', mic: '10μ', idxSKU: 16, idxDesc: 19 },
                { sfx: 'S', mic: '2μ', idxSKU: 26, idxDesc: 29 }
            ];
            variants.forEach(v => {
                row[v.idxSKU] = `ET9${base}${v.sfx}`;
                row[v.idxDesc] = `Elimfilters® ET9${base}${v.sfx} (${config.tech}) ${form} is designed for reliable protection (${v.mic}). ${config.tech} offers unique features that provide significant benefits for ${config.benefit}.`;
            });
        } 
        // CASO ESTÁNDAR: Trilogía (Standard, Performance, Elite)
        else {
            const tiers = [
                { tier: 'STANDARD', sfx: '9000', idxSKU: 6, idxDesc: 9 },    // Col G y J
                { tier: 'PERFORMANCE', sfx: '0949', idxSKU: 16, idxDesc: 19 }, // Col Q y T
                { tier: 'ELITE', sfx: '7900', idxSKU: 26, idxDesc: 29 }       // Col AA y AD
            ];
            
            tiers.forEach(t => {
                row[t.idxSKU] = `${prefix}${base}${t.sfx}`;
                const claim = descriptions.performance_tiers[t.tier].performance_claim;
                row[t.idxDesc] = `Elimfilters® ${prefix}${base}${t.sfx} ${t.tier} (${config.tech}) ${form} is designed to ${claim}. ${config.tech} offers unique features that provide significant benefits for ${config.benefit}.`;
            });
        }

        // --- COLUMNAS TÉCNICAS ADICIONALES ---
        row[39] = aiData.iso_norm || "ISO 9001:2015"; // Col AN (40)
        row[52] = config.tech; // Col BA (53): SISTEMGUARD™, SYNTRAX™, etc.
        row[55] = aiData.duty; // Col BD (56): HD o LD

        return row;
    }
};
