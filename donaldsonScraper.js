const axios = require('axios');
const cheerio = require('cheerio');

class DonaldsonScraper {
    async search(searchTerm) {
        try {
            const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '');
            // Buscamos en la sección de Cross Reference de Donaldson
            const url = `https://shop.donaldson.com/store/en-us/search?Ntt=${cleanTerm}`;
            
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            const $ = cheerio.load(data);
            const products = [];

            // REGLA: ¿Donaldson encontró un cruce directo?
            const crossRefMatch = $('.competitive-cross-reference-item, .cross-reference-match').first();
            let mainCode = crossRefMatch.find('.product-number').text().trim();
            
            if (!mainCode) {
                // Si no hay mensaje de "Cross Reference", buscamos en los resultados normales
                mainCode = $('.product-number').first().text().trim();
            }

            if (mainCode) {
                console.log(`✅ Cruce encontrado: ${searchTerm} -> ${mainCode}`);
                
                // Una vez que tenemos el código de Donaldson (P552100), 
                // hacemos una SEGUNDA búsqueda para obtener sus ALTERNATIVOS reales
                return await this.fetchProductAndAlternatives(mainCode);
            }

            return [];
        } catch (error) { return []; }
    }

    async fetchProductAndAlternatives(donaldsonCode) {
        const url = `https://shop.donaldson.com/store/en-us/search?Ntt=${donaldsonCode}`;
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const results = [];

        // Capturamos todos los alternativos que Donaldson liste (P552100, P551016, DBL3998)
        $('.product-list-item, .search-result-item').each((i, el) => {
            const code = $(el).find('.product-number').text().trim();
            const name = $(el).find('.product-name').text().trim();
            
            if (code) {
                results.push({
                    originalCode: code,
                    description: name,
                    tier: code.startsWith('DBL') ? 'ELITE' : 
                          (name.includes('Standard') || code.startsWith('P554')) ? 'STANDARD' : 'PERFORMANCE',
                    systemKey: 'LUBE_OIL',
                    specs: this.extractBasicSpecs($, el),
                    source: 'Donaldson Mirror'
                });
            }
        });

        return results;
    }

    extractBasicSpecs($, el) {
        return {
            "Thread Size": $(el).find('.spec-thread').text().trim() || "See Detail",
            "Outer Diameter": $(el).find('.spec-od').text().trim() || "N/A"
        };
    }
}
module.exports = new DonaldsonScraper();
