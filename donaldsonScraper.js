const axios = require('axios');
const cheerio = require('cheerio');

class DonaldsonScraper {
    async search(searchTerm) {
        try {
            const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            
            console.log(`🔍 Iniciando búsqueda: ${cleanTerm}`);
            
            // PASO 1: Búsqueda global para encontrar el equivalente Donaldson
            const productUrl = await this.findDonaldsonProduct(cleanTerm);
            
            if (!productUrl) {
                console.log(`❌ No se encontró equivalente Donaldson para "${cleanTerm}"`);
                return null;
            }
            
            console.log(`✅ Producto encontrado: ${productUrl}`);
            
            // PASO 2: Extraer datos completos de la página del producto
            const result = await this.extractProductData(productUrl);
            
            return result;
            
        } catch (error) {
            console.error("❌ Error en scraper:", error.message);
            return null;
        }
    }

    async findDonaldsonProduct(searchTerm) {
        try {
            // Búsqueda GLOBAL (sin restricción de catálogo)
            const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${searchTerm}`;
            
            console.log(`   🌐 Paso 1: Búsqueda global`);
            console.log(`   URL: ${searchUrl}`);
            
            const { data } = await axios.get(searchUrl, {
                headers: this.getHeaders(),
                timeout: 10000
            });

            const $ = cheerio.load(data);
            
            // Buscar el link del producto Donaldson
            // Puede estar en diferentes lugares según el tipo de resultado
            
            // OPCIÓN 1: Link directo en resultados
            const directLink = $('a[href*="/product/P"], a[href*="/product/DBL"]').first().attr('href');
            
            if (directLink) {
                console.log(`   ✅ Link directo encontrado`);
                return directLink.startsWith('http') 
                    ? directLink 
                    : `https://shop.donaldson.com${directLink}`;
            }
            
            // OPCIÓN 2: Buscar en items de producto
            let productLink = null;
            
            $('.product-list-item, .search-result-item, .product-item').each((i, el) => {
                const link = $(el).find('a').first().attr('href');
                const code = $(el).find('.product-number, .part-number').text().trim();
                
                // Verificar que sea código Donaldson (P, DBL, DBA)
                if (code && code.match(/^(P|DBL|DBA)\d+/i) && link) {
                    console.log(`   ✅ Código Donaldson encontrado: ${code}`);
                    productLink = link;
                    return false; // break
                }
            });
            
            if (productLink) {
                return productLink.startsWith('http') 
                    ? productLink 
                    : `https://shop.donaldson.com${productLink}`;
            }
            
            // OPCIÓN 3: Buscar CUALQUIER link a producto
            const anyProductLink = $('a[href*="/product/"]').first().attr('href');
            
            if (anyProductLink) {
                console.log(`   ⚠️ Link genérico encontrado`);
                return anyProductLink.startsWith('http') 
                    ? anyProductLink 
                    : `https://shop.donaldson.com${anyProductLink}`;
            }
            
            return null;
            
        } catch (error) {
            console.error(`   ❌ Error en búsqueda: ${error.message}`);
            return null;
        }
    }

    async extractProductData(productUrl) {
        try {
            console.log(`   📄 Paso 2: Extrayendo datos del producto`);
            console.log(`   URL: ${productUrl}`);
            
            const { data } = await axios.get(productUrl, {
                headers: this.getHeaders(),
                timeout: 10000
            });
            
            const $ = cheerio.load(data);
            
            const result = {
                mainProduct: {},
                alternatives: [],
                crossReferences: [],
                specifications: {},
                equipment: []
            };

            // 1. CÓDIGO PRINCIPAL
            const mainCode = $('h1, .product-id, [data-product-id]').first().text().trim();
            const description = $('.product-description, .product-name, h2').first().text().trim();
            
            if (!mainCode) {
                console.log('   ⚠️ No se pudo extraer código principal');
                return null;
            }
            
            result.mainProduct = {
                code: mainCode,
                description: description,
                tier: this.identifyTier(mainCode),
                url: productUrl
            };

            console.log(`   📦 Producto: ${mainCode}`);

            // 2. ESPECIFICACIONES TÉCNICAS
            $('table tr, .specification-row, .spec-item').each((i, el) => {
                let key = $(el).find('td:first-child, th, .spec-label, .label').text().trim();
                let value = $(el).find('td:last-child, .spec-value, .value').text().trim();
                
                // Limpiar
                key = key.replace(':', '').trim();
                
                if (key && value && key !== value && key.length > 1) {
                    result.specifications[key] = value;
                }
            });

            console.log(`   📊 Especificaciones: ${Object.keys(result.specifications).length}`);

            // 3. PRODUCTOS ALTERNATIVOS (TRILOGY)
            const alternativeSelectors = [
                '.alternative-product',
                '.variant-item',
                '.related-product',
                '[data-alternative-product]',
                '#alternatives .product-item'
            ];

            alternativeSelectors.forEach(selector => {
                $(selector).each((i, el) => {
                    const code = $(el).find('.product-number, .part-number, .code').text().trim();
                    const desc = $(el).find('.product-name, .description, .name').text().trim();
                    
                    if (code && code !== mainCode && code.match(/^(P|DBL|DBA)/i)) {
                        if (!result.alternatives.find(a => a.code === code)) {
                            result.alternatives.push({
                                code: code,
                                description: desc,
                                tier: this.identifyTier(code)
                            });
                        }
                    }
                });
            });

            console.log(`   🔄 Alternativos: ${result.alternatives.length}`);

            // 4. CROSS-REFERENCES
            const crossRefSelectors = [
                '#cross-reference table tr',
                '.cross-reference-table tr',
                '.competitor-reference tr',
                '[data-cross-reference] tr'
            ];

            crossRefSelectors.forEach(selector => {
                $(selector).each((i, el) => {
                    const cells = $(el).find('td');
                    if (cells.length >= 2) {
                        const brand = $(cells[0]).text().trim();
                        const code = $(cells[1]).text().trim();
                        
                        if (brand && code && brand.length > 1 && code.length > 1) {
                            if (!result.crossReferences.find(r => r.code === code)) {
                                result.crossReferences.push({
                                    brand: brand,
                                    code: code,
                                    type: this.isOEMBrand(brand) ? 'OEM' : 'Aftermarket'
                                });
                            }
                        }
                    }
                });
            });

            console.log(`   🔗 Cross-references: ${result.crossReferences.length}`);

            // 5. APLICACIONES DE EQUIPOS
            const equipmentSelectors = [
                '#equipment table tr',
                '.equipment-table tr',
                '.application-table tr',
                '[data-equipment] tr'
            ];

            equipmentSelectors.forEach(selector => {
                $(selector).each((i, el) => {
                    const cells = $(el).find('td');
                    if (cells.length >= 2) {
                        const equipment = $(cells[0]).text().trim();
                        const engine = $(cells[1]).text().trim();
                        const year = cells.length >= 3 ? $(cells[2]).text().trim() : '';
                        
                        if (equipment && engine) {
                            result.equipment.push({
                                equipment: equipment,
                                engine: engine,
                                year: year
                            });
                        }
                    }
                });
            });

            console.log(`   🚛 Equipos: ${result.equipment.length}`);

            return result;
            
        } catch (error) {
            console.error(`   ❌ Error extrayendo datos: ${error.message}`);
            return null;
        }
    }

    identifyTier(code) {
        const upper = code.toUpperCase();
        if (upper.startsWith('DBL') || upper.startsWith('DBA')) return 'ELITE';
        if (upper.includes('P550') || upper.includes('P551016')) return 'STANDARD';
        return 'PERFORMANCE';
    }

    isOEMBrand(brand) {
        const oemBrands = [
            'Caterpillar', 'CAT', 'Komatsu', 'Volvo', 'Mack',
            'John Deere', 'Cummins', 'Detroit Diesel', 'Detroit',
            'Ford', 'Toyota', 'Nissan', 'BMW', 'Mercedes', 'Mercedes-Benz',
            'Isuzu', 'Hino', 'Mitsubishi', 'Case', 'New Holland',
            'Kub
