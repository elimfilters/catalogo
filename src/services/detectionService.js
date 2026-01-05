/**
 * ELIMFILTERS® Engineering Core - Detection Service
 * v12.5 - Sincronización de Rutas y Auditoría HD/LD
 */

// ✅ LÍNEA 6 CORREGIDA: Sube un nivel y entra en scrapers
const donaldsonScraper = require('../scrapers/donaldsonScraper'); 
const sheetsWriter = require('./sheetsWriter');

// Listas de Auditoría Técnica para determinar el DUTY
const HD_BRANDS = ['CATERPILLAR', 'CAT', 'JOHN DEERE', 'BOBCAT', 'KOMATSU', 'MACK', 'FREIGHTLINER', 'CUMMINS', 'PERKINS'];
const LD_BRANDS = ['FORD', 'TOYOTA', 'BMW', 'MERCEDES BENZ', 'NISSAN', 'CHEVROLET', 'HONDA', 'HYUNDAI', 'MAZDA'];

const detectionService = {
    /**
     * findAndProcess: Orquestador principal de búsqueda
     * Coincide exactamente con la llamada desde server.js
     */
    findAndProcess: async (searchTerm, brand, searchType) => {
        try {
            console.log(`🚀 [ELIMFILTERS ENGINE]: Procesando ${searchTerm} para marca: ${brand}`);

            const brandUpper = brand ? brand.toUpperCase() : "";
            const isHD = HD_BRANDS.includes(brandUpper);
            const isLD = LD_BRANDS.includes(brandUpper);

            let trilogy = [];

            // 1. DETERMINACIÓN DE PROTOCOLO (HD vs LD)
            if (isHD) {
                console.log("🚛 [AUDITORÍA HD]: Activando Donaldson Scraper...");
                trilogy = await donaldsonScraper.getThreeOptions(searchTerm);
            } 
            else if (isLD) {
                console.log("🚗 [AUDITORÍA LD]: Activando Protocolo FRAM (Simulado)...");
                // Por ahora usamos Donaldson hasta que subamos el framScraper.js
                trilogy = await donaldsonScraper.getThreeOptions(searchTerm);
            } 
            else {
                // Si la marca no está en las listas, aplicamos HD por seguridad de ingeniería
                console.log("⚠️ Marca no clasificada. Aplicando Protocolo HD por defecto.");
                trilogy = await donaldsonScraper.getThreeOptions(searchTerm);
            }

            // 2. REGISTRO INSTITUCIONAL (Google Sheets 56 Columnas)
            if (trilogy && trilogy.length > 0) {
                console.log(`📊 [WRITER]: Registrando ${trilogy.length} opciones en MASTER_UNIFIED_V5...`);
                for (const item of trilogy) {
                    // El sheetsWriter v11.0 ya usa la variable de entorno segura de Railway
                    await sheetsWriter.writeToMaster(item, searchTerm);
                }
                return { success: true, data: trilogy };
            }

            return { success: false, error: "No se encontraron resultados técnicos en el catálogo." };

        } catch (error) {
            console.error("❌ [DETECTION SERVICE ERROR]:", error.message);
            throw error; // Lanza el error para que el controlador lo capture
        }
    }
};

// EXPORTACIÓN CRÍTICA PARA server.js
module.exports = detectionService;
