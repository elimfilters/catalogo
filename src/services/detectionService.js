const sheetsService = require('./sheetsService');
const groqService = require('./groqService');
const donaldsonScraper = require('../scrapers/donaldson');
const framScraper = require('../scrapers/fram');
const skuGenerator = require('../sku/generator');
const digitExtractor = require('../utils/digitExtractor');

const detectionService = {
    processSearch: async (searchTerm) => {
        // 1. ¿Ya lo conocemos? (Check Sheets)
        const cached = await sheetsService.findInMaster(searchTerm);
        if (cached) return cached;

        // 2. ¿Qué es esto? (GROQ Analysis)
        const analysis = await groqService.analyzeCode(searchTerm);
        
        // 3. Buscar especificaciones técnicas (Scrapers)
        let techData;
        if (analysis.duty === 'HD') {
            techData = await donaldsonScraper.search(searchTerm);
        } else {
            techData = await framScraper.search(searchTerm);
        }

        // 4. Crear identidad ElimFilters (SKU)
        // Extraemos 4 dígitos del cross-reference obtenido
        const last4 = digitExtractor.getLast4(techData.refCode);
        const finalSKU = skuGenerator.generate(analysis.prefix, last4);

        const finalData = {
            inputCode: searchTerm,
            sku: finalSKU,
            description: analysis.description,
            duty: analysis.duty,
            referenceCode: techData.refCode,
            engines: techData.engines || analysis.suggestedEngines
        };

        // 5. Aprender (Guardar en Sheets para la próxima vez)
        await sheetsService.saveToMaster(finalData);

        return finalData;
    }
};

module.exports = detectionService;
