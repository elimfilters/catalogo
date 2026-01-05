const axios = require('axios');
const cheerio = require('cheerio');

class DonaldsonScraper {
    async search(searchTerm) {
        try {
            const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '');
            const url = `https://shop.donaldson.com/store/en-us/search?Ntt=${cleanTerm}`;
            
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            const $ = cheerio.load(data);
            const products = [];

            // 1. EXTRAER MÚLTIPLES PRODUCTOS (Caso Aceite HD con 3 niveles)
            const productItems = $('.product-list-item, .search-result-item');
            
            if (productItems.length > 0) {
                productItems.each((i, el) => {
                    const rawCode = $(el).find('.product-number').text().trim();
                    const title = $(el).find('.product-name').text().trim();
                    
                    if (rawCode) {
                        products.push({
                            originalCode: rawCode,
                            description: title,
                            tier: this.identifyTier(rawCode, title),
                            systemKey: 'LUBE_OIL', // Default para HD Oil
                            specs: this.extractBasicSpecs($, el),
                            source: 'Donaldson Mirror'
                        });
                    }
                });
            } else {
                // 2. CASO PRODUCTO ÚNICO (Entra directo a la ficha)
                const mainCode = $('.product-number').first().text().trim();
                if (mainCode) {
                    products.push({
                        originalCode: mainCode,
                        description: $('.product-name').first().text().trim(),
                        tier: 'PERFORMANCE',
                        systemKey: 'LUBE_OIL',
                        specs: this.extractDeepSpecs($),
                        source: 'Donaldson Mirror'
                    });
                }
            }
            return products;
        } catch (error) { return []; }
    }

    identifyTier(code, name) {
        if (code.startsWith('DBL')) return 'ELITE';
        if (name.toLowerCase().includes('standard') || code.startsWith('P554')) return 'STANDARD';
        return 'PERFORMANCE';
    }

    extractDeepSpecs($) {
        const specs = {};
        $('.product-specification-table tr').each((i, el) => {
            const key = $(el).find('td:first-child').text().trim().replace(':', '');
            const value = $(el).find('td:last-child').text().trim();
            if (key && value) specs[key] = value;
        });
        return specs;
    }

    extractBasicSpecs($, el) {
        // Captura rápida de hilos y OD desde la lista si están disponibles
        return {
            "Thread Size": $(el).find('.spec-thread').text().trim() || "See Detail",
            "Outer Diameter": $(el).find('.spec-od').text().trim() || "N/A"
        };
    }
}
module.exports = new DonaldsonScraper();
