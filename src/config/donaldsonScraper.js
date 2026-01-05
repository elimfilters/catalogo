/**
 * ELIMFILTERS® Engineering Core - Donaldson Scraper
 * v15.0 - Auditoría Total y Mapeo de Tecnologías Propietarias
 */

const axios = require('axios');
const cheerio = require('cheerio');
const homologationMap = require('../config/homologation_map.json'); // Tu archivo JSON

const donaldsonScraper = {
    getThreeOptions: async (searchTerm) => {
        try {
            // 1. NAVEGACIÓN PROFUNDA: Obtener la URL real del producto
            const searchUrl = `https://shop.donaldson.com/store/en-us/search?Ntt=${searchTerm}`;
            const searchResponse = await axios.get(searchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const $search = cheerio.load(searchResponse.data);
            const productLink = $search('.product-description-wrapper a, .product-list-item a').first().attr('href');

            if (!productLink) throw new Error("Producto no identificado en Donaldson.");

            const productUrl = productLink.startsWith('http') ? productLink : `https://shop.donaldson.com${productLink}`;

            // 2. ENTRADA A LA FICHA TÉCNICA (Tabs de Atributos y Alternativas)
            const { data: productPage } = await axios.get(productUrl);
            const $ = cheerio.load(productPage);

            // 3. EXTRACCIÓN DE ATRIBUTOS PARA LAS 59 COLUMNAS
            const techSpecs = {};
            $('.product-attributes-table tr, .attributes-table tr').each((i, row) => {
                const label = $(row).find('td:first-child').text().trim();
                const value = $(row).find('td:last-child').text().trim();
                if (label && value) techSpecs[label] = value;
            });

            // 4. AUDITORÍA SEMÁNTICA (Determinación del Sistema)
            const productTitle = $('.product-title, h1').text().toUpperCase();
            const productDesc = $('.product-description').text().toUpperCase();
            const fullDescription = `${productTitle} ${productDesc}`;

            let systemKey = "FUEL_SYSTEM"; // Default
            if (fullDescription.includes("SEPARADOR DE AGUA") || fullDescription.includes("WATER SEPARATOR")) {
                systemKey = "FUEL_SEPARATOR";
            } else if (fullDescription.includes("LUBE") || fullDescription.includes("OIL")) {
                systemKey = "LUBE_OIL";
            } else if (fullDescription.includes("AIR") && !fullDescription.includes("DRYER")) {
                systemKey = "AIR_SYSTEM";
            } else if (fullDescription.includes("HYDRAULIC")) {
                systemKey = "HYDRAULIC_SYS";
            }
            // Agregar más reglas según sea necesario...

            // 5. HOMOLOGACIÓN ELIMFILTERS® (Uso del MAPA OFICIAL)
            const mapping = homologationMap.TECHNOLOGY_HOMOLOGATION_MAP.MAPPING_RULES[systemKey];
            const prefix = mapping.pref; // ej: ES9, EF9, EA1
            const technology = mapping.tech; // ej: AQUAGUARD®, SYNTEPORE™
            const isoStandard = mapping.iso; // ej: ISO 4020, ISO 19438

            let options = [];
            const baseCode = $('.product-number, .sku-id').first().text().trim() || searchTerm;

            // Fila 1: STANDARD
            options.push({
                tier: "STANDARD",
                code: baseCode,
                sku: `${prefix}${baseCode.replace(/[^0-9]/g, '').slice(-4)}`,
                technology: technology,
                iso: isoStandard,
                specs: { ...techSpecs, SpecialFeatures: systemKey }
            });

            // 6. EXTRACCIÓN DE ALTERNATIVAS REALES (Sin Alucinaciones)
            $('.alternative-products-list .product-number, .related-items-list .sku-id').each((i, el) => {
                const altCode = $(el).text().trim();
                if (altCode && altCode !== baseCode) {
                    const isElite = altCode.startsWith('DB') || altCode.includes('Blue');
                    options.push({
                        tier: isElite ? "ELITE" : "PERFORMANCE",
                        code: altCode,
                        sku: `${prefix}${altCode.replace(/[^0-9]/g, '').slice(-4)}`,
                        technology: technology, // Hereda la tecnología homologada
                        iso: isoStandard,
                        specs: { ...techSpecs, Media: isElite ? technology : "Premium Cellulose" }
                    });
                }
            });

            return options;

        } catch (error) {
            console.error("❌ [ELIMFILTERS SCRAPER ERROR]:", error.message);
            return [];
        }
    }
};

module.exports = donaldsonScraper;
