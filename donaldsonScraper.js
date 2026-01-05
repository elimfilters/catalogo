const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Donaldson Mirror Scraper v11.0
 * Capacidad de extracción profunda de especificaciones técnicas
 */
class DonaldsonScraper {
    constructor() {
        this.baseUrl = 'https://shop.donaldson.com/store/en-us/search';
    }

    async search(searchTerm) {
        try {
            // 1. Limpieza de código para búsqueda espejo
            const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '');
            const searchUrl = `${this.baseUrl}?Ntt=${cleanTerm}`;

            const { data } = await axios.get(searchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 ...' } // Evitar bloqueos
            });

            const $ = cheerio.load(data);
            const specs = {};

            // 2. Extracción de Atributos (Mapeo Espejo)
            // Buscamos en la tabla de especificaciones técnica de la página
            $('.product-specification-table tr').each((i, row) => {
                const label = $(row).find('.label').text().trim();
                const value = $(row).find('.value').text().trim();
                
                if (label && value) {
                    specs[label] = value;
                }
            });

            // 3. Formateo para la ficha técnica de ElimFilters
            return [{
                code: cleanTerm,
                description: $('.product-name').text().trim() || `Donaldson Filter ${cleanTerm}`,
                // Mapeo directo para tu imagen de referencia
                specs: {
                    thread_size: specs['Thread Size'] || 'N/A',
                    outer_diameter: specs['Outer Diameter'] || specs['OD'] || 'N/A',
                    length: specs['Length'] || 'N/A',
                    media_type: specs['Media Type'] || 'Cellulose',
                    efficiency: specs['Efficiency 99%'] || specs['Efficiency'] || 'N/A',
                    pressure_valve: specs['Bypass Valve'] || 'No'
                },
                // Determinamos micras para la lógica de Tiers
                microns: this.extractMicrons(specs['Efficiency 99%'] || ''),
                systemKey: this.detectSystemKey(specs['Primary Application'] || ''),
                source: 'Donaldson Mirror'
            }];

        } catch (error) {
            console.error(`❌ Donaldson Scraper Error: ${error.message}`);
            return [];
        }
    }

    // Helper para determinar el micraje
    extractMicrons(text) {
        const match = text.match(/(\d+)\s*micron/i);
        return match ? match[1] : 21; // Default Performance
    }

    // Helper para asignar familia (Lube, Fuel, etc.)
    detectSystemKey(appText) {
        if (appText.toLowerCase().includes('lube')) return 'LUBE_OIL';
        if (appText.toLowerCase().includes('fuel')) return 'FUEL_SYSTEM';
        return 'LUBE_OIL'; // Fallback
    }
}

module.exports = new DonaldsonScraper();
