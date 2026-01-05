const donaldsonScraper = require('../scrapers/donaldsonScraper');
const sheetsWriter = require('./sheetsWriter'); // El que escribe las 59 columnas

const detectionService = {
    processSearch: async (searchTerm) => {
        console.log(`🔍 Analizando código: ${searchTerm}`);
        
        // Ejecuta el calco de Donaldson
        const options = await donaldsonScraper.getThreeOptions(searchTerm);
        
        if (options.length === 0) {
            return { status: "error", message: "No se encontró el código en el catálogo Donaldson." };
        }

        // Manda cada opción de la trilogía a Google Sheets
        for (const item of options) {
            await sheetsWriter.writeToMaster(item);
        }

        return {
            status: "success",
            results: options
        };
    }
};

module.exports = detectionService;
