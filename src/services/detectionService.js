/**
 * ELIMFILTERS® Engineering Core - Detection Service
 * v12.3 - Sincronización Final HD/LD
 */

const donaldsonScraper = require('../../donaldsonScraper');
const sheetsWriter = require('./sheetsWriter');

// Diccionarios de Auditoría para determinar DUTY
const HD_BRANDS = ['CATERPILLAR', 'CAT', 'JOHN DEERE', 'BOBCAT', 'KOMATSU', 'MACK', 'FREIGHTLINER', 'CUMMINS', 'PERKINS'];
const LD_BRANDS = ['FORD', 'TOYOTA', 'BMW', 'MERCEDES BENZ', 'NISSAN', 'CHEVROLET', 'HONDA', 'HYUNDAI'];

const detectionService = {
    // EL NOMBRE DEBE SER EXACTAMENTE ESTE:
    findAndProcess: async (searchTerm, brand, searchType) => {
        try {
            console.log(`🚀 Procesando búsqueda: ${searchTerm} para marca: ${brand}`);

            const brandUpper = brand ? brand.toUpperCase() : "";
            const isHD = HD_BRANDS.includes(brandUpper);
            const isLD = LD_BRANDS.includes(brandUpper);

            let results = [];

            // 1. RUTA HD (Donaldson)
            if (isHD || (!isHD && !isLD)) {
                console.log("🚛 [DUTY: HD] Activando Protocolo Donaldson...");
                results = await donaldsonScraper.getThreeOptions(searchTerm);
            } 
            // 2. RUTA LD (FRAM)
            else if (isLD) {
                console.log("🚗 [DUTY: LD] Activando Protocolo FRAM...");
                // Aquí se llamaría al framScraper.getThreeOptions(searchTerm);
                // Por ahora, redirigimos a Donaldson si el scraper de FRAM no está listo
                results = await donaldsonScraper.getThreeOptions(searchTerm);
            }

            // 3. REGISTRO EN GOOGLE SHEETS (56 Columnas)
            if (results && results.length > 0) {
                for (const item of results) {
                    await sheetsWriter.writeToMaster(item, searchTerm);
                }
                return { success: true, data: results };
            }

            return { success: false, error: "No se encontraron equivalentes técnicos." };

        } catch (error) {
            console.error("❌ Error en detectionService Core:", error.message);
            throw error; // Permite que el controlador capture el error
        }
    }
};

// EXPORTACIÓN CRÍTICA PARA QUE server.js LO RECONOZCA
module.exports = detectionService;
