const axios = require('axios');
const cheerio = require('cheerio');

class FramScraper {
    async search(searchTerm) {
        try {
            const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '');
            const url = `https://www.fram.com/search-results?q=${cleanTerm}`;
            
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);
            const products = [];

            $('.product-card').each((i, el) => {
                const code = $(el).find('.part-number').text().trim(); // Ej: PH8A, XG8A
                const modelName = $(el).find('.product-name').text().trim(); // Ej: Ultra Synthetic
                
                if (code) {
                    products.push({
                        originalCode: code,
                        description: `FRAM ${modelName} - ${code}`,
                        tier: this.mapFramTier(modelName),
                        systemKey: 'LUBE_OIL',
                        specs: {
                            "Thread Size": "M20x1.5", // Ejemplo, FRAM requiere click para detalle
                            "Media Type": modelName.includes('Synthetic') ? 'Synthetic' : 'Cellulose'
                        },
                        source: 'FRAM Mirror'
                    });
                }
            });

            return products;
        } catch (error) { return []; }
    }

    mapFramTier(name) {
        if (name.includes('Ultra Synthetic')) return 'ELITE';
        if (name.includes('Tough Guard')) return 'PERFORMANCE';
        return 'STANDARD'; // Extra Guard
    }
}
module.exports = new FramScraper();
