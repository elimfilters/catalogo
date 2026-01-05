/**
 * ELIMFILTERS® Engineering Core - Detection Service
 * v12.2 - Integración Dual HD/LD
 */

const donaldsonScraper = require('../../donaldsonScraper');
const framScraper = require('../scrapers/framScraper'); // Nuevo Scraper
const sheetsWriter = require('./sheetsWriter');

const HD_BRANDS = ['CATERPILLAR', 'CAT', 'JOHN DEERE', 'BOBCAT', 'KOMATSU', 'MACK', 'FREIGHTLINER', 'CUMMINS'];
const LD_BRANDS = ['FORD', 'TOYOTA', 'BMW', 'MERCEDES BENZ', 'MERCEDES', 'NISSAN', 'CHEVROLET', 'HONDA', 'HYUNDAI'];

const detectionService = {
    findAndProcess: async (searchTerm, brand, searchType) => {
        try {
            const brandUpper = brand.toUpperCase();
            const isHD = HD_BRANDS.includes(brandUpper);
            const isLD = LD_BRANDS.includes(brandUpper);

            let trilogy = [];

            if (isHD) {
                console.log(`🚛 Protocolo HD Activado: Buscando ${searchTerm} en Donaldson...`);
                trilogy = await donaldsonScraper.getThreeOptions(searchTerm);
            } else if (isLD) {
                console.log(`🚗 Protocolo LD Activado: Buscando ${searchTerm} en FRAM...`);
                trilogy = await framScraper.getThreeOptions(searchTerm);
            } else {
                // Si la marca no está en las listas, por defecto buscamos en Donaldson por seguridad HD
                trilogy = await donaldsonScraper.getThreeOptions(searchTerm);
            }

            if (trilogy && trilogy.length > 0) {
                for (const item of trilogy) {
                    await sheetsWriter.writeToMaster(item, searchTerm);
                }
                return { success: true, data: trilogy };
            }

            return { success: false, error: "No se encontraron equivalentes para esta marca." };

        } catch (error) {
            console.error("❌ Error en detectionService:", error.message);
            throw error;
        }
    }
};

module.exports = detectionService;
