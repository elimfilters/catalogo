const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const homologationMap = require('../config/homologation_map.json');

const donaldsonScraper = {
    getThreeOptions: async (searchTerm) => {
        try {
            // A1. Búsqueda Inicial
            const searchUrl = `https://shop.donaldson.com/store/en-us/search?Ntt=${searchTerm}`;
            const { data: searchHtml } = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $search = cheerio.load(searchHtml);
            
            const productPath = $search('.product-description-wrapper a').first().attr('href');
            if (!productPath) return [];

            // A2. Navegación a Ficha Técnica
            const productUrl = `https://shop.donaldson.com${productPath}`;
            const { data: productHtml } = await axios.get(productUrl);
            const $ = cheerio.load(productHtml);

            // A3. Extracción masiva de Atributos (Las 59 columnas)
            const techSpecs = {};
            $('.product-attributes-table tr, .attributes-table tr').each((i, row) => {
                const label = $(row).find('td:first-child').text().trim().replace(/:/g, '');
                const value = $(row).find('td:last-child').text().trim();
                if (label && value) techSpecs[label] = value;
            });

            // A4. Determinación de Sistema por Descripción
            const description = $('.product-description').text().toUpperCase();
            let systemKey = "FUEL_SYSTEM";
            if (description.includes("SEPARATOR") || description.includes("SEPARADOR")) systemKey = "FUEL_SEPARATOR";
            if (description.includes("LUBE") || description.includes("OIL")) systemKey = "LUBE_OIL";
            if (description.includes("AIR") && !description.includes("DRYER")) systemKey = "AIR_SYSTEM";
            if (description.includes("HYDRAULIC")) systemKey = "HYDRAULIC_SYS";
            if (description.includes("DRYER")) systemKey = "AIR_DRYER";

            const rules = homologationMap.TECHNOLOGY_HOMOLOGATION_MAP.MAPPING_RULES[systemKey];

            let results = [];
            const baseCode = searchTerm.toUpperCase();

            // OPCIÓN STANDARD
            results.push({
                tier: "STANDARD",
                donaldson_code: baseCode,
                sku: `${rules.pref}${baseCode.replace(/[^0-9]/g, '').slice(-4)}`,
                technology: rules.tech,
                iso: rules.iso,
                specs: techSpecs
            });

            // OPCIONES ALTERNATIVAS (Performance/Elite)
            $('.alternative-products-list .product-number').each((i, el) => {
                const altCode = $(el).text().trim();
                if (altCode && altCode !== baseCode && results.length < 3) {
                    const isElite = altCode.startsWith('DB') || altCode.includes('Blue');
                    results.push({
                        tier: isElite ? "ELITE" : "PERFORMANCE",
                        donaldson_code: altCode,
                        sku: `${rules.pref}${altCode.replace(/[^0-9]/g, '').slice(-4)}`,
                        technology: rules.tech,
                        iso: rules.iso,
                        specs: techSpecs // Calca la compatibilidad física
                    });
                }
            });

            return results;
        } catch (error) {
            console.error("Scraper Error:", error.message);
            return [];
        }
    }
};

module.exports = donaldsonScraper;
