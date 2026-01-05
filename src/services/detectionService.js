/**
 * ELIMFILTERS® Engineering Core - Detection Service
 * v12.2 - Auditoría de Doble Flujo HD/LD
 */

const donaldsonScraper = require('../../donaldsonScraper'); // Para HD
const framScraper = require('../scrapers/framScraper');      // Para LD (Nuevo)
const sheetsWriter = require('./sheetsWriter');

// Diccionarios de Auditoría Técnica
const HD_BRANDS = ['CATERPILLAR', 'CAT', 'JOHN DEERE', 'BOBCAT', 'KOMATSU', 'MACK', 'FREIGHTLINER', 'CUMMINS', 'PERKINS'];
const LD_BRANDS = ['FORD', 'TOYOTA', 'BMW', 'MERCEDES BENZ', 'NISSAN', 'CHEVROLET', 'HONDA', 'HYUNDAI', 'MAZDA'];

const detectionService = {
    findAndProcess: async (searchTerm, brand, searchType) => {
        try {
            const brandUpper = brand.toUpperCase();
            const isHD = HD_BRANDS.includes(brandUpper);
            const isLD = LD_BRANDS.includes(brandUpper);

            let trilogy = [];

            // RUTA 1: Protocolo Heavy Duty (Donaldson)
            if (isHD) {
                console.log(`🚛 [AUDITORÍA HD]: Buscando ${searchTerm} en Donaldson...`);
                trilogy = await donaldsonScraper.getThreeOptions(searchTerm);
            } 
            // RUTA 2: Protocolo Light Duty (FRAM)
            else if (isLD) {
                console.log(`🚗 [AUDITORÍA LD]: Buscando ${searchTerm} en FRAM...`);
                trilogy = await framScraper.getThreeOptions(searchTerm);
            } 
            // RUTA 3: Default por seguridad técnica (Donaldson)
            else {
                console.log(`⚠️ Marca no clasificada. Aplicando Protocolo HD por seguridad.`);
                trilogy = await donaldsonScraper.getThreeOptions(searchTerm);
            }

            // PROCESAMIENTO COMÚN: Registro en Sheet de 56 columnas
            if (trilogy && trilogy.length > 0) {
                for (const item of trilogy) {
                    await sheetsWriter.writeToMaster(item, searchTerm);
                }
                return { success: true, data: trilogy };
            }

            return { success: false, error: "No se encontraron equivalentes." };

        } catch (error) {
            console.error("❌ Error en detectionService:", error.message);
            throw error;
        }
    }
};

module.exports = detectionService;
