const axios = require('axios');
const cheerio = require('cheerio');

class DonaldsonScraper {
    async search(searchTerm) {
        try {
            const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '');
            const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${cleanTerm}`;
            
            const { data: searchPage } = await axios.get(searchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            const $search = cheerio.load(searchPage);
            
            // 1. IDENTIFICAR EL "BOTÓN" O LINK (Lo que señalas en image_ab2d21.png)
            const resultLink = $search('.product-list-item a, .search-result-item a, .product-name a').first().attr('href');

            if (resultLink) {
                // 2. "PULSAR" PARA ENTRAR A LA RUTA (Como se ve en image_ab30e5.png)
                const detailUrl = resultLink.startsWith('http') ? resultLink : `https://shop.donaldson.com${resultLink}`;
                const { data: detailPage } = await axios.get(detailUrl);
                const $detail = cheerio.load(detailPage);

                return this.extractFullData($detail);
            }

            return [];
        } catch (error) {
            console.error("❌ Error en Navegación Donaldson:", error.message);
            return [];
        }
    }

    extractFullData($) {
        const results = [];
        const mainCode = $('.product-number').first().text().trim(); // Ej: P552100
        
        // Extraer Atributos (Especificaciones)
        const specs = {};
        $('.product-specification-table tr').each((i, el) => {
            const key = $(el).find('td:first-child').text().trim().replace(':', '');
            const value = $(el).find('td:last-child').text().trim();
            if (key && value) specs[key] = value;
        });

        if (mainCode) {
            // Producto Principal (Performance)
            results.push({
                originalCode: mainCode,
                description: $('.product-name').first().text().trim(),
                tier: 'PERFORMANCE',
                systemKey: 'LUBE_OIL',
                specs: specs
            });

            // Leer pestaña de "Productos alternativos" para DBL3998 y P551016
            $('.alternative-product-item, .equivalent-item').each((i, el) => {
                const altCode = $(el).find('.product-number, .alt-code').text().trim();
                if (altCode) {
                    results.push({
                        originalCode: altCode,
                        tier: altCode.startsWith('DBL') ? 'ELITE' : 'STANDARD',
                        specs: specs, // Comparten dimensiones
                        systemKey: 'LUBE_OIL'
                    });
                }
            });
        }
        return results;
    }
}
module.exports = new DonaldsonScraper();
