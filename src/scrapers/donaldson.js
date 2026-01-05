/**
 * ELIMFILTERS® Engineering Core - Donaldson Scraper
 * v11.0 - Lógica de Productos Alternativos y Trilogía Estricta
 */

const axios = require('axios');
const cheerio = require('cheerio');

const donaldsonScraper = {
    getThreeOptions: async (searchTerm) => {
        try {
            // 1. URL de búsqueda oficial
            const searchUrl = `https://shop.donaldson.com/store/en-us/search?Ntt=${searchTerm}`;
            
            const { data } = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(data);
            let options = [];

            // 2. Extraer Especificaciones Técnicas Base (STANDARD)
            const baseSpecs = {
                Height_mm: parseFloat($('.spec-height').text().replace(/[^0-9.]/g, '')) || 0,
                OuterDiameter_mm: parseFloat($('.spec-outer-diameter').text().replace(/[^0-9.]/g, '')) || 0,
                Efficiency: $('.spec-efficiency').text().trim() || "99.9%"
            };

            // 3. AGREGAR PRODUCTO BASE (STANDARD)
            // Regla: Prefijo + últimos 4 dígitos del código buscado
            options.push({
                tier: "STANDARD",
                code: searchTerm,
                sku_digits: searchTerm.replace(/[^0-9]/g, '').slice(-4),
                claim: "Engineered for everyday operational demands",
                specs: baseSpecs
            });

            // 4. BUSCAR EN TAB "PRODUCTOS ALTERNATIVOS"
            // Buscamos códigos en la sección de alternativas (C125017, etc.)
            const alternativeCodes = [];
            $('.alternative-products-list .product-number, .related-items .sku-id').each((i, el) => {
                const altCode = $(el).text().trim();
                if (altCode && altCode !== searchTerm) {
                    alternativeCodes.push(altCode);
                }
            });

            // 5. ASIGNAR NIVELES (PERFORMANCE / ELITE)
            alternativeCodes.forEach((altCode, index) => {
                // Si es un "Donaldson Blue" o tiene "DB" / "Synteq" en el texto, es ELITE
                const isBlue = altCode.includes('DB') || $('body').text().includes('Synteq');
                
                // Si solo hay una alternativa (como C125017), se asigna a PERFORMANCE
                const tier = (alternativeCodes.length === 1 || !isBlue) ? "PERFORMANCE" : "ELITE";
                
                // Evitamos duplicados de Tier
                if (!options.find(o => o.tier === tier)) {
                    options.push({
                        tier: tier,
                        code: altCode,
                        sku_digits: altCode.replace(/[^0-9]/g, '').slice(-4),
                        claim: tier === "ELITE" ? "Maximum synthetic protection for extreme service" : "Enhanced efficiency and dirt-holding capacity",
                        specs: { ...baseSpecs, Efficiency: tier === "ELITE" ? "99.99%" : "99.9%" }
                    });
                }
            });

            return options;

        } catch (error) {
            console.error("❌ [SCRAPER ERROR]:", error.message);
            // Fallback para no detener el sistema
            return [{
                tier: "STANDARD",
                code: searchTerm,
                sku_digits: searchTerm.slice(-4),
                specs: {}
            }];
        }
    }
};

module.exports = donaldsonScraper;
