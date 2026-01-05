const axios = require('axios');
const cheerio = require('cheerio');

class DonaldsonScraper {
    async search(searchTerm) {
        try {
            const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '');
            
            // Búsqueda dentro del portafolio de Motores y Vehículos
            const masterUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${cleanTerm}&N=4130398073&catNav=true`;
            
            console.log(`🔍 Buscando en Donaldson: ${masterUrl}`);
            
            const { data: searchPage } = await axios.get(masterUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept-Language': 'es-US,es;q=0.9,en;q=0.8'
                }
            });

            const $search = cheerio.load(searchPage);
            
            // Buscar link del producto
            const resultLink = $search('.product-list-item a, .search-result-item a, .product-name a, .product-card a').first().attr('href');

            if (!resultLink) {
                console.log('⚠️ No se encontró link del producto en resultados');
                return null;
            }

            const detailUrl = resultLink.startsWith('http') ? resultLink : `https://shop.donaldson.com${resultLink}`;
            console.log(`✅ Producto encontrado: ${detailUrl}`);
            
            // Obtener página de detalle
            const { data: detailPage } = await axios.get(detailUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept-Language': 'es-US,es;q=0.9,en;q=0.8'
                }
            });
            
            return this.extractFullData(cheerio.load(detailPage), detailUrl);

        } catch (error) {
            console.error("❌ Error en scraper Donaldson:", error.message);
            return null;
        }
    }

    extractFullData($, productUrl) {
        const result = {
            mainProduct: {},
            alternatives: [],
            crossReferences: [],
            specifications: {},
            equipment: []
        };

        // 1. EXTRAER CÓDIGO PRINCIPAL
        const mainCode = $('h1, .product-number, .part-number').first().text().trim();
        const description = $('.product-name, .product-description, h1 + p').first().text().trim();
        
        result.mainProduct = {
            code: mainCode,
            description: description,
            tier: this.identifyTier(mainCode),
            url: productUrl
        };

        console.log(`📦 Producto principal: ${mainCode}`);

        // 2. EXTRAER ESPECIFICACIONES TÉCNICAS
        $('.product-specification-table tr, .specs-table tr, table.specifications tr').each((i, el) => {
            const key = $(el).find('td:first-child, th:first-child').text().trim().replace(':', '');
            const value = $(el).find('td:last-child').text().trim();
            if (key && value && key !== value) {
                result.specifications[key] = value;
            }
        });

        // También buscar specs en formato diferente
        $('.spec-item, .specification-item').each((i, el) => {
            const key = $(el).find('.spec-label, .label').text().trim().replace(':', '');
            const value = $(el).find('.spec-value, .value').text().trim();
            if (key && value) {
                result.specifications[key] = value;
            }
        });

        console.log(`📊 Especificaciones encontradas: ${Object.keys(result.specifications).length}`);

        // 3. EXTRAER PRODUCTOS ALTERNATIVOS (TRILOGY)
        // Buscar en múltiples selectores posibles
        const alternativeSelectors = [
            '.alternative-product-item',
            '.variant-item',
            '.product-variant',
            '#alternatives .product-item',
            '[data-tab="alternatives"] .product-item',
            '.related-product-item'
        ];

        alternativeSelectors.forEach(selector => {
            $(selector).each((i, el) => {
                const altCode = $(el).find('.product-number, .part-number, .code').text().trim();
                const altDesc = $(el).find('.product-name, .description').text().trim();
                
                if (altCode && altCode !== mainCode && !result.alternatives.find(a => a.code === altCode)) {
                    result.alternatives.push({
                        code: altCode,
                        description: altDesc,
                        tier: this.identifyTier(altCode)
                    });
                }
            });
        });

        console.log(`🔄 Productos alternativos: ${result.alternatives.length}`);

        // 4. EXTRAER CROSS-REFERENCES (OEM y Aftermarket)
        // Buscar en tabla de referencias cruzadas
        const crossRefSelectors = [
            '#cross-reference table tr',
            '.cross-reference-table tr',
            '[data-tab="cross-reference"] table tr',
            '.reference-table tr',
            '.competitor-references tr'
        ];

        crossRefSelectors.forEach(selector => {
            $(selector).each((i, el) => {
                const brand = $(el).find('td:first-child, .brand, .manufacturer').text().trim();
                const code = $(el).find('td:last-child, .part-number, .code').text().trim();
                
                if (brand && code && brand !== code) {
                    // Clasificar si es OEM o Aftermarket
                    const isOEM = this.isOEMBrand(brand);
                    
                    if (!result.crossReferences.find(r => r.code === code)) {
                        result.crossReferences.push({
                            brand: brand,
                            code: code,
                            type: isOEM ? 'OEM' : 'Aftermarket'
                        });
                    }
                }
            });
        });

        console.log(`🔗 Cross-references: ${result.crossReferences.length}`);

        // 5. EXTRAER APLICACIONES DE EQUIPOS
        const equipmentSelectors = [
            '#equipment table tr',
            '.equipment-table tr',
            '[data-tab="equipment"] table tr',
            '.application-table tr'
        ];

        equipmentSelectors.forEach(selector => {
            $(selector).each((i, el) => {
                const equipment = $(el).find('td:nth-child(1)').text().trim();
                const engine = $(el).find('td:nth-child(2)').text().trim();
                const year = $(el).find('td:nth-child(3)').text().trim();
                
                if (equipment && engine) {
                    result.equipment.push({
                        equipment: equipment,
                        engine: engine,
                        year: year
                    });
                }
            });
        });

        console.log(`🚛 Equipos encontrados: ${result.equipment.length}`);

        // 6. Si no encontramos cross-references en tablas, buscar en texto
        if (result.crossReferences.length === 0) {
            const pageText = $('body').text();
            
            // Buscar patrones de códigos comunes
            const patterns = [
                /LF\d{4,5}/g,        // Fleetguard
                /FF\d{4,5}/g,        // Fleetguard Fuel
                /AF\d{4,5}/g,        // Fleetguard Air
                /B\d{3,5}/g,         // Baldwin
                /PH\d+[A-Z]?/g,      // FRAM
                /\d{5,8}[A-Z]{0,3}/g // Códigos OEM genéricos
            ];

            patterns.forEach(pattern => {
                const matches = pageText.match(pattern);
                if (matches) {
                    matches.forEach(code => {
                        if (code !== mainCode && !result.crossReferences.find(r => r.code === code)) {
                            result.crossReferences.push({
                                brand: 'Unknown',
                                code: code,
                                type: 'Aftermarket'
                            });
                        }
                    });
                }
            });
        }

        return result;
    }

    identifyTier(code) {
        const upperCode = code.toUpperCase();
        
        // ELITE: Donaldson BLUE
        if (upperCode.startsWith('DBL') || upperCode.startsWith('DBA')) {
            return 'ELITE';
        }
        
        // STANDARD: Códigos específicos conocidos
        if (upperCode.includes('P550949') || upperCode.includes('P551016')) {
            return 'STANDARD';
        }
        
        // Por defecto: PERFORMANCE
        return 'PERFORMANCE';
    }

    isOEMBrand(brand) {
        const oemBrands = [
            'Caterpillar', 'CAT', 'Komatsu', 'Volvo', 'Mack', 
            'John Deere', 'Cummins', 'Detroit Diesel', 'Detroit', 
            'Ford', 'Toyota', 'Nissan', 'BMW', 'Mercedes', 'Mercedes-Benz',
            'Isuzu', 'Hino', 'Mitsubishi', 'Case', 'New Holland',
            'Kubota', 'Yanmar', 'Perkins', 'Deutz', 'MAN',
            'Scania', 'Iveco', 'Renault', 'DAF', 'Paccar'
        ];
        
        return oemBrands.some(oem => brand.toLowerCase().includes(oem.toLowerCase()));
    }
}

module.exports = new DonaldsonScraper();
