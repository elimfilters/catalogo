/**
 * ELIMFILTERS® Engineering Core - Service Engine
 * Protocolo 1R1808: Búsqueda, Creación de Trilogía y Persistencia
 */

const Part = require('../models/Part');
const groqService = require('./groqService');
const skuBuilder = require('./skuBuilder');
const sheetsWriter = require('./sheetsWriter');
const donaldson = require('../../donaldsonScraper');
const fram = require('../../framScraper');

async function findAndProcess(searchTerm, manufacturer, engineType) {
    try {
        // 1. Verificar Local (Mongo/Sheets)
        const cached = await Part.find({ cross_reference: searchTerm });
        if (cached && cached.length > 0) {
            console.log(`✅ [CACHE] Código ${searchTerm} recuperado de MongoDB.`);
            return cached;
        }

        // 2. Protocolo 1R1808 (HD vs LD)
        // Determina si el fabricante es Heavy Duty o Light Duty
        const analysis = await groqService.analyzeDuty(manufacturer, engineType);
        const scraper = (analysis.duty === 'HD') ? donaldson : fram;
        
        console.log(`🚀 [ENGINEERING] Procesando ${searchTerm} vía ${analysis.duty === 'HD' ? 'Donaldson' : 'FRAM'}`);

        // 3. Obtener Especificaciones Técnicas (3 niveles)
        const techOptions = await scraper.getThreeOptions(searchTerm);

        if (!techOptions || techOptions.length === 0) {
            throw new Error(`No se hallaron datos técnicos para ${searchTerm}`);
        }

        // 4. Mapeo y Creación de Trilogía
        const trilogy = techOptions.map(opt => {
            // Genera el SKU institucional (Prefijo + últimos 4 dígitos + sufijo si aplica)
            const finalSku = skuBuilder.generateFinalSKU(opt.type, opt.code, opt.microns);
            
            return {
                input_code: searchTerm,
                sku: finalSku,
                brand: "ELIMFILTERS® Engineering Core",
                tier: opt.tier,
                duty: analysis.duty,
                type: opt.type,
                prefix: skuBuilder.getPrefixByType(opt.type),
                cross_reference: searchTerm,
                original_code: opt.code,
                claim: opt.claim,
                specs: { ...opt.specs } // Los 40+ campos técnicos detallados
            };
        });

        // 5. Guardar en MongoDB y Google Sheets (MASTER_UNIFIED_V5)
        await Part.insertMany(trilogy);
        await sheetsWriter.writeToSheet(trilogy, 'SINGLE'); // SINGLE apunta a la hoja de 59 columnas

        console.log(`✅ [SUCCESS] Trilogía guardada individualmente para ${searchTerm}`);
        return trilogy;

    } catch (error) {
        console.error("❌ [SERVICE ERROR]:", error.message);
        throw error;
    }
}

// ESTA LÍNEA ES LA QUE CORRIGE EL ERROR "is not a function"
module.exports = { findAndProcess };
