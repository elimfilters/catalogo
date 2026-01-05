/**
 * ELIMFILTERS® Engineering Core - Donaldson Scraper
 * v13.0 - Protocolo de Navegación Profunda y Auditoría de Atributos
 */

const axios = require('axios');
const cheerio = require('cheerio');

const donaldsonScraper = {
    getThreeOptions: async (searchTerm) => {
        try {
            // PASO 1: Búsqueda inicial para obtener la URL del producto real
            const searchUrl = `https://shop.donaldson.com/store/en-us/search?Ntt=${searchTerm}`;
            const searchResponse = await axios.get(searchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const $search = cheerio.load(searchResponse.data);

            // Obtenemos el link del primer resultado (Ficha Técnica)
            const productLink = $search('.product-description-wrapper a, .product-list-item a').first().attr('href');
            if (!productLink) throw new Error("Producto no encontrado en Donaldson");

            const productUrl = productLink.startsWith('http') ? productLink : `https://shop.donaldson.com${productLink}`;

            // PASO 2: Navegación Profunda a la Ficha del Producto
            const { data: productPage } = await axios.get(productUrl);
            const $ = cheerio.load(productPage);

            // 1. EXTRACCIÓN DE ATRIBUTOS (TAB ATRIBUTOS)
            const techSpecs = {};
            $('.product-attributes-table tr, .attributes-table tr').each((i, row) => {
                const label = $(row).find('td:first-child').text().trim();
                const value = $(row).find('td:last-child').text().trim();
                if (label && value) techSpecs[label] = value;
            });

            // Validación de Rosca (Candado Mecánico)
            const threadSize = techSpecs['Thread Size'] || techSpecs['Tamaño de la rosca'] || "N/A";

            let options = [];

            // 2. REGISTRO DEL PRODUCTO BASE (STANDARD)
            const baseCode = $('.product-number, .sku-id').first().text().trim() || searchTerm;
            options.push({
                tier: "STANDARD",
                code: baseCode,
                sku_digits: baseCode.replace(/[^0-9]/g, '').slice(-4),
                specs: { ...techSpecs, ThreadSize: threadSize }
            });

            // 3. EXPLORACIÓN DE "PRODUCTOS ALTERNATIVOS" (TAB ALTERNATIVAS)
            // Aquí es donde el sistema encontrará el DBF5810
            $('.alternative-products-list .product-number, .related-items-list .sku-id').each((i, el) => {
                const altCode = $(el).text().trim();
                if (altCode && altCode !== baseCode) {
                    const isElite = altCode.startsWith('DB') || altCode.includes('Blue');
                    
                    options.push({
                        tier: isElite ? "ELITE" : "PERFORMANCE",
                        code: altCode,
                        sku_digits: altCode.replace(/[^0-9]/g, '').slice(-4), // Extrae 5810 del DBF5810
                        specs: { ThreadSize: threadSize, Media: isElite ? "Synteq™" : "Cellulose/Blend" }
                    });
                }
            });

            return options;

        } catch (error) {
            console.error("❌ [SCRAPER v13.0 ERROR]:", error.message);
            return [];
        }
    }
};

module.exports = donaldsonScraper;
