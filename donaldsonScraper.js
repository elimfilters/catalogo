const axios = require('axios');
const cheerio = require('cheerio');

class DonaldsonScraper {
    async search(searchTerm) {
        try {
            const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '');
            
            // LA LLAVE MAESTRA: Forzamos la búsqueda dentro del portafolio de Motores (N=4130398073)
            const masterUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${cleanTerm}&N=4130398073&catNav=true`;
            
            const { data: searchPage } = await axios.get(masterUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            const $search = cheerio.load(searchPage);
            
            // 1. Buscamos el link del producto dentro del portafolio de Motores
            const resultLink = $search('.product-list-item a, .search-result-item a, .product-name a').first().attr('href');

            if (resultLink) {
                const detailUrl = resultLink.startsWith('http') ? resultLink : `https://shop.donaldson.com${resultLink}`;
                console.log(`✅ Accediendo al Portafolio: ${detailUrl}`);
                
                const { data: detailPage } = await axios.get(detailUrl);
                return this.extractFullData(cheerio.load(detailPage));
            }

            // Si entra directo por ser un código exacto (p527682)
            if ($search('.product-specification-table').length > 0) {
                return this.extractFullData($search);
            }

            return [];
        } catch (error) {
            console.error("❌ Error en Portafolio Donaldson:", error.message);
            return [];
        }
    }

    extractFullData($) {
        const results = [];
        const mainCode = $('.product-number').first().text().trim();
        const specs = {};

        // Extraer la tabla técnica del portafolio
        $('.product-specification-table tr').each((i, el) => {
            const key = $(el).find('td:first-child').text().trim().replace(':', '');
            const value = $(el).find('td:last-child').text().trim();
            if (key && value) specs[key] = value;
        });

        if (mainCode) {
            results.push({
                originalCode: mainCode,
                description: $('.product-name').first().text().trim(),
                tier: this.identifyTier(mainCode),
                systemKey: 'LUBE_OIL',
                specs: specs
            });

            // Extraer Alternativos (DBL3998, P551016) que siempre están en este portafolio
            $('.alternative-product-item, .equivalent-item, .search-result-item').each((i, el) => {
                const altCode = $(el).find('.product-number, .alt-code').text().trim();
                if (altCode && altCode !== mainCode) {
                    results.push({
                        originalCode: altCode,
                        tier: this.identifyTier(altCode),
                        specs: specs,
                        systemKey: 'LUBE_OIL'
                    });
                }
            });
        }
        return results;
    }

    identifyTier(code) {
        if (code.startsWith('DBL')) return 'ELITE';
        if (code.startsWith('P554') || code === 'P551016') return 'STANDARD';
        return 'PERFORMANCE';
    }
}
module.exports = new DonaldsonScraper();
