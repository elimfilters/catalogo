const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const groqService = require('./groqService');
const mongoService = require('./mongoService');
const donaldsonScraper = require('../../donaldsonScraper');
const framScraper = require('../../framScraper');

/**
 * Detection Service v11.0.2 - ELIMFILTERS
 * LOGICA DE ESPEJO REAL - NO INVENTA TIERS
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
            let scraperResults = (dutyAnalysis.duty === 'HD') 
                ? await donaldsonScraper.search(searchTerm) 
                : await framScraper.search(searchTerm);
            
            if (!scraperResults || scraperResults.length === 0) throw new Error('No cross-references found');

            // CORRECCIÓN ESPEJO: Mapeamos los productos reales encontrados (1, 2 o 3)
            const skuData = scraperResults.map(result => {
                const prefix = PREFIX_MAP[result.systemKey] || 'EL8';
                
                // CORRECCIÓN: Usamos result.originalCode (ej. P554105) en lugar del término buscado
                const codeToUse = result.originalCode || searchTerm;
                const last4Digits = codeToUse.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
                
                let sku = `${prefix}${last4Digits}`;
                if (prefix === 'ET9') {
                    if (result.microns == 2) sku += 'S';
                    else if (result.microns == 10) sku += 'T';
                    else if (result.microns == 30) sku += 'P';
                }
                
                return {
                    sku: sku,
                    tier: result.tier,
                    tier_description: TIER_DESCRIPTIONS[result.tier] || '',
                    crossRefCode: codeToUse, // El código real del espejo
                    prefix: prefix,
                    microns: result.microns || (result.tier === 'ELITE' ? 15 : 21),
                    specs: result.specs, // Mantiene la tabla técnica del espejo
                    description: result.description || `${result.tier} Filter`,
                    systemKey: result.systemKey
                };
            });

            await Promise.all([
                mongoService.saveFilters(searchTerm, skuData, dutyAnalysis, scraperResults[0].source),
                this.writeToSheets(searchTerm, skuData, dutyAnalysis, scraperResults[0].source)
            ]);

            const responseData = skuData.map(sku => ({
                sku: sku.sku,
                tier: sku.tier,
                tier_description: sku.tier_description,
                description: sku.description,
                filterType: sku.systemKey?.replace(/_/g, ' '),
                duty: dutyAnalysis.duty,
                microns: sku.microns,
                specifications: sku.specs, // Ya no vendrá "N/A" si el scraper lo capturó
                equipment: dutyAnalysis.duty === 'HD' ? 'Heavy Duty Equipment (CAT, Cummins)' : 'Light Duty Vehicles',
                oem_codes: searchTerm,
                cross_references: sku.crossRefCode,
                maintenance_kits: [],
                source: 'AI Generated'
            }));

            return { success: true, source: 'generated', data: responseData };
            
        } catch (error) {
            console.error(`❌ Error processing search:`, error.message);
            return { success: false, error: error.message };
        }
    }

    async writeToSheets(originalCode, skuData, duty, scraperSource) {
        try {
            await this.initSheets();
            const sheet = this.doc.sheetsByTitle['MASTER_UNIFIED_V5'] || this.doc.sheetsByIndex[0];
            const timestamp = new Date().toISOString();
            const rows = skuData.map(sku => this.buildRow(originalCode, sku, duty, scraperSource, timestamp));
            await sheet.addRows(rows);
            return { success: true };
        } catch (error) { return { success: false }; }
    }

    buildRow(originalCode, skuData, duty, scraperSource, timestamp) {
        const { sku, tier, crossRefCode, prefix, microns, specs } = skuData;
        return {
            'Input Code': originalCode,
            'ELIMFILTERS SKU': sku,
            'Description': `${tier} Filter | Replaces ${originalCode}`,
            'Filter Type': skuData.systemKey?.replace(/_/g, ' '),
            'Prefix': prefix,
            'Duty': duty.duty,
            'Tier System': tier,
            'Thread Size': specs ? specs['Thread Size'] || '' : '',
            'Micron Rating': microns,
            'Media Type': skuData.mediaType || 'Cellulose',
            'OEM Codes': originalCode,
            'Cross Reference Codes': crossRefCode,
            'Equipment Applications': duty.duty === 'HD' ? 'CAT, Cummins, Volvo, Mack' : 'Ford, Toyota, Honda',
            'audit_status': 'AI_GENERATED',
            'audit_status_38_0': timestamp
        };
    }
}

module.exports = new DetectionService();
