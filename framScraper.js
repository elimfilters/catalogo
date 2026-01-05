const axios = require('axios');
const cheerio = require('cheerio');

/**
 * FRAM Mirror Scraper v11.0
 * Especializado en Light Duty (LD) - Extracción técnica profunda
 */
class FramScraper {
    constructor() {
        // URL base de búsqueda por referencia cruzada
        this.searchUrl = 'https://www.fram.com/search-results';
    }

    async search(searchTerm) {
        try {
            // 1. Limpieza de términos para el "Espejo"
            const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '');
            console.log(`🔍 FRAM Mirror: Buscando LD para ${cleanTerm}`);

            const { data } = await axios.get(`${this.searchUrl}?q=${cleanTerm}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const $ = cheerio.load(data);
            const specs = {};

            // 2. Navegación y Extracción (Mapeo de Atributos)
            // FRAM suele organizar sus especificaciones en listas de detalles técnicos
            $('.product-specs-list li, .specs-table tr').each((i, el) => {
                const label = $(el).find('.spec-label, th').text().trim().replace(':', '');
                const value = $(el).find('.spec-value, td').text().trim();
                
                if (label && value) {
                    specs[label] = value;
                }
            });

            // 3. Formateo "Espejo" para ElimFilters
            return [{
                code: cleanTerm,
                description: $('.product-title').text().trim() || `FRAM LD Filter ${cleanTerm}`,
                // Mapeo dinámico para la imagen de referencia aprobada
                specifications: {
                    thread_size: specs['Thread Size'] || specs['Threads'] || 'N/A',
                    outer_diameter: specs['Outer Diameter'] || specs['OD'] || 'N/A',
                    length: specs['Height'] || 'N/A',
                    media_type: specs['Media'] || 'Cellulose',
                    efficiency: specs['Efficiency'] || '95% @ 20 Microns',
                    pressure_valve: specs['Bypass Valve'] || 'Yes'
                },
                // Atributos para lógica de negocio v11
                microns: this.parseMicrons(specs['Efficiency'] || ''),
                systemKey: this.identifyCategory(cleanTerm),
                source: 'FRAM Mirror'
            }];

        } catch (error) {
            console.error(`❌ FRAM Scraper Error: ${error.message}`);
            return [];
        }
    }

    parseMicrons(text) {
        const match = text.match(/(\d+)\s*micron/i);
        return match ? match[1] : 20; // Default LD
    }

    identifyCategory(code) {
        // Lógica simple para clasificar PH (Lube), CA (Air), etc.
        if (code.startsWith('PH') || code.startsWith('CH')) return 'LUBE_OIL';
        if (code.startsWith('CA')) return 'AIR_SYSTEM';
        return 'LUBE_OIL';
    }
}

module.exports = new FramScraper();
