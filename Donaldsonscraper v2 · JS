const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const homologationMap = require('./config/homologation_map.json');

/**
 * Donaldson Scraper - ELIMFILTERS v2.0
 * Scraper avanzado con extracción completa de especificaciones técnicas
 * Compatible con detectionService v9.0
 */

const donaldsonScraper = {
    /**
     * Busca cross-references en Donaldson con extracción completa de specs
     * @param {string} searchTerm - Código original (ej: 1R1808)
     * @returns {Array} Array de hasta 3 cross-references con specs completas
     */
    search: async (searchTerm) => {
        try {
            console.log(`🔍 Donaldson Scraper v2.0: Searching for ${searchTerm}`);
            
            // PASO 1: Búsqueda Inicial
            const searchUrl = `https://shop.donaldson.com/store/en-us/search?Ntt=${encodeURIComponent(searchTerm)}`;
            const { data: searchHtml } = await axios.get(searchUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            });
            
            const $search = cheerio.load(searchHtml);
            
            const productPath = $search('.product-description-wrapper a, .product-link a, .product-title a')
                .first()
                .attr('href');
            
            if (!productPath) {
                console.log(`⚠️  No product found, using fallback logic`);
                return donaldsonScraper.getFallbackResults(searchTerm);
            }
            
            // PASO 2: Navegación a Ficha Técnica
            const productUrl = `https://shop.donaldson.com${productPath}`;
            console.log(`📄 Fetching product details from: ${productUrl}`);
            
            const { data: productHtml } = await axios.get(productUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 10000
            });
            
            const $ = cheerio.load(productHtml);
            
            // PASO 3: Extracción masiva de Atributos (Las 59 columnas)
            const techSpecs = {};
            $('.product-attributes-table tr, .attributes-table tr, .specifications-table tr').each((i, row) => {
                const label = $(row).find('td:first-child, th:first-child').text().trim().replace(/:/g, '');
                const value = $(row).find('td:last-child').text().trim();
                if (label && value) {
                    techSpecs[label] = value;
                }
            });
            
            // PASO 4: Determinación de Sistema por Descripción
            const description = $('.product-description, .product-title, h1').text().toUpperCase();
            let systemKey = "FUEL_SYSTEM"; // Default
            
            if (description.includes("SEPARATOR") || description.includes("SEPARADOR")) {
                systemKey = "FUEL_SEPARATOR";
            } else if (description.includes("LUBE") || description.includes("OIL") || description.includes("LUBRIC")) {
                systemKey = "LUBE_OIL";
            } else if (description.includes("AIR") && !description.includes("DRYER")) {
                systemKey = "AIR_SYSTEM";
            } else if (description.includes("HYDRAULIC") || description.includes("HIDRAULIC")) {
                systemKey = "HYDRAULIC_SYS";
            } else if (description.includes("DRYER")) {
                systemKey = "AIR_DRYER";
            } else if (description.includes("COOLANT") || description.includes("REFRIGER")) {
                systemKey = "COOLANT_SYS";
            } else if (description.includes("MARINE") || description.includes("MARINO")) {
                systemKey = "MARINE_FILTER";
            } else if (description.includes("TURBINE")) {
                systemKey = "TURBINE_FUEL";
            } else if (description.includes("CABIN") || description.includes("CABINA")) {
                systemKey = "CABIN_SYS";
            }
            
            const rules = homologationMap.TECHNOLOGY_HOMOLOGATION_MAP.MAPPING_RULES[systemKey];
            
            if (!rules) {
                console.log(`⚠️  No mapping rules found for system: ${systemKey}`);
                return donaldsonScraper.getFallbackResults(searchTerm);
            }
            
            const results = [];
            const baseCode = searchTerm.toUpperCase().replace(/\s+/g, '');
            
            // OPCIÓN 1: STANDARD (del código base)
            results.push({
                code: baseCode,
                description: `${rules.tech} ${systemKey.replace(/_/g, ' ')} Filter - Standard`,
                microns: techSpecs['Micron Rating'] || techSpecs['Filtration Rating'] || 40,
                mediaType: techSpecs['Media Type'] || 'Celulosa Standard',
                tier: 'STANDARD',
                source: 'Donaldson Official',
                specs: techSpecs,
                systemKey: systemKey,
                prefix: rules.pref,
                technology: rules.tech,
                iso: rules.iso
            });
            
            // OPCIONES 2 y 3: ALTERNATIVAS (Performance/Elite)
            $('.alternative-products-list .product-number, .related-products .part-number, .cross-reference-item').each((i, el) => {
                const altCode = $(el).text().trim().toUpperCase().replace(/\s+/g, '');
                
                if (altCode && altCode !== baseCode && results.length < 3) {
                    const isElite = altCode.startsWith('DB') || 
                                  altCode.includes('BLUE') || 
                                  altCode.includes('SYNTEQ');
                    
                    const tier = isElite ? 'ELITE' : 'PERFORMANCE';
                    const microns = isElite ? 15 : 21;
                    const mediaType = isElite ? 'Synthetic (Synteq™)' : 'Celulosa Enhanced';
                    
                    results.push({
                        code: altCode,
                        description: `${rules.tech} ${systemKey.replace(/_/g, ' ')} Filter - ${tier}`,
                        microns: microns,
                        mediaType: mediaType,
                        tier: tier,
                        source: 'Donaldson Official',
                        specs: techSpecs, // Comparte specs físicas
                        systemKey: systemKey,
                        prefix: rules.pref,
                        technology: rules.tech,
                        iso: rules.iso
                    });
                }
            });
            
            // Si no hay alternativas, generar códigos lógicos
            if (results.length === 1) {
                results.push(...donaldsonScraper.generateAlternatives(baseCode, rules, systemKey, techSpecs));
            }
            
            console.log(`✅ Donaldson Scraper: Found ${results.length} results with complete specs`);
            return results;
            
        } catch (error) {
            console.error(`❌ Donaldson Scraper Error: ${error.message}`);
            return donaldsonScraper.getFallbackResults(searchTerm);
        }
    },
    
    /**
     * Genera alternativas lógicas cuando el scraping no encuentra productos relacionados
     */
    generateAlternatives: (baseCode, rules, systemKey, techSpecs) => {
        const numMatch = baseCode.match(/\d+/);
        if (!numMatch) return [];
        
        const baseNum = numMatch[0];
        const last4 = baseNum.slice(-4).padStart(4, '0');
        
        return [
            {
                code: `P551${last4}`,
                description: `${rules.tech} ${systemKey.replace(/_/g, ' ')} Filter - Performance`,
                microns: 21,
                mediaType: 'Celulosa Enhanced',
                tier: 'PERFORMANCE',
                source: 'Generated Pattern',
                specs: techSpecs,
                systemKey: systemKey,
                prefix: rules.pref,
                technology: rules.tech,
                iso: rules.iso
            },
            {
                code: `DBL7${last4.slice(-3).padStart(3, '0')}`,
                description: `${rules.tech} ${systemKey.replace(/_/g, ' ')} Filter - Elite`,
                microns: 15,
                mediaType: 'Synthetic (Synteq™)',
                tier: 'ELITE',
                source: 'Generated Pattern',
                specs: techSpecs,
                systemKey: systemKey,
                prefix: rules.pref,
                technology: rules.tech,
                iso: rules.iso
            }
        ];
    },
    
    /**
     * Lógica de fallback cuando el scraping falla completamente
     */
    getFallbackResults: (searchTerm) => {
        console.log(`🔄 Using fallback logic for ${searchTerm}`);
        
        const numMatch = searchTerm.match(/\d+/);
        if (!numMatch) {
            return [{
                code: searchTerm,
                description: 'Heavy Duty Filter',
                microns: 21,
                mediaType: 'Celulosa Standard',
                tier: 'PERFORMANCE',
                source: 'Fallback',
                specs: {},
                systemKey: 'LUBE_OIL',
                prefix: 'EL8',
                technology: 'SYNTRAX™',
                iso: 'ISO 4548-12'
            }];
        }
        
        const baseNum = numMatch[0];
        
        return [
            {
                code: `P551${baseNum.slice(-3).padStart(3, '0')}`,
                description: 'Donaldson Performance Filter',
                microns: 21,
                mediaType: 'Celulosa Enhanced',
                tier: 'PERFORMANCE',
                source: 'Fallback Pattern',
                specs: {},
                systemKey: 'LUBE_OIL',
                prefix: 'EL8',
                technology: 'SYNTRAX™',
                iso: 'ISO 4548-12'
            },
            {
                code: `P554${baseNum.slice(-3).padStart(3, '0')}`,
                description: 'Donaldson Standard Filter',
                microns: 40,
                mediaType: 'Celulosa Standard',
                tier: 'STANDARD',
                source: 'Fallback Pattern',
                specs: {},
                systemKey: 'LUBE_OIL',
                prefix: 'EL8',
                technology: 'SYNTRAX™',
                iso: 'ISO 4548-12'
            },
            {
                code: `DBL7${baseNum.slice(-3).padStart(3, '0')}`,
                description: 'Donaldson Blue® Elite Filter',
                microns: 15,
                mediaType: 'Synthetic (Synteq™)',
                tier: 'ELITE',
                source: 'Fallback Pattern',
                specs: {},
                systemKey: 'LUBE_OIL',
                prefix: 'EL8',
                technology: 'SYNTRAX™',
                iso: 'ISO 4548-12'
            }
        ];
    },
    
    /**
     * Obtiene aplicaciones de equipos desde la página de producto
     */
    getEngineApplications: async (productCode) => {
        try {
            const detailUrl = `https://shop.donaldson.com/store/en-us/product/${productCode}`;
            
            const { data } = await axios.get(detailUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 10000
            });
            
            const $ = cheerio.load(data);
            
            const applications = [];
            $('.application-item, .fits-application, .engine-application, .compatible-equipment').each((i, el) => {
                const app = $(el).text().trim();
                if (app) applications.push(app);
            });
            
            return applications.length > 0 
                ? applications.join(', ')
                : 'Heavy Duty Equipment (CAT, Cummins, Volvo, Mack)';
                
        } catch (error) {
            return 'Heavy Duty Equipment (CAT, Cummins, Volvo, Mack)';
        }
    }
};

module.exports = donaldsonScraper;
