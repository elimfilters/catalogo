const axios = require('axios');
const cheerio = require('cheerio');

class DonaldsonScraper {
    async search(searchTerm) {
        try {
            const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '');
            // Accedemos a la tienda en español como en tus capturas
            const url = `https://shop.donaldson.com/store/es-us/search?Ntt=${cleanTerm}`;
            
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            const $ = cheerio.load(data);
            
            // ESCENARIO 1: Si ya estamos en la ruta final (como en tu image_ab30e5.png)
            if ($('.product-specification-table').length > 0 || $('.product-number').length > 0) {
                console.log("✅ Ruta de producto detectada directamente");
                return this.extractFromDetailPage($);
            }

            // ESCENARIO 2: Si hay que "pulsar" el resultado (como en tu image_ab2d21.png)
            const productLink = $('.product-list-item a, .search-result-item a, .product-name a').first().attr('href');
            if (productLink) {
                console.log(`🔗 Siguiendo ruta hacia el código Donaldson: ${productLink}`);
                const detailUrl = productLink.startsWith('http') ? productLink : `https://shop.donaldson.com${productLink}`;
                const { data: detailData } = await axios.get(detailUrl);
                return this.extractFromDetailPage(cheerio.load(detailData));
            }

            return [];
        } catch (error) { 
            console.error("❌ Error en Scraper:", error.message);
            return []; 
        }
    }

    extractFromDetailPage($) {
        const results = [];
        const mainCode = $('.product-number').first().text().trim(); // El P552100 de tu imagen
        const specs = {};

        // Extraer la tabla de atributos técnicos
        $('.product-specification-table tr').each((i, el) => {
            const key = $(el).find('td:first-child').text().trim().replace(':', '');
            const value = $(el).find('td:last-child').text().trim();
            if (key && value) specs[key] = value;
        });

        if (mainCode) {
            // Producto principal
            results.push({
                originalCode: mainCode,
                description: $('.product-name').first().text().trim(),
                tier: this.identifyTier(mainCode),
                systemKey: 'LUBE_OIL',
                specs: specs,
                source: 'Donaldson Mirror'
            });

            // Capturar la "Trilogía" (Alternativos como DBL3998 o P551016)
            $('.alternative-product-item, .equivalent-item').each((i, el) => {
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
