/**
 * ELIMFILTERS® Engineering Core - Donaldson Scraper
 * v17.0 - FINAL: Deep Navigation, Attribute Extraction & Identity Mapping
 */

const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

// Carga robusta del mapa de homologación institucional
let homologationMap;
try {
    // Ajustado para funcionar en la estructura de carpetas de Railway
    const configPath = path.join(__dirname, '../config/homologation_map.json');
    homologationMap = require(configPath);
} catch (e) {
    console.error("❌ [CRITICAL ERROR]: No se pudo cargar el mapa de homologación en src/config/");
}

const donaldsonScraper = {
    getThreeOptions: async (searchTerm) => {
        try {
            // --- ACCIÓN 1: BÚSQUEDA Y DESCUBRIMIENTO ---
            const searchUrl = `https://shop.donaldson.com/store/en-us/search?Ntt=${searchTerm}`;
            const { data: searchHtml } = await axios.get(searchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const $search = cheerio.load(searchHtml);

            // Obtener el link exacto de la ficha técnica (Evita el resumen de búsqueda)
            const productPath = $search('.product-description-wrapper a, .product-list-item a').first().attr('href');
            if (!productPath) throw new Error(`Referencia ${searchTerm} no localizada.`);

            const productUrl = productPath.startsWith('http') ? productPath : `https://shop.donaldson.com${productPath}`;

            // --- ACCIÓN 2: NAVEGACIÓN PROFUNDA (DETALLE DEL PRODUCTO) ---
            const { data: productHtml } = await axios.get(productUrl);
            const $ = cheerio.load(productHtml);

            // --- ACCIÓN 3: EXTRACCIÓN DEL TAB DE ATRIBUTOS (PARA LAS 59 COLUMNAS) ---
            const techSpecs = {};
            $('.product-attributes-table tr, .attributes-table tr').each((i, row) => {
                const label = $(row).find('td:first-child').text().trim().replace(/:/g, '');
                const value = $(row).find('td:last-child').text().trim();
                if (label && value) techSpecs[label] = value;
            });

            // --- ACCIÓN 4: AUDITORÍA SEMÁNTICA PARA ASIGNACIÓN DE IDENTIDAD ---
            const title = $('h1').text().trim().toUpperCase();
            const desc = $('.product-description').text().trim().toUpperCase();
            const fullContext = `${title} ${desc}`;

            // Selección de sistema basada en tu JSON de Homologación
            let systemKey = "FUEL_SYSTEM"; // Default
            if (fullContext.includes("SEPARATOR") || fullContext.includes("SEPARADOR")) {
                systemKey = "FUEL_SEPARATOR";
            } else if (fullContext.includes("LUBE") || fullContext.includes("OIL") || fullContext.includes("ACEITE")) {
                systemKey = "LUBE_OIL";
            } else if (fullContext.includes("AIR") || fullContext.includes("AIRE")) {
                systemKey = "AIR_SYSTEM";
            } else if (fullContext.includes("HYDRAULIC") || fullContext.includes("HIDRAULICO")) {
                systemKey = "HYDRAULIC_SYS";
            }

            const rules = homologationMap.TECHNOLOGY_HOMOLOGATION_MAP.MAPPING_RULES[systemKey];

            // --- ACCIÓN 5: CONSTRUCCIÓN DEL CALCO (TIER STANDARD) ---
            const baseCode = $('.product-number, .sku-id').first().text().trim() || searchTerm.toUpperCase();
            let options = [];

            options.push({
                tier: "STANDARD",
                donaldson_code: baseCode,
                sku: `${rules.pref}${baseCode.replace(/[^0-9]/g, '').slice(-4)}`,
                technology: rules.tech,
                iso_standard: rules.iso,
                description: `ELIMFILTERS® ${rules.tech} - ${title}`,
                specs: { ...techSpecs } // Calca rosca, micraje, medidas, etc.
            });

            // --- ACCIÓN 6: EXPLORACIÓN DEL TAB DE ALTERNATIVAS (TIER PERFORMANCE/ELITE) ---
            $('.alternative-products-list .product-number, .related-items .sku-id').each((i, el) => {
                const altCode = $(el).text().trim();
                if (altCode && altCode !== baseCode && options.length < 3) {
                    const isBlue = altCode.startsWith('DB') || altCode.includes('Blue');
                    
                    options.push({
                        tier: isBlue ? "ELITE" : "PERFORMANCE",
                        donaldson_code: altCode,
                        sku: `${rules.pref}${altCode.replace(/[^0-9]/g, '').slice(-4)}`,
                        technology: rules.tech, // Hereda la tecnología homologada (ej: AQUAGUARD®)
                        iso_standard: rules.iso,
                        description: `ELIMFILTERS® ${isElite ? rules.tech : 'High Performance'}`,
                        specs: { ...techSpecs } // Hereda compatibilidad física
                    });
                }
            });

            return options;

        } catch (error) {
            console.error("❌ [SCRAPER v17.0 FINAL ERROR]:", error.message);
            return [];
        }
    }
};

module.exports = donaldsonScraper;
