const groqService = require('./groqService');
const sheetsService = require('./sheetsService');
const donaldson = require('../scrapers/donaldson');
const fram = require('../scrapers/fram');
const skuGenerator = require('../sku/generator');
const digitExtractor = require('../utils/digitExtractor');

const processSearch = async (searchTerm) => {
    // 1. Check Caché (Google Sheets)
    const existing = await sheetsService.findInMaster(searchTerm);
    if (existing) return existing;

    // 2. IA Analysis (GROQ) -> Determina Duty y Prefijo
    const analysis = await groqService.analyzeCode(searchTerm);
    
    // 3. Scrape Technical Data (Referencia cruzada obligatoria)
    let techData;
    if (analysis.duty === 'HD') {
        techData = await donaldson.search(searchTerm);
    } else {
        techData = await fram.search(searchTerm);
    }

    // 4. Identidad ElimFilters (SKU)
    // Extraemos 4 dígitos del código obtenido del cross-reference
    const last4 = digitExtractor.extract(techData.refCode);
    const finalSKU = skuGenerator.create(analysis.prefix, last4);

    const result = {
        inputCode: searchTerm,
        sku: finalSKU,
        description: analysis.description,
        duty: analysis.duty,
        refCode: techData.refCode, // El código de Donaldson o Fram
        applications: techData.engines || analysis.suggestedEngines
    };

    // 5. Guardar en MASTER_UNIFIED_V5 para el futuro
    await sheetsService.saveToMaster(result);

    return result;
};

module.exports = { processSearch };
