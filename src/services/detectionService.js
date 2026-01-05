const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const groqService = require('./groqService');
const mongoService = require('./mongoService');
const donaldsonScraper = require('../../donaldsonScraper');
const framScraper = require('../../framScraper');

/**
 * Detection Service v11.0.7 - ELIMFILTERS
 * LOGICA DE ESPEJO REAL - NO INVENTA TIERS
 * Actualizado para trabajar con nuevo formato de donaldsonScraper
 */

const PREFIX_MAP = {
    'LUBE_OIL': 'EL8', 'FUEL_SYSTEM': 'EF9', 'FUEL_SEPARATOR': 'ES9',
    'AIR_SYSTEM': 'EA1', 'CABIN_FILTER': 'EC1', 'COOLANT_SYS': 'EW7',
    'HYDRAULIC_SYS': 'EH6', 'AIR_DRYER': 'ED4', 'MARINE_FILTER': 'EM9',
    'TURBINE_FUEL': 'ET9', 'AIR_HOUSING': 'EA2', 'KIT_HD': 'EK5', 'KIT_LD': 'EK3'
};

const TIER_DESCRIPTIONS = {
    ELITE: "Maximum synthetic protection for extreme service. Tecnología Sintética Propietaria. Utiliza fibras sintéticas de menor diámetro y forma uniforme para máxima eficiencia.",
    PERFORMANCE: "Enhanced efficiency and dirt-holding capacity. Servicio estándar. Utiliza fibras de papel tratadas con resinas para una filtración básica confiable.",
    STANDARD: "Engineered for everyday operational demands. Flujo optimizado. Prioriza el paso del aceite (flujo) sobre la finura de filtrado, común en motores de generación anterior."
};

