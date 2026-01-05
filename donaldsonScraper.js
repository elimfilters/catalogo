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

            // 1. CÓDIGO PRINCIPAL - EXTRACCIÓN AGRESIVA
            let mainCode = null;
            
            // Estrategia 1: Selectores comunes
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
                    console.log(`   ✅ Código encontrado con selector: ${selector}`);
                    break;
                }
            }
            
            // Estrategia 2: Extraer de la URL
            if (!mainCode) {
                const urlMatch = productUrl.match(/\/(P\d{6}|DBL\d{4}|DBA\d{4})/i);
                if (urlMatch) {
                    mainCode = urlMatch[1].toUpperCase();
                    console.log(`   ✅ Código extraído de URL: ${mainCode}`);
                }
            }
            
            // Estrategia 3: Buscar en el texto de la página
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

            // 2. ESPECIFICACIONES
            $('table').each((i, table) => {
                $(table).find('tr').each((j, el) => {
                    const cells = $(el).find('td, th');
                    if (cells.length >= 2) {
                        const key = $(cells[0]).text().trim().replace(':', '');
                        const value = $(cells[1]).text().trim();
                        
                        if (key && value && key !== value && key.length > 1) {
                            result.specifications[key] = value;
                        }
                    }
                });
            });

            console.log(`   📊 Especificaciones: ${Object.keys(result.specifications).length}`);

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
                
                if (tableText.includes('cross') || tableText.includes('reference') || tableText.includes('competitor')) {
                    $(table).find('tr').each((j, el) => {
                        const cells = $(el).find('td');
                        if (cells.length >= 2) {
                            const brand = $(cells[0]).text().trim();
                            const code = $(cells[1]).text().trim();
                            
                            if (brand && code && brand.length > 1 && code.length > 2) {
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
                
                if (tableText.includes('equipment') || tableText.includes('application') || tableText.includes('vehicle')) {
                    $(table).find('tr').each((j, el) => {
                        const cells = $(el).find('td');
                        if (cells.length >= 2) {
                            const equipment = $(cells[0]).text().trim();
                            const engine = $(cells[1]).text().trim();
                            const year = cells.length >= 3 ? $(cells[2]).text().trim() : '';
                            
                            if (equipment && engine && equipment.length > 2) {
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
