const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

/**
 * Kits Service - ELIMFILTERS
 * Maneja búsquedas de kits de mantenimiento (EK5 HD, EK3 LD)
 * Para búsquedas por VIN y Equipment
 */

class KitsService {
    constructor() {
        this.auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        
        this.doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID, this.auth);
        this.initialized = false;
    }

    /**
     * Inicializa la conexión a Google Sheets
     */
    async init() {
        if (this.initialized) return;
        
        try {
            await this.doc.loadInfo();
            this.initialized = true;
        } catch (error) {
            console.error('❌ Error connecting to Google Sheets:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene la sheet MASTER_KITS_V1
     */
    async getKitsSheet() {
        await this.init();
        return this.doc.sheetsByTitle['MASTER_KITS_V1'];
    }

    /**
     * Busca kits por VIN
     * @param {string} vin - VIN del vehículo
     * @returns {Array} Array de kits aplicables
     */
    async searchByVIN(vin) {
        try {
            console.log(`🔍 Searching kits for VIN: ${vin}`);
            
            const sheet = await this.getKitsSheet();
            
            if (!sheet) {
                console.log('⚠️  MASTER_KITS_V1 sheet not found');
                return [];
            }
            
            const rows = await sheet.getRows();
            
            // Buscar por Equipment Applications (debería contener info de VIN/modelo)
            const matchingKits = rows.filter(row => {
                const equipmentApps = row.get('equipment_applications')?.toString().toLowerCase() || '';
                const engineApps = row.get('engine_applications')?.toString().toLowerCase() || '';
                
                // Match por VIN o por modelo/marca derivado del VIN
                return equipmentApps.includes(vin.toLowerCase()) || 
                       this.matchVINtoEquipment(vin, equipmentApps, engineApps);
            });
            
            const kits = matchingKits.map(row => this.formatKit(row));
            
            console.log(`✅ Found ${kits.length} kits for VIN ${vin}`);
            
            return kits;
        } catch (error) {
            console.error('❌ Error searching kits by VIN:', error.message);
            return [];
        }
    }

    /**
     * Busca kits por Equipment (marca/modelo)
     * @param {string} equipment - Marca y modelo (ej: "Caterpillar 320D")
     * @returns {Array} Array de kits aplicables
     */
    async searchByEquipment(equipment) {
        try {
            console.log(`🔍 Searching kits for Equipment: ${equipment}`);
            
            const sheet = await this.getKitsSheet();
            
            if (!sheet) {
                console.log('⚠️  MASTER_KITS_V1 sheet not found');
                return [];
            }
            
            const rows = await sheet.getRows();
            
            const searchTerms = equipment.toLowerCase().split(' ');
            
            // Buscar por Equipment Applications y Engine Applications
            const matchingKits = rows.filter(row => {
                const equipmentApps = row.get('equipment_applications')?.toString().toLowerCase() || '';
                const engineApps = row.get('engine_applications')?.toString().toLowerCase() || '';
                const desc = row.get('kit_description_en')?.toString().toLowerCase() || '';
                
                // Match si contiene alguno de los términos de búsqueda
                return searchTerms.some(term => 
                    equipmentApps.includes(term) || 
                    engineApps.includes(term) ||
                    desc.includes(term)
                );
            });
            
            const kits = matchingKits.map(row => this.formatKit(row));
            
            console.log(`✅ Found ${kits.length} kits for Equipment ${equipment}`);
            
            return kits;
        } catch (error) {
            console.error('❌ Error searching kits by Equipment:', error.message);
            return [];
        }
    }

    /**
     * Formatea los datos de un kit para la respuesta
     */
    formatKit(row) {
        return {
            kit_sku: row.get('kit_sku') || '',
            kit_type: row.get('kit_type') || '',
            kit_series: row.get('kit_series') || '',
            description: row.get('kit_description_en') || '',
            filters_included: this.parseFiltersIncluded(row.get('filters_included')),
            equipment_applications: row.get('equipment_applications') || '',
            engine_applications: row.get('engine_applications') || '',
            industry_segment: row.get('industry_segment') || '',
            warranty_months: row.get('warranty_months') || '12',
            change_interval_km: row.get('change_interval_km') || '',
            change_interval_hours: row.get('change_interval_hours') || '',
            oem_kit_reference: row.get('oem_kit_reference') || '',
            product_image_url: row.get('product_image_url') || '',
            stock_status: row.get('stock_status') || 'Available'
        };
    }

    /**
     * Parsea los filtros incluidos en el kit
     * Formato esperado: "EL81808, EA1xxxx, EF9xxxx" o JSON
     */
    parseFiltersIncluded(filtersString) {
        if (!filtersString) return [];
        
        try {
            // Intentar parsear como JSON primero
            return JSON.parse(filtersString);
        } catch {
            // Si no es JSON, split por comas
            return filtersString.split(',').map(f => f.trim()).filter(f => f);
        }
    }

    /**
     * Helper para hacer match de VIN a Equipment
     * Extrae marca/modelo del VIN usando los primeros caracteres
     */
    matchVINtoEquipment(vin, equipmentApps, engineApps) {
        // VIN Position 1-3: World Manufacturer Identifier (WMI)
        const wmi = vin.substring(0, 3).toUpperCase();
        
        // Mapeo común de WMI a fabricantes
        const wmiMap = {
            '1FT': 'Ford',
            '1GC': 'Chevrolet',
            '1GT': 'GMC',
            '2C3': 'Chrysler',
            '2G1': 'Chevrolet',
            '3FA': 'Ford',
            '4T1': 'Toyota',
            '5NP': 'Hyundai',
            'JM1': 'Mazda',
            'WBA': 'BMW',
            'WDB': 'Mercedes-Benz',
            'YV1': 'Volvo',
            // Heavy Duty
            'CAT': 'Caterpillar',
            '1XP': 'Peterbilt',
            '4DR': 'Kenworth'
        };
        
        const manufacturer = wmiMap[wmi];
        
        if (manufacturer) {
            return equipmentApps.toLowerCase().includes(manufacturer.toLowerCase()) ||
                   engineApps.toLowerCase().includes(manufacturer.toLowerCase());
        }
        
        return false;
    }

    /**
     * Búsqueda genérica que intenta ambos métodos
     */
    async search(searchTerm) {
        // Si parece un VIN (17 caracteres alfanuméricos)
        if (searchTerm.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/i.test(searchTerm)) {
            return await this.searchByVIN(searchTerm);
        }
        
        // Si no, buscar como Equipment
        return await this.searchByEquipment(searchTerm);
    }
}

module.exports = new KitsService();
