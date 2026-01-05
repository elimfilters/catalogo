/**
 * ELIMFILTERS® Engineering Core - Detection Service
 * v12.1 - Sincronización Final de Funciones
 */

const donaldsonScraper = require('../../donaldsonScraper'); // Ajusta la ruta si es necesario
const sheetsWriter = require('./sheetsWriter');

const HD_BRANDS = ['CATERPILLAR', 'CAT', 'JOHN DEERE', 'BOBCAT', 'KOMATSU', 'MACK', 'FREIGHTLINER'];

const detectionService = {
    // CAMBIO CRÍTICO: El nombre debe ser findAndProcess para coincidir con tu controlador
    findAndProcess: async (searchTerm, brand, searchType) => {
        try {
            console.log(`🚀 Iniciando protocolo para: ${searchTerm} (${brand})`);

            // 1. Determinar DUTY (HD vs LD)
            const isHD = HD_BRANDS.includes(brand.toUpperCase());
            
            if (isHD) {
                console.log("🛠️ Ejecutando Protocolo HD (Donaldson)...");
                // Llamamos al scraper v17.0
                const trilogy = await donaldsonScraper.getThreeOptions(searchTerm);
                
                if (trilogy && trilogy.length > 0) {
                    // 2. Escribir en Sheets vía el Writer v11.0 (Variable de Entorno)
                    for (const item of trilogy) {
                        await sheetsWriter.writeToMaster(item, searchTerm);
                    }
                    return { success: true, data: trilogy };
                }
            }
            
            return { success: false, error: "No se encontraron equivalentes técnicos." };

        } catch (error) {
            console.error("❌ Error en detectionService:", error.message);
            throw error;
        }
    }
};

// Asegúrate de exportarlo así para que el controlador lo encuentre
module.exports = detectionService;
