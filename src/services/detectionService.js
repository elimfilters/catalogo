/**
 * ELIMFILTERS® Engineering Core - Detection Service
 * v12.0 - Auditoría de Duty y Búsqueda Cruzada
 */

const donaldsonScraper = require('../scrapers/donaldsonScraper');
const mongoService = require('./mongoService'); // Verifica en MongoDB
const sheetsService = require('./sheetsService'); // Verifica en Sheets
const sheetsWriter = require('./sheetsWriter');

const HD_BRANDS = ['CATERPILLAR', 'CAT', 'JOHN DEERE', 'BOBCAT', 'KOMATSU', 'MACK', 'FREIGHTLINER', 'PERKINS'];

const detectionService = {
    processSearch: async (query, userBrand) => {
        // PASO 1: Búsqueda previa en Base de Datos y Sheets
        const existingData = await mongoService.findByOriginalCode(query);
        if (existingData) return existingData; // Devuelve al plugin Parte 2

        // PASO 2: Determinar DUTY
        const duty = HD_BRANDS.includes(userBrand.toUpperCase()) ? 'HD' : 'LD';
        console.log(`🔍 Duty Detectado: ${duty} para la marca ${userBrand}`);

        let crossResults = [];
        if (duty === 'HD') {
            // Activa Protocolo Donaldson (HD)
            crossResults = await donaldsonScraper.getThreeOptions(query);
        } else {
            // Activa Protocolo FRAM (LD) - Requiere FramScraper.js
            // crossResults = await framScraper.getThreeOptions(query);
            console.log("⚠️ Scraper FRAM en desarrollo.");
        }

        // PASO 3: Creación de Trilogía y Registro en Sheet
        if (crossResults.length > 0) {
            for (const item of crossResults) {
                // El sheetsWriter v11.0 ya aplica el rowMapper de 56 columnas
                await sheetsWriter.writeToMaster(item, query);
            }
        }

        return crossResults;
    }
};

module.exports = detectionService;