class DetectionService {
    constructor() {
        this.auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        
        this.doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID, this.auth);
        this.sheetsInitialized = false;
    }

    async initSheets() {
        if (this.sheetsInitialized) return;
        try {
            await this.doc.loadInfo();
            console.log(`📊 Google Sheets connected: ${this.doc.title}`);
            this.sheetsInitialized = true;
        } catch (error) {
            console.error('❌ Error connecting to Google Sheets:', error.message);
            throw error;
        }
    }

    async searchInBothSources(searchTerm) {
        try {
            const mongoResults = await mongoService.searchFilters(searchTerm);
            if (mongoResults && mongoResults.length > 0) return mongoResults;

            const sheetsResults = await this.searchInSheets(searchTerm);
            return sheetsResults;
        } catch (error) {
            console.error('❌ Error searching in both sources:', error.message);
            return null;
        }
    }

    async searchInSheets(searchTerm) {
        try {
            await this.initSheets();
            const sheet = this.doc.sheetsByTitle['MASTER_UNIFIED_V5'] || this.doc.sheetsByIndex[0];
            const rows = await sheet.getRows();
            const term = searchTerm.toString().toLowerCase().trim();
            
            const matchingRows = rows.filter(row => {
                const inputCode = row.get('Input Code')?.toString().toLowerCase() || '';
                const sku = row.get('ELIMFILTERS SKU')?.toString().toLowerCase() || '';
                const crossRef = row.get('Cross Reference Codes')?.toString().toLowerCase() || '';
                const oemCodes = row.get('OEM Codes')?.toString().toLowerCase() || '';
                return inputCode === term || sku === term || crossRef.includes(term) || oemCodes.includes(term);
            });
            
            if (matchingRows.length > 0) {
                const finalResults = [];
                for (const row of matchingRows) {
                    const sku = row.get('ELIMFILTERS SKU');
                    const maintenanceKits = await this.getKitsForSku(sku);
                    
                    finalResults.push({
                        sku: sku,
                        description: row.get('Description'),
                        filterType: row.get('Filter Type'),
                        tier: row.get('Tier System'),
                        tier_description: TIER_DESCRIPTIONS[row.get('Tier System')] || '',
                        duty: row.get('Duty'),
                        microns: row.get('Micron Rating'),
                        specifications: {
                            thread_size: row.get('Thread Size'),
                            gasket_od: row.get('Gasket OD (mm)'),
                            media_type: row.get('Media Type')
                        },
                        equipment: row.get('Equipment Applications'),
                        oem_codes: row.get('OEM Codes'),
                        cross_references: row.get('Cross Reference Codes'),
                        maintenance_kits: maintenanceKits,
                        source: 'Google Sheets'
                    });
                }
                return finalResults;
            }
            return null;
        } catch (error) {
            console.error('❌ Error in searchInSheets:', error.message);
            return null;
        }
    }

    async getKitsForSku(sku) {
        try {
            const kitSheet = this.doc.sheetsByTitle['MASTER_KITS_V1'];
            if (!kitSheet) return [];
            const rows = await kitSheet.getRows();
            
            return rows.filter(row => {
                const included = row.get('filters_included')?.toString() || '';
                return included.includes(sku);
            }).map(row => ({
                kit_sku: row.get('kit_sku'),
                qty: this.extractQty(row.get('filters_included'), sku),
                family: row.get('kit_sku')?.substring(0, 3)
            }));
        } catch (e) { return []; }
    }

    extractQty(text, sku) {
        const regex = new RegExp(`${sku}\\((\\d+)\\)`);
        const match = text.match(regex);
        return match ? match[1] : "1";
    }

    async processSearch(searchTerm) {
        try {
            const existingData = await this.searchInBothSources(searchTerm);
            if (existingData) return { success: true, source: 'cached', data: existingData };
            
            const dutyAnalysis = await groqService.detectDuty(searchTerm);
            
            // NUEVO: El scraper ahora devuelve un objeto estructurado, no un array
            let donaldsonData = null;
            
            if (dutyAnalysis.duty === 'HD') {
                donaldsonData = await donaldsonScraper.search(searchTerm);
            } else {
                donaldsonData = await framScraper.search(searchTerm);
            }
            
            // VALIDACIÓN: Verificar que tenemos datos válidos
            if (!donaldsonData || !donaldsonData.mainProduct || !donaldsonData.mainProduct.code) {
                throw new Error('No cross-references found');
            }

            console.log(`✅ Datos obtenidos del scraper:`);
            console.log(`   - Producto principal: ${donaldsonData.mainProduct.code}`);
            console.log(`   - Alternativos: ${donaldsonData.alternatives.length}`);
            console.log(`   - Cross-refs: ${donaldsonData.crossReferences.length}`);
            console.log(`   - Especificaciones: ${Object.keys(donaldsonData.specifications).length}`);

            // NUEVO: Construir array de productos (TRILOGY)
            const products = [];
            
            // Agregar producto principal
            products.push({
                originalCode: donaldsonData.mainProduct.code,
                tier: donaldsonData.mainProduct.tier,
                description: donaldsonData.mainProduct.description,
                systemKey: this.detectSystemKey(donaldsonData.mainProduct.description),
                specs: donaldsonData.specifications,
                source: 'Donaldson'
            });
            
            // Agregar alternativos (si existen)
            donaldsonData.alternatives.forEach(alt => {
                products.push({
                    originalCode: alt.code,
                    tier: alt.tier,
                    description: alt.description,
                    systemKey: this.detectSystemKey(alt.description),
                    specs: donaldsonData.specifications, // Comparten las mismas specs
                    source: 'Donaldson'
                });
            });

            // Generar SKUs para cada producto
            const skuData = products.map(product => {
                const prefix = PREFIX_MAP[product.systemKey] || 'EL8';
                const last4Digits = product.originalCode.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
                
                let sku = `${prefix}${last4Digits}`;
                
                // Manejo especial para ET9
                if (prefix === 'ET9') {
                    const microns = product.microns || this.extractMicronsFromCode(product.originalCode);
                    if (microns == 2) sku += 'S';
                    else if (microns == 10) sku += 'T';
                    else if (microns == 30) sku += 'P';
                }
                
                return {
                    sku: sku,
                    tier: product.tier,
                    tier_description: TIER_DESCRIPTIONS[product.tier] || '',
                    crossRefCode: product.originalCode,
                    prefix: prefix,
                    microns: product.microns || (product.tier === 'ELITE' ? 15 : 21),
                    specs: product.specs,
                    description: product.description || `${product.tier} Filter`,
                    systemKey: product.systemKey,
                    // NUEVO: Agregar cross-references y OEM codes
                    crossReferences: donaldsonData.crossReferences,
                    equipment: donaldsonData.equipment
                };
            });

            console.log(`✅ SKUs generados: ${skuData.length}`);
            skuData.forEach(sku => {
                console.log(`   - ${sku.sku} (${sku.tier}) - ${sku.crossRefCode}`);
            });

            // Guardar en MongoDB y Sheets
            await Promise.all([
                mongoService.saveFilters(searchTerm, skuData, dutyAnalysis, 'Donaldson'),
                this.writeToSheets(searchTerm, skuData, dutyAnalysis, donaldsonData)
            ]);

            // Preparar respuesta para el frontend
            const responseData = skuData.map(sku => ({
                sku: sku.sku,
                tier: sku.tier,
                tier_description: sku.tier_description,
                description: sku.description,
                filterType: sku.systemKey?.replace(/_/g, ' '),
                duty: dutyAnalysis.duty,
                microns: sku.microns,
                specifications: sku.specs,
                equipment: donaldsonData.equipment,
                oem_codes: this.formatOEMCodes(donaldsonData.crossReferences),
                cross_references: this.formatCrossReferences(donaldsonData.crossReferences),
                maintenance_kits: [],
                source: 'AI Generated'
            }));

            return { success: true, source: 'generated', data: responseData };
            
        } catch (error) {
            console.error(`❌ Error processing search:`, error.message);
            return { success: false, error: error.message };
        }
    }

    detectSystemKey(description) {
        const desc = description.toLowerCase();
        
        if (desc.includes('lubric') || desc.includes('aceite') || desc.includes('oil')) {
            return 'LUBE_OIL';
        }
        if (desc.includes('air') || desc.includes('aire')) {
            return 'AIR_SYSTEM';
        }
        if (desc.includes('fuel') || desc.includes('combust')) {
            return 'FUEL_SYSTEM';
        }
        if (desc.includes('hydraulic') || desc.includes('hidráulico')) {
            return 'HYDRAULIC_SYS';
        }
        if (desc.includes('coolant') || desc.includes('refriger')) {
            return 'COOLANT_SYS';
        }
        
        return 'LUBE_OIL'; // Default
    }

    extractMicronsFromCode(code) {
        if (code.includes('PM')) return 30;
        if (code.includes('TM')) return 10;
        if (code.includes('SM')) return 2;
        return null;
    }

    formatOEMCodes(crossReferences) {
        return crossReferences
            .filter(ref => ref.type === 'OEM')
            .map(ref => `${ref.brand}: ${ref.code}`)
            .join(', ');
    }

    formatCrossReferences(crossReferences) {
        return crossReferences
            .filter(ref => ref.type === 'Aftermarket')
            .map(ref => `${ref.brand}: ${ref.code}`)
            .join(', ');
    }

    async writeToSheets(originalCode, skuData, duty, donaldsonData) {
        try {
            await this.initSheets();
            const sheet = this.doc.sheetsByTitle['MASTER_UNIFIED_V5'] || this.doc.sheetsByIndex[0];
            const timestamp = new Date().toISOString();
            
            const rows = skuData.map(sku => this.buildRow(
                originalCode, 
                sku, 
                duty, 
                donaldsonData,
                timestamp
            ));
            
            await sheet.addRows(rows);
            console.log(`✅ ${rows.length} filas agregadas a Google Sheets`);
            return { success: true };
        } catch (error) { 
            console.error('❌ Error writing to sheets:', error.message);
            return { success: false }; 
        }
    }

    buildRow(originalCode, skuData, duty, donaldsonData, timestamp) {
        const { sku, tier, crossRefCode, prefix, microns, specs } = skuData;
        
        return {
            'Input Code': originalCode,
            'ELIMFILTERS SKU': sku,
            'Description': `${tier} Filter | Replaces ${crossRefCode}`,
            'Filter Type': skuData.systemKey?.replace(/_/g, ' '),
            'Prefix': prefix,
            'Duty': duty.duty,
            'Tier System': tier,
            'Thread Size': specs ? specs['Rosca'] || specs['Thread Size'] || '' : '',
            'Micron Rating': microns,
            'Media Type': tier === 'ELITE' ? 'Full Synthetic' : tier === 'STANDARD' ? 'Cellulose' : 'Synthetic Blend',
            'OEM Codes': this.formatOEMCodes(donaldsonData.crossReferences),
            'Cross Reference Codes': this.formatCrossReferences(donaldsonData.crossReferences),
            'Equipment Applications': donaldsonData.equipment.map(e => e.equipment).join(', '),
            'audit_status': 'AI_GENERATED',
            'audit_status_38_0': timestamp
        };
    }
}

module.exports = new DetectionService();
