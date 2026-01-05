// src/services/detectionService.js - Integración con Scraper v11.0.7

const donaldsonScraper = require('../scrapers/donaldsonScraper');
const mongoService = require('./mongoService');
const googleSheetsService = require('./googleSheetsService');

const PREFIX_MAP = { LUBE_OIL: 'EL8', AIR_SYSTEM: 'EA1' }; // Basado en lógica previa

class DetectionService {
    async processSearch(searchTerm) {
        try {
            // 1. Verificar caché para no repetir procesos exitosos
            const cached = await mongoService.getFiltersByInput(searchTerm);
            if (cached && cached.length > 0) return { success: true, source: 'cached', data: cached };

            // 2. Ejecutar Scraper Maestro (Abre la "Caja Fuerte")
            const scraperData = await donaldsonScraper.search(searchTerm);
            if (!scraperData || !scraperData.mainProduct.code) {
                throw new Error('No cross-references found in Master Portfolio');
            }

            // 3. Consolidar la Trilogía (Principal + Alternativos)
            const productsToProcess = [
                scraperData.mainProduct,
                ...scraperData.alternatives
            ];

            // 4. Mapear a la estructura de ElimFilters
            const skuData = productsToProcess.map(product => {
                const system = product.code.startsWith('P52') ? 'AIR_SYSTEM' : 'LUBE_OIL';
                const prefix = PREFIX_MAP[system] || 'EL8';
                const last4Digits = product.code.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');

                return {
                    sku: `${prefix}${last4Digits}`,
                    tier: product.tier,
                    cross_references: product.code,
                    description: product.description,
                    specifications: scraperData.specifications, // Compartidas por la familia
                    equipment_applications: scraperData.equipment.map(e => `${e.equipment} ${e.engine}`).join(' | '),
                    oem_codes: scraperResult.crossReferences.map(r => `${r.brand} ${r.code}`).join(', '),
                    source: 'Donaldson Master Portfolio'
                };
            });

            // 5. Guardado Masivo (MongoDB y Google Sheets)
            await Promise.all([
                mongoService.saveFilters(searchTerm, skuData),
                googleSheetsService.writeMasterRow(searchTerm, skuData)
            ]);

            return { success: true, source: 'generated', data: skuData };

        } catch (error) {
            console.error(`❌ Error en Servicio Maestro:`, error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new DetectionService();
