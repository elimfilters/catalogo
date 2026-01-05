const Part = require('../models/Part');
const groqService = require('./groqService');
const skuBuilder = require('./skuBuilder');
const sheetsWriter = require('./sheetsWriter');
const donaldson = require('../../donaldsonScraper');
const fram = require('../../framScraper');

// Configuración de Exclusividad
const HD_ONLY_PREFIXES = ['EH6', 'EW7', 'ED4', 'ES9'];

async function findAndProcess(searchTerm, manufacturer) {
    // 1. PRIORIDAD 1: Buscar en MongoDB (Caché local)
    const cachedResults = await Part.find({ cross_reference: searchTerm });
    if (cachedResults.length > 0) return cachedResults;

    // 2. PRIORIDAD 2: Protocolo Externo (Si no existe en base de datos)
    // Determinamos Duty Inicial con Groq
    const analysis = await groqService.analyzeTechnicalSpecs(manufacturer, searchTerm);
    
    // Seleccionar Scraper: Donaldson para HD, FRAM para LD
    const scraper = (analysis.duty === 'HD') ? donaldson : fram;
    const externalOptions = await scraper.getThreeOptions(searchTerm);

    // 3. PROCESAMIENTO DE LA TRILOGÍA ELIMFILTERS
    const finalResults = externalOptions.map(ext => {
        const prefix = ext.prefix; // Determinado por el scraper (EL8, EF9, etc.)

        // VALIDACIÓN DE SEGURIDAD: Exclusividad HD
        if (analysis.duty === 'LD' && HD_ONLY_PREFIXES.includes(prefix)) {
            console.warn(`⚠️ Conflicto detectado: Prefijo ${prefix} es exclusivo para Heavy Duty.`);
            return null; // No genera SKU para aplicaciones LD prohibidas
        }

        // CONSTRUCCIÓN DE SKU (Incluye lógica ET9 S/T/P)
        const generatedSku = skuBuilder.buildDynamicSKU(prefix, ext.code, ext.microns);

        return {
            sku: generatedSku,
            brand: "ELIMFILTERS® Engineering Core",
            tier: ext.tier, // ELITE, PERFORMANCE o STANDARD
            duty: analysis.duty,
            microns: ext.microns,
            performance_claim: ext.claim,
            specifications: ext.specs,
            cross_reference: searchTerm,
            original_code: ext.code
        };
    }).filter(res => res !== null); // Filtra los resultados invalidados por duty

    // 4. PERSISTENCIA DOBLE (MongoDB + Google Sheets)
    if (finalResults.length > 0) {
        await Part.insertMany(finalResults);
        await sheetsWriter.saveThreeRows(finalResults);
    }

    return finalResults;
}

module.exports = { findAndProcess };
