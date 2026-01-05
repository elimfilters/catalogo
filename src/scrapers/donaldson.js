/**
 * ELIMFILTERS® Engineering Core - Donaldson Scraper
 * v16.0 - Fusión de Atributos Vivos + Mapa de Homologación
 */

const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

// Carga segura del mapa de homologación
let homologationMap;
try {
    homologationMap = require('../config/homologation_map.json');
} catch (e) {
    console.error("❌ [ERROR]: No se pudo cargar homologation_map.json en src/config/");
}

const donaldsonScraper = {
    getThreeOptions: async (searchTerm) => {
        try {
            // 1. Búsqueda y Navegación Profunda (Primer Clic)
            const searchUrl = `https://shop.donaldson.com/store/en-us/search?Ntt=${searchTerm}`;
            const { data: searchHtml } = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $search = cheerio.load(searchHtml);
            
            const productPath = $search('.product-description-wrapper a').first().attr('href');
            if (!productPath) throw new Error("Producto no encontrado.");

            // 2. Extracción de Datos Vivos (Segundo Clic - Ficha Técnica)
            const productUrl = `https://shop.donaldson.com${productPath}`;
            const { data: productHtml } = await axios.get(productUrl);
            const $ = cheerio.load(productHtml);

            // Captura de Descripción Oficial
            const rawDescription = $('.product-description').text().trim().toUpperCase();
            const productTitle = $('h1').text().trim().toUpperCase();

            // 3. Extracción de los 44/59 Campos (Tab Atributos)
            const techSpecs = {};
            $('.product-attributes-table tr').each((i, row) => {
                const label = $(row).find('td:first-child').text().trim();
                const value = $(row).find('td:last-child').text().trim();
                if (label) techSpecs[label] = value;
            });

            // 4. Lógica de Selección de Sistema (Basado en Descripción)
            let systemKey = "FUEL_SYSTEM";
            if (rawDescription.includes("SEPARATOR") || rawDescription.includes("SEPARADOR")) {
                systemKey = "FUEL_SEPARATOR";
            } else if (rawDescription.includes("LUBE") || rawDescription.includes("OIL")) {
                systemKey = "LUBE_OIL";
            }

            // Aplicar Homologación ELIMFILTERS®
            const rules = homologationMap.TECHNOLOGY_HOMOLOGATION_MAP.MAPPING_RULES[systemKey];
            
            // 5. Construcción de Trilogía con Datos Reales
            let options = [];
            const baseCode = searchTerm.toUpperCase();

            // Opción STANDARD
            options.push({
                tier: "STANDARD",
                code: baseCode,
                sku: `${rules.pref}${baseCode.replace(/[^0-9]/g, '').slice(-4)}`,
                description: `ELIMFILTERS® ${rules.tech} - ${productTitle}`,
                specs: {
                    ...techSpecs,
                    Technology: rules.tech,
                    ISO_Standard: rules.iso,
                    Original_Description: rawDescription
                }
            });

            // 6. Búsqueda de Alternativas (Tab Productos Alternativos)
            $('.alternative-products-list .product-number').each((i, el) => {
                const altCode = $(el).text().trim();
                const isElite = altCode.startsWith('DB') || altCode.includes('Blue');
                
                if (options.length < 3) {
                    options.push({
                        tier: isElite ? "ELITE" : "PERFORMANCE",
                        code: altCode,
                        sku: `${rules.pref}${altCode.replace(/[^0-9]/g, '').slice(-4)}`,
                        description: `ELIMFILTERS® ${isElite ? rules.tech : 'High Efficiency'}`,
                        specs: { ...techSpecs, Technology: rules.tech }
                    });
                }
            });

            return options;

        } catch (error) {
            console.error("❌ [SCRAPER v16 ERROR]:", error.message);
            return [];
        }
    }
};

module.exports = donaldsonScraper;
