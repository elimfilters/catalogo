const Part = require('../models/Part');
const groqService = require('./groqService');
const skuBuilder = require('./skuBuilder');
const sheetsWriter = require('./sheetsWriter');
const donaldson = require('../../donaldsonScraper');
const fram = require('../../framScraper');

async function findAndProcess(searchTerm, manufacturer, engineType) {
    // 1. Verificar si ya lo tenemos en MongoDB (Catálogo inteligente)
    const cached = await Part.find({ cross_reference: searchTerm });
    if (cached.length > 0) return cached;

    // 2. Si no está, usamos Groq para determinar el contexto del motor (HD/LD)
    const context = await groqService.analyzeTechnicalContext(manufacturer, engineType, { microns: 0 }); // Análisis preliminar

    // 3. Activar Scraper según Duty
    const scraper = (context.duty === 'HD') ? donaldson : fram;
    const technicalOptions = await scraper.getThreeOptions(searchTerm);

    // 4. Generar la Trilogía ElimFilters basada en Especificaciones Físicas
    const results = await Promise.all(technicalOptions.map(async (opt) => {
        // Re-confirmar Tier con Groq basándose en los micrones reales del scraper
        const analysis = await groqService.analyzeTechnicalContext(manufacturer, engineType, opt);
        
        // Bloqueo de seguridad HD_ONLY
        if (analysis.duty === 'LD' && skuBuilder.HD_ONLY.includes(skuBuilder.PREFIX_MAP[opt.application])) {
            return null;
        }

        return {
            sku: skuBuilder.buildDynamicSKU(opt.application, opt.code, opt.microns),
            tier: analysis.tier,
            duty: analysis.duty,
            microns: opt.microns,
            performance_claim: opt.claim,
            cross_reference: searchTerm,
            original_competitor: opt.code
        };
    }));

    const finalResults = results.filter(r => r !== null);

    // 5. Persistencia: Llenar el catálogo automáticamente
    if (finalResults.length > 0) {
        await Part.insertMany(finalResults);
        await sheetsWriter.saveThreeRows(finalResults);
    }

    return finalResults;
}

module.exports = { findAndProcess };
