const Part = require('../models/Part');
const groqService = require('./groqService');
const skuBuilder = require('./skuBuilder');
const sheetsWriter = require('./sheetsWriter');
const donaldson = require('../../donaldsonScraper');

async function findAndProcess(searchTerm, manufacturer, engineType) {
    // 1. Memoria técnica (MongoDB)
    const cached = await Part.find({ cross_reference: searchTerm });
    if (cached.length > 0) return cached;

    // 2. Extracción de datos crudos (Scrapers)
    const externalSpecs = await donaldson.getThreeOptions(searchTerm);

    // 3. Procesamiento de la Trilogía basado en Especificaciones
    const finalResults = await Promise.all(externalSpecs.map(async (spec) => {
        const analysis = await groqService.analyzeTechnicalContext(manufacturer, engineType, spec);
        
        // Bloqueo de seguridad: No aplicar filtros HD en motores LD
        if (analysis.duty === 'LD' && skuBuilder.HD_ONLY.includes(skuBuilder.PREFIX_MAP[spec.application])) {
            return null;
        }

        return {
            sku: skuBuilder.buildDynamicSKU(spec.application, spec.code, spec.microns),
            tier: analysis.tier,
            duty: analysis.duty,
            microns: spec.microns,
            application: spec.application,
            cross_reference: searchTerm
        };
    }));

    const validResults = finalResults.filter(r => r !== null);

    // 4. Registro doble para el catálogo
    if (validResults.length > 0) {
        await Part.insertMany(validResults);
        await sheetsWriter.saveThreeRows(validResults);
    }

    return validResults;
}

module.exports = { findAndProcess };
