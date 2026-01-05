const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const groqService = require('./groqService');
const mongoService = require('./mongoService');
const donaldsonScraper = require('../../donaldsonScraper');
const framScraper = require('../../framScraper');

/**
 * Detection Service v11.0 - ELIMFILTERS
 * CON MONGODB INTEGRADO
 * 
 * FLUJO COMPLETO:
 * 1. Buscar en MongoDB (rápido)
 * 2. Si no existe → Buscar en Google Sheets (backup)
 * 3. Si tampoco existe:
 *    a. GROQ detecta DUTY (HD/LD)
 *    b. Scraper v2.0 retorna 1-3 resultados CON specs completas
 *    c. Generar SKUs
 *    d. Guardar en MongoDB Y Google Sheets (dual storage)
 *    e. Retornar datos
 */

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

    /**
     * Busca en ambas fuentes: MongoDB (primero) y Google Sheets (backup)
     */
    async searchInBothSources(searchTerm) {
        try {
            // PRIORIDAD 1: MongoDB (más rápido)
            console.log('🔍 Searching in MongoDB first...');
            const mongoResults = await mongoService.searchFilters(searchTerm);
            
            if (mongoResults && mongoResults.length > 0) {
                console.log(`✅ Found ${mongoResults.length} results in MongoDB`);
                return mongoResults;
            }

            // PRIORIDAD 2: Google Sheets (backup)
            console.log('🔍 Searching in Google Sheets...');
            const sheetsResults = await this.searchInSheets(searchTerm);
            
            if (sheetsResults && sheetsResults.length > 0) {
                console.log(`✅ Found ${sheetsResults.length} results in Google Sheets`);
                return sheetsResults;
            }

            return null;
        } catch (error) {
            console.error('❌ Error searching in both sources:', error.message);
            return null;
        }
    }

    /**
     * Busca solo en Google Sheets (método backup)
     */
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
                
                return inputCode === term || 
                       sku === term || 
                       crossRef.includes(term) ||
                       oemCodes.includes(term);
            });
            
            if (matchingRows.length > 0) {
                return matchingRows.map(row => ({
                    sku: row.get('ELIMFILTERS SKU'),
                    description: row.get('Description'),
                    filterType: row.get('Filter Type'),
                    tier: row.get('Tier System'),
                    duty: row.get('Duty'),
                    microns: row.get('Micron Rating'),
                    mediaType: row.get('Media Type'),
                    technology: row.get('Filtration Technology'),
                    applications: row.get('Equipment Applications'),
                    crossReference: row.get('Cross Reference Codes'),
                    prefix: row.get('Prefix'),
                    iso: row.get('ISO Test Method'),
                    source: 'Google Sheets'
                }));
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error searching in Google Sheets:', error.message);
            return null;
        }
    }

    /**
     * Procesa búsqueda completa con MongoDB + Sheets + AI
     */
    async processSearch(searchTerm) {
        try {
            console.log(`🔍 Processing search for: ${searchTerm}`);
            
            // PASO 1: Buscar en MongoDB Y Google Sheets
            const existingData = await this.searchInBothSources(searchTerm);
            
            if (existingData) {
                console.log(`✅ Data found in cache, returning results`);
                return {
                    success: true,
                    source: 'cached',
                    data: existingData
                };
            }
            
            console.log(`⚡ No data in cache, starting AI-powered generation...`);
            
            // PASO 2: GROQ detecta DUTY
            const dutyAnalysis = await groqService.detectDuty(searchTerm);
            console.log(`🤖 DUTY detected: ${dutyAnalysis.duty} (${dutyAnalysis.manufacturer})`);
            
            // PASO 3: Scraping según DUTY (scrapers v2.0 con specs completas)
            let scraperResults;
            let scraperSource;
            
            if (dutyAnalysis.duty === 'HD') {
                console.log(`🔧 Using Donaldson scraper v2.0 for HD...`);
                scraperResults = await donaldsonScraper.search(searchTerm);
                scraperSource = 'Donaldson';
            } else {
                console.log(`🚗 Using FRAM scraper v2.0 for LD...`);
                scraperResults = await framScraper.search(searchTerm);
                scraperSource = 'FRAM';
            }
            
            if (!scraperResults || scraperResults.length === 0) {
                throw new Error('No cross-references found in scraper');
            }
            
            console.log(`📋 Scraper v2.0 found ${scraperResults.length} results with complete specs`);
            
            // PASO 4: Generar SKUs
            const skuData = scraperResults.map(result => {
                const last4Digits = result.code.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
                const sku = `${result.prefix}${last4Digits}`;
                
                return {
                    sku: sku,
                    tier: result.tier,
                    crossRefCode: result.code,
                    prefix: result.prefix,
                    microns: result.microns,
                    mediaType: result.mediaType,
                    technology: result.technology,
                    iso: result.iso,
                    systemKey: result.systemKey,
                    specs: result.specs,
                    description: result.description
                };
            });
            
            console.log(`🏗️  Generated ${skuData.length} SKUs with complete specs`);
            
            // PASO 5: Guardar en AMBOS (MongoDB Y Google Sheets)
            await Promise.all([
                mongoService.saveFilters(searchTerm, skuData, dutyAnalysis, scraperSource),
                this.writeToSheets(searchTerm, skuData, dutyAnalysis, scraperSource)
            ]);
            
            console.log(`✅ Saved to both MongoDB and Google Sheets`);
            
            // PASO 6: Retornar datos formateados
            const responseData = skuData.map(sku => ({
                sku: sku.sku,
                description: sku.description,
                filterType: sku.systemKey?.replace(/_/g, ' '),
                tier: sku.tier,
                duty: dutyAnalysis.duty,
                microns: sku.microns,
                mediaType: sku.mediaType,
                technology: sku.technology,
                applications: dutyAnalysis.duty === 'HD' 
                    ? 'Heavy Duty Equipment (CAT, Cummins, Volvo)' 
                    : 'Light Duty Vehicles (Ford, Toyota, Nissan)',
                crossReference: sku.crossRefCode,
                prefix: sku.prefix,
                iso: sku.iso,
                source: 'AI Generated'
            }));
            
            console.log(`✅ Search processed successfully for ${searchTerm}`);
            
            return {
                success: true,
                source: 'generated',
                data: responseData,
                metadata: {
                    dutyAnalysis: dutyAnalysis,
                    scraperSource: scraperSource,
                    savedTo: ['MongoDB', 'Google Sheets'],
                    generatedAt: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error(`❌ Error processing search for ${searchTerm}:`, error.message);
            
            return {
                success: false,
                error: error.message,
                searchTerm: searchTerm
            };
        }
    }

    /**
     * Escribe en Google Sheets (método simplificado)
     */
    async writeToSheets(originalCode, skuData, duty, scraperSource) {
        try {
            await this.initSheets();
            
            const sheet = this.doc.sheetsByTitle['MASTER_UNIFIED_V5'] || this.doc.sheetsByIndex[0];
            const timestamp = new Date().toISOString();
            
            const rows = skuData.map(sku => this.buildRow(originalCode, sku, duty, scraperSource, timestamp));
            
            await sheet.addRows(rows);
            
            console.log(`✅ Google Sheets: Written ${rows.length} SKUs for ${originalCode}`);
            
            return { success: true, rowsWritten: rows.length };
        } catch (error) {
            console.error('❌ Google Sheets write error:', error.message);
            // No throw - continuar aunque Sheets falle
            return { success: false, error: error.message };
        }
    }

    /**
     * Construye una fila con las 59 columnas
     */
    buildRow(originalCode, skuData, duty, scraperSource, timestamp) {
        const { sku, tier, crossRefCode, prefix, microns, mediaType, technology, iso, specs } = skuData;
        
        return {
            'Input Code': originalCode,
            'ELIMFILTERS SKU': sku,
            'Description': `${technology} ${tier} Filter | Replaces ${originalCode}`,
            'Filter Type': skuData.systemKey?.replace(/_/g, ' '),
            'Prefix': prefix,
            'Duty': duty.duty,
            'Application': duty.duty === 'HD' ? 'Heavy Duty Equipment' : 'Light Duty Vehicles',
            'Tier System': tier,
            'Thread Size': specs['Thread Size'] || '',
            'Height (mm)': specs['Height'] || specs['Height (mm)'] || '',
            'Height (inch)': specs['Height (inch)'] || '',
            'Outer Diameter (mm)': specs['Outer Diameter'] || specs['OD'] || '',
            'Outer Diameter (inch)': specs['Outer Diameter (inch)'] || '',
            'Inner Diameter (mm)': specs['Inner Diameter'] || specs['ID'] || '',
            'Gasket OD (mm)': specs['Gasket OD'] || '',
            'Gasket OD (inch)': '',
            'Gasket ID (mm)': specs['Gasket ID'] || '',
            'Gasket ID (inch)': '',
            'ISO Test Method': iso,
            'Micron Rating': microns,
            'Beta Ratio': this.getBetaRatio(tier),
            'Nominal Efficiency (%)': this.getEfficiency(tier),
            'Rated Flow (L/min)': specs['Flow Rate'] || '',
            'Rated Flow (GPM)': specs['Flow Rate (GPM)'] || '',
            'Rated Flow (CFM)': '',
            'Max Pressure (PSI)': specs['Max Pressure'] || this.getMaxPressure(skuData.systemKey),
            'Burst Pressure (PSI)': specs['Burst Pressure'] || '',
            'Collapse Pressure (PSI)': specs['Collapse Pressure'] || '',
            'Bypass Valve Pressure (PSI)': specs['Bypass Pressure'] || '',
            'Media Type': mediaType,
            'Seal Material': specs['Seal Material'] || 'Nitrile (Buna-N)',
            'Housing Material': specs['Housing Material'] || 'Steel',
            'End Cap Material': specs['End Cap Material'] || 'Steel',
            'Anti-Drainback Valve': skuData.systemKey === 'LUBE_OIL' ? 'Yes' : 'No',
            'Dirt Holding Capacity (g)': this.getDirtHolding(tier),
            'Service Life (hours)': this.getServiceLife(tier),
            'Change Interval (km)': '',
            'Operating Temp Min (°C)': specs['Min Temperature'] || '-40',
            'Operating Temp Max (°C)': specs['Max Temperature'] || this.getMaxTemp(tier),
            'Fluid Compatibility': this.getFluidCompatibility(skuData.systemKey),
            'Biodiesel Compatible': skuData.systemKey?.includes('FUEL') ? 'Yes' : 'N/A',
            'Filtration Technology': technology,
            'Special Features': this.getSpecialFeatures(tier),
            'OEM Codes': originalCode,
            'Cross Reference Codes': crossRefCode,
            'Equipment Applications': duty.duty === 'HD' ? 'CAT, Cummins, Volvo, Mack' : 'Ford, Toyota, Honda',
            'Engine Applications': '',
            'Equipment Year': '',
            'Qty Required': '1',
            'EM9 Flag': skuData.systemKey === 'MARINE_FILTER' ? 'Yes' : 'No',
            'ET9 Flag': skuData.systemKey === 'TURBINE_FUEL' ? 'Yes' : 'No',
            'Special Conditions': '',
            'Stock Status': 'Available',
            'Warranty': '12 months',
            'Operating Cost ($/hour)': '',
            'Technical Sheet URL': '',
            'audit_status': 'AI_GENERATED',
            'url_technical_sheet_pdf': '',
            'audit_status_38_0': timestamp
        };
    }

    // Helper methods
    getBetaRatio(tier) {
        return tier === 'ELITE' ? 'β15 > 200' : tier === 'PERFORMANCE' ? 'β20 > 75' : 'β40 > 20';
    }

    getEfficiency(tier) {
        return tier === 'ELITE' ? '99.9' : tier === 'PERFORMANCE' ? '98.7' : '95.0';
    }

    getMaxPressure(systemKey) {
        if (systemKey === 'HYDRAULIC_SYS') return '3000';
        if (systemKey?.includes('FUEL')) return '150';
        return '175';
    }

    getDirtHolding(tier) {
        return tier === 'ELITE' ? '450' : tier === 'PERFORMANCE' ? '350' : '250';
    }

    getServiceLife(tier) {
        return tier === 'ELITE' ? '500' : tier === 'PERFORMANCE' ? '400' : '300';
    }

    getMaxTemp(tier) {
        return tier === 'ELITE' ? '150' : tier === 'PERFORMANCE' ? '135' : '120';
    }

    getFluidCompatibility(systemKey) {
        const compatibility = {
            'LUBE_OIL': 'Mineral Oil, Synthetic Oil, Biodiesel B20',
            'FUEL_SYSTEM': 'Diesel, Biodiesel B100, Gasoline',
            'FUEL_SEPARATOR': 'Diesel, Biodiesel B100',
            'HYDRAULIC_SYS': 'Hydraulic Oil, ATF',
            'AIR_SYSTEM': 'N/A',
            'COOLANT_SYS': 'Ethylene Glycol, Propylene Glycol',
            'MARINE_FILTER': 'Marine Diesel, Gasoline'
        };
        return compatibility[systemKey] || 'Per Manufacturer Specs';
    }

    getSpecialFeatures(tier) {
        return tier === 'ELITE' 
            ? 'Synthetic media, Extended service intervals, Superior dirt holding'
            : tier === 'PERFORMANCE'
            ? 'Enhanced celulosa, Improved efficiency, Balanced flow'
            : 'Reliable standard filtration, Cost-effective';
    }
}

module.exports = new DetectionService();
