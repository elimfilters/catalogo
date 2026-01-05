/**
 * ELIMFILTERS® Engineering Core - Detection Service
 * v12.4 - Corrección de Rutas y Soporte HD/LD
 */

// RUTAS CORREGIDAS PARA RAILWAY
const donaldsonScraper = require('../scrapers/donaldsonScraper'); 
const sheetsWriter = require('./sheetsWriter');
// const framScraper = require('../scrapers/framScraper'); // Descomentar cuando crees el archivo

const HD_BRANDS = ['CATERPILLAR', 'CAT', 'JOHN DEERE', 'BOBCAT', 'KOMATSU', 'MACK', 'FREIGHTLINER', 'CUMMINS'];
const LD_BRANDS = ['FORD', 'TOYOTA', 'BMW', 'MERCEDES BENZ', 'NISSAN', 'CHEVROLET'];

const detectionService = {
    findAndProcess: async (searchTerm, brand, searchType) => {
        try {
            console.log(`🚀 Procesando: ${searchTerm} para ${brand}`);
            const brandUpper = brand ? brand.toUpperCase() : "";
            
            let results = [];

            // Lógica de Auditoría: ¿Es Heavy Duty o Light Duty?
            if (HD_BRANDS.includes(brandUpper)) {
                console.log("🚛 [DUTY: HD] Iniciando Donaldson Scraper...");
                results = await donaldsonScraper.getThreeOptions(searchTerm);
            } else if (LD_BRANDS.includes(brandUpper)) {
                console.log("🚗 [DUTY: LD] Iniciando Protocolo LD (FRAM)...");
                // Por ahora usamos Donaldson hasta que el scraper de FRAM esté listo
                results = await donaldsonScraper.getThreeOptions(searchTerm);
            } else {
                results = await donaldsonScraper.getThreeOptions(searchTerm);
            }

            if (results && results.length > 0) {
                for (const item of results) {
                    await sheetsWriter.writeToMaster(item, searchTerm);
                }
                return { success: true, data: results };
            }

            return { success: false, error: "No se encontraron resultados." };

        } catch (error) {
            console.error("❌ Error en detectionService:", error.message);
            throw error;
        }
    }
};

module.exports = detectionService;
