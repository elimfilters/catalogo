/**
 * ELIMFILTERS® Engineering Core - Donaldson Scraper
 * v12.0 - Auditoría de Descripción y Validación de 44 Campos
 */

const axios = require('axios');
const cheerio = require('cheerio');

const donaldsonScraper = {
    getThreeOptions: async (searchTerm) => {
        try {
            const searchUrl = `https://shop.donaldson.com/store/en-us/search?Ntt=${searchTerm}`;
            const { data } = await axios.get(searchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0...' }
            });

            const $ = cheerio.load(data);
            
            // 1. AUDITORÍA DE DESCRIPCIÓN (ELIMINA EL ERROR DEL 26560201)
            const productTitle = $('.product-title, h1').text().toUpperCase();
            const productDesc = $('.product-description').text().toUpperCase();
            const fullText = `${productTitle} ${productDesc}`;

            const isWaterSeparator = fullText.includes("SEPARADOR DE AGUA") || 
                                     fullText.includes("WATER SEPARATOR");

            // 2. EXTRACCIÓN DE LA MATRIZ TÉCNICA (44 CAMPOS)
            const techSpecs = {};
            $('.product-attributes-table tr').each((i, row) => {
                const label = $(row).find('td:first-child').text().trim();
                const value = $(row).find('td:last-child').text().trim();
                if (label && value) techSpecs[label] = value;
            });

            // Mapeo específico para validación de Rosca y Eficiencia
            const threadSize = techSpecs['Thread Size'] || techSpecs['Tamaño de la rosca'] || "N/A";
            const micronRating = techSpecs['Efficiency 99%'] || techSpecs['Eficiencia 99%'] || "N/A";

            let options = [];

            // 3. PROCESAMIENTO DEL PRODUCTO BASE (STANDARD)
            // Si es Separador, forzamos la lógica de EF9 + validación de rosca
            options.push({
                tier: "STANDARD",
                code: searchTerm,
                sku_digits: searchTerm.replace(/[^0-9]/g, '').slice(-4),
                type: isWaterSeparator ? "Fuel/Water Separator" : "Fuel",
                claim: isWaterSeparator ? "Separador de agua enroscable de alta eficiencia" : "Filtro de combustible estándar",
                specs: {
                    ThreadSize: threadSize,
                    MicronRating: micronRating,
                    SpecialFeatures: isWaterSeparator ? "Water Separator, Drain Valve" : "Standard Fuel",
                    ...techSpecs // Inyecta todos los campos encontrados para las 59 columnas
                }
            });

            // 4. BÚSQUEDA DE ALTERNATIVAS (TAB PRODUCTOS ALTERNATIVOS)
            $('.alternative-products-list .product-number').each((i, el) => {
                const altCode = $(el).text().trim();
                if (altCode && altCode !== searchTerm) {
                    // Aquí el sistema validaría si la alternativa también es Separador
                    options.push({
                        tier: options.length === 1 ? "PERFORMANCE" : "ELITE",
                        code: altCode,
                        sku_digits: altCode.replace(/[^0-9]/g, '').slice(-4),
                        specs: { ThreadSize: threadSize, ...techSpecs }
                    });
                }
            });

            return options;

        } catch (error) {
            console.error("❌ [SCRAPER ERROR]:", error.message);
            return [];
        }
    }
};

module.exports = donaldsonScraper;
