const axios = require('axios');
const cheerio = require('cheerio');

class DonaldsonScraper {
    async search(searchTerm) {
        try {
            const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '');
            // PASO 1: Barra de búsqueda (Input del código de competencia)
            const url = `https://shop.donaldson.com/store/en-us/search?Ntt=${cleanTerm}`;
            
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            const $ = cheerio.load(data);
            const results = [];

            // PASO 2: Identificar el/los filtros Donaldson que aparecen (P552100, etc.)
            const productLinks = $('.product-list-item, .search-result-item');

            if (productLinks.length > 0) {
                // Si hay varios (Alternativos), recorremos cada uno para simular el "pulsar"
                for (let i = 0; i < productLinks.length; i++) {
                    const el = productLinks[i];
                    const realCode = $(el).find('.product-number').text().trim();
                    const name = $(el).find('.product-name').text().trim();
                    
                    if (realCode) {
                        // PASO 3: Extraemos la información desplegada
                        results.push({
                            originalCode: realCode,
                            description: name,
                            tier: this.identifyTier(realCode, name),
                            systemKey: 'LUBE_OIL',
                            specs: this.extractBasicSpecs($, el)
                        });
                    }
                }
            }
            return results;
        } catch (error) { return []; }
    }

    identifyTier(code, name) {
        if (code.startsWith('DBL')) return 'ELITE';
        if (name.toLowerCase().includes('standard') || code === 'P551016') return 'STANDARD';
        return 'PERFORMANCE';
    }

    extractBasicSpecs($, el) {
        // Simula leer la información desplegada (Thread, OD, etc.)
        return {
            "thread_size": $(el).find('td:contains("Thread") + td, .spec-thread').text().trim() || "See Detail",
            "outer_diameter": $(el).find('td:contains("Outer") + td, .spec-od').text().trim() || "N/A",
            "media_type": $(el).find('td:contains("Media") + td').text().trim() || "Cellulose"
        };
    }
}
module.exports = new DonaldsonScraper();
