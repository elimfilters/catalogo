const axios = require('axios');
const cheerio = require('cheerio');

class DonaldsonScraper {
    async search(searchTerm) {
        try {
            const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            
            console.log(`🔍 Iniciando búsqueda: ${cleanTerm}`);
            
            const productUrl = await this.findDonaldsonProduct(cleanTerm);
            
            if (!productUrl) {
                console.log(`❌ No se encontró equivalente Donaldson para "${cleanTerm}"`);
                return null;
            }
            
            console.log(`✅ Producto encontrado: ${productUrl}`);
            
            const result = await this.extractProductData(productUrl);
            
            return result;
            
        } catch (error) {
            console.error("❌ Error en scraper:", error.message);
            return null;
        }
    }

    async findDonaldsonProduct(searchTerm) {
        try {
            const searchUrl = `https://shop.donaldson.com/store/es-us/search?Ntt=${searchTerm}`;
            
            console.log(`   🌐 Paso 1: Búsqueda global`);
            console.log(`   URL: ${searchUrl}`);
            
            const { data } = await axios.get(searchUrl, {
                headers: this.getHeaders(),
                timeout: 10000
            });

            const $ = cheerio.load(data);
            
            const directLink = $('a[href*="/product/P"], a[href*="/product/DBL"]').first().attr('href');
            
            if (directLink) {
                console.log(`   ✅ Link directo encontrado`);
                return directLink.startsWith('http') 
                    ? directLink 
                    : `https://shop.donaldson.com${directLink}`;
            }
            
            let productLink = null;
            
            $('.product-list-item, .search-result-item, .product-item').each((i, el) => {
                const link = $(el).find('a').first().attr('href');
                const code = $(el).find('.product-number, .part-number').text().trim();
                
                if (code && code.match(/^(P|DBL|DBA)\d+/i) && link) {
                    console.log(`   ✅ Código Donaldson encontrado: ${code}`);
                    productLink = link;
                    return false;
                }
            });
            
            if (productLink) {
                return productLink.startsWith('http') 
                    ? productLink 
                    : `https://shop.donaldson.com${productLink}`;
            }
            
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
            let mainCode = null;
            
            const codeSelectors = [
                'h1',
                '.product-id',
                '.product-number',
                '.part-number',
                '[data-product-id]',
                '[data-part-number]',
                '.product-code'
            ];
            
            for (const selector of codeSelectors) {
                const code = $(selector).first().text().trim();
                if (code && code.match(/^(P|DBL|DBA)\d+/i)) {
                    mainCode = code;
                    console.log(`   ✅ Código encontrado: ${selector}`);
                    break;
                }
            }
            
            if (!mainCode) {
                const urlMatch = productUrl.match(/\/(P\d{6}|DBL\d{4}|DBA\d{4})/i);
                if (urlMatch) {
                    mainCode = urlMatch[1].toUpperCase();
                    console.log(`   ✅ Código extraído de URL: ${mainCode}`);
                }
            }
            
            if (!mainCode) {
                const pageText = $('body').text();
                const match = pageText.match(/(P\d{6}|DBL\d{4}|DBA\d{4})/i);
                if (match) {
                    mainCode = match[1].toUpperCase();
                    console.log(`   ✅ Código extraído del texto: ${mainCode}`);
                }
            }
            
            if (!mainCode) {
                console.log('   ❌ No se pudo extraer código principal');
                return null;
            }
            
            // Descripción
            let description = '';
            const descSelectors = [
                '.product-description',
                '.product-name',
                'h2',
                '.description',
                '.product-title'
            ];
            
            for (const selector of descSelectors) {
                const desc = $(selector).first().text().trim();
                if (desc && desc.length > 5) {
                    description = desc;
                    break;
                }
            }
            
            result.mainProduct = {
                code: mainCode,
                description: description,
                tier: this.identifyTier(mainCode),
                url: productUrl
            };

            console.log(`   📦 Producto: ${mainCode}`);

            // 2. ESPECIFICACIONES - CON FILTRO ULTRA AGRESIVO
            const invalidKeys = [
                'nombre', 'dirección', 'impresión', 'especificaciones',
                'cantidad', 'su precio', 'fecha', 'nombre del fabricante',
                'n° de pieza del fabricante', 'equipo', 'año',
                'name', 'address', 'print', 'specifications',
                'quantity', 'your price', 'date', 'manufacturer name',
                'manufacturer part number', 'equipment', 'year',
                'número', 'región', 'indique', 'entrante'
            ];

            const invalidValues = [
                'dirección', 'especificaciones', 'su precio', 'cantidad entrante',
                'n° de pieza del fabricante', 'año', 'indique su región'
            ];

            let validSpecCount = 0;

            $('table').each((i, table) => {
                const tableText = $(table).text().toLowerCase();
                
                // Skip tablas de formulario/cotización
                const skipKeywords = [
                    'cotización', 'su precio', 'cantidad', 'comprar',
                    'carrito', 'agregar', 'solicitar', 'región',
                    'dirección', 'entrante'
                ];
                
                if (skipKeywords.some(keyword => tableText.includes(keyword))) {
                    return;
                }
                
                // Solo procesar tablas con keywords técnicas
                const hasSpecKeywords = tableText.includes('diámetro') || 
                                       tableText.includes('altura') || 
                                       tableText.includes('rosca') ||
                                       tableText.includes('thread') ||
                                       tableText.includes('diameter') ||
                                       tableText.includes('height') ||
                                       tableText.includes('mm') ||
                                       tableText.includes('inch');
                
                if (!hasSpecKeywords) {
                    return;
                }
                
                $(table).find('tr').each((j, el) => {
                    const cells = $(el).find('td, th');
                    if (cells.length >= 2) {
                        let key = $(cells[0]).text().trim().replace(':', '');
                        let value = $(cells[1]).text().trim();
                        
                        const keyLower = key.toLowerCase();
                        const valueLower = value.toLowerCase();
                        
                        const isValidKey = key && 
                                          key.length > 2 && 
                                          key.length < 50 &&
                                          !invalidKeys.includes(keyLower);
                        
                        const isValidValue = value && 
                                            value.length > 0 && 
                                            value.length < 100 &&
                                            !invalidValues.some(inv => valueLower.includes(inv));
                        
                        const isDifferent = key !== value;
                        const hasNumbers = /\d/.test(value);
                        
                        const notHeader = !keyLower.includes('nombre') && 
                                         !keyLower.includes('fabricante') &&
                                         !valueLower.includes('dirección') &&
                                         !valueLower.includes('especificaciones');
                        
                        if (isValidKey && isValidValue && isDifferent && hasNumbers && notHeader) {
                            result.specifications[key] = value;
                            validSpecCount++;
                        }
                    }
                });
            });

            console.log(`   📊 Especificaciones: ${validSpecCount}`);

            // 3. ALTERNATIVOS
            $('.alternative-product, .variant-item, .related-product').each((i, el) => {
                const code = $(el).find('.product-number, .part-number').text().trim();
                const desc = $(el).find('.product-name, .description').text().trim();
                
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

            console.log(`   🔄 Alternativos: ${result.alternatives.length}`);

            // 4. CROSS-REFERENCES
            $('table').each((i, table) => {
                const tableText = $(table).text().toLowerCase();
                
                if (tableText.includes('cross') || 
                    tableText.includes('reference') || 
                    tableText.includes('competitor') ||
                    tableText.includes('equivalente')) {
                    
                    $(table).find('tr').each((j, el) => {
                        const cells = $(el).find('td');
                        if (cells.length >= 2) {
                            const brand = $(cells[0]).text().trim();
                            const code = $(cells[1]).text().trim();
                            
                            if (brand && code && 
                                brand.length > 1 && 
                                code.length > 2 &&
                                !brand.toLowerCase().includes('fabricante') &&
                                !code.toLowerCase().includes('pieza') &&
                                brand !== 'Nombre del fabricante') {
                                
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
                }
            });

            console.log(`   🔗 Cross-references: ${result.crossReferences.length}`);

            // 5. EQUIPOS
            $('table').each((i, table) => {
                const tableText = $(table).text().toLowerCase();
                
                if (tableText.includes('equipment') || 
                    tableText.includes('application') || 
                    tableText.includes('vehicle') ||
                    tableText.includes('equipo')) {
                    
                    $(table).find('tr').each((j, el) => {
                        const cells = $(el).find('td');
                        if (cells.length >= 2) {
                            const equipment = $(cells[0]).text().trim();
                            const engine = $(cells[1]).text().trim();
                            const year = cells.length >= 3 ? $(cells[2]).text().trim() : '';
                            
                            if (equipment && engine && 
                                equipment.length > 2 &&
                                equipment.toLowerCase() !== 'equipo' &&
                                engine.toLowerCase() !== 'año') {
                                
                                result.equipment.push({ equipment, engine, year });
                            }
                        }
                    });
                }
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
            'Kubota', 'Yanmar', 'Perkins', 'Deutz', 'MAN',
            'Scania', 'Iveco', 'Renault', 'DAF', 'Paccar'
        ];
        
        return oemBrands.some(oem => brand.toLowerCase().includes(oem.toLowerCase()));
    }

    getHeaders() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-US,es;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        };
    }
}

module.exports = new DonaldsonScraper();
