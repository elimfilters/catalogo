// donaldsonScraper.js - v11.0.3
const axios = require('axios');
const cheerio = require('cheerio');

class DonaldsonScraper {
    async search(searchTerm) {
        try {
            const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '');
            const url = `https://shop.donaldson.com/store/en-us/search?Ntt=${cleanTerm}`;
            
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...' }
            });

            const $ = cheerio.load(data);
            const products = [];

            // 1. BUSCAR EN LISTA DE RESULTADOS (Aquí aparecen los Alternativos como P551016)
            $('.product-list-item, .search-result-item, .equivalent-item').each((i, el) => {
                const rawCode = $(el).find('.product-number').text().trim();
                const title = $(el).find('.product-name').text().trim();
                
                if (rawCode) {
                    products.push({
                        originalCode: rawCode,
                        description: title,
                        tier: this.identifyTier(rawCode, title),
                        systemKey: 'LUBE_OIL',
                        specs: this.extractBasicSpecs($, el)
                    });
                }
            });

            // 2. SI ENTRÓ DIRECTO A UNA FICHA, BUSCAR LA TAB DE "ALTERNATIVES"
            if (products.length === 1) {
                // Lógica para raspar la sección de 'Alternative Products' dentro de la ficha
                $('.alternative-product-item').each((i, el) => {
                    const altCode = $(el).find('.alt-code').text().trim();
                    if (altCode) products.push({ originalCode: altCode, ... });
                });
            }

            return products;
        } catch (error) { return []; }
    }

    identifyTier(code, name) {
        if (code.startsWith('DBL')) return 'ELITE';
        if (name.toLowerCase().includes('standard') || code.startsWith('P554') || code === 'P551016') return 'STANDARD';
        return 'PERFORMANCE';
    }
}
module.exports = new DonaldsonScraper();
