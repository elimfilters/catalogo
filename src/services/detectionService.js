/**
 * ELIMFILTERS® Engineering Core - Detection Service
 * v12.6 - Sincronización de Rutas y Soporte HD/LD
 */

// RUTAS CORREGIDAS: Asegúrate que el archivo se llame donaldsonScraper.js (minúsculas)
const donaldsonScraper = require('../scrapers/donaldsonScraper'); 
const sheetsWriter = require('./sheetsWriter');

// Diccionarios para Auditoría de Duty
const HD_BRANDS = ['CATERPILLAR', 'CAT', 'JOHN DEERE', 'BOBCAT', 'KOMATSU', 'MACK', 'FREIGHTLINER', 'CUMMINS'];
const LD_BRANDS = ['FORD', 'TOYOTA', 'BMW', 'MERCEDES BENZ', 'NISSAN', 'CHEVROLET', 'MAZDA', 'HONDA'];

const detectionService = {
    // Nombre exacto que busca tu server.js
    findAndProcess: async (searchTerm, brand, searchType) => {
        try {
            console.log(`🔍 Iniciando protocolo para: ${searchTerm} (${brand})`);
            const brandUpper = brand ? brand.toUpperCase() : "";
            
            let results = [];

            // 1. DETERMINACIÓN DE RUTA (HD vs LD)
            if (HD_BRANDS.includes(brandUpper) || brandUpper === "") {
                console.log("🚛 [DUTY: HD] Ejecutando Protocolo Donaldson...");
                results = await donaldsonScraper.getThreeOptions(searchTerm);
            } else if (LD_BRANDS.includes(brandUpper)) {
                console.log("🚗 [DUTY: LD] Ejecutando Protocolo FRAM (Simulado)...");
                // Mientras desarrollamos el framScraper, usamos Donaldson como respaldo técnico
                results = await donaldsonScraper.getThreeOptions(searchTerm);
            }

            // 2. REGISTRO EN MASTER SHEET (56 Columnas)
            if (results && results.length > 0) {
                for (const item of results) {
                    // sheetsWriter v11.0 configurado con variables de entorno
                    await sheetsWriter.writeToMaster(item, searchTerm);
                }
                return { success: true, data: results };
            }

            return { success: false, error: "No se encontraron equivalentes técnicos." };

        } catch (error) {
            console.error("❌ [DETECTION SERVICE ERROR]:", error.message);
            throw error;
        }
    }
};

module.exports = detectionService;
