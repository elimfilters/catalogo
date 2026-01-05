const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

/**
 * Kits Service v11.0 - ELIMFILTERS
 * Maneja búsquedas de kits de mantenimiento (EK5 HD, EK3 LD)
 * Desglose de componentes y generación de SKUs aleatorios.
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

    async getKitsSheet() {
        await this.init();
        return this.doc.sheetsByTitle['MASTER_KITS_V1'];
    }

    /**
     * Genera un SKU aleatorio de 4 dígitos para KITS (EK5 o EK3)
     * "Aleatorios pero no repetitivos"
     */
    async generateRandomKitSku(dutyType, existingRows) {
        const prefix = dutyType === 'HD' ? 'EK5' : 'EK3';
        const existingSkus = existingRows.map(r => r.get('kit_sku'));
        
        let newSku = '';
        let isUnique = false;

        while (!isUnique) {
            const randomNum = Math.floor(1000 + Math.random() * 9000).toString(); // 4 dígitos
            newSku = `${prefix}${randomNum}`;
            if (!existingSkus.includes(newSku)) {
                isUnique = true;
            }
        }
        return newSku;
    }

    async searchByVIN(vin) {
        try {
            const sheet = await this.getKitsSheet();
            if (!sheet) return [];
            
            const rows = await sheet.getRows();
            const matchingKits = rows.filter(row => {
                const equipmentApps = row.get('equipment_applications')?.toString().toLowerCase() || '';
                const engineApps = row.get('engine_applications')?.toString().toLowerCase() || '';
                const skuBase = row.get('sku_base')?.toString().toLowerCase() || ''; // VIN base
                
                return equipmentApps.includes(vin.toLowerCase()) || 
                       skuBase.includes(vin.toLowerCase()) ||
                       this.matchVINtoEquipment(vin, equipmentApps, engineApps);
            });
            
            return matchingKits.map(row => this.formatKit(row));
        } catch (error) {
            console.error('❌ Error searching kits by VIN:', error.message);
            return [];
        }
    }

    async searchByEquipment(equipment) {
        try {
            const sheet = await this.getKitsSheet();
            if (!sheet) return [];
            
            const rows = await sheet.getRows();
            const searchTerms = equipment.toLowerCase().split(' ');
            
            const matchingKits = rows.filter(row => {
                const equipmentApps = row.get('equipment_applications')?.toString().toLowerCase() || '';
                const engineApps = row.get('engine_applications')?.toString().toLowerCase() || '';
                const desc = row.get('kit_description_en')?.toString().toLowerCase() || '';
                
                return searchTerms.some(term => 
                    equipmentApps.includes(term) || engineApps.includes(term) || desc.includes(term)
                );
            });
            
            return matchingKits.map(row => this.formatKit(row));
        } catch (error) {
            console.error('❌ Error searching kits by Equipment:', error.message);
            return [];
        }
    }

    /**
     * Formatea el Kit con el desglose de filtros (Familia y Cantidad)
     */
    formatKit(row) {
        const rawFilters = row.get('filters_included') || '';
        
        return {
            kit_sku: row.get('kit_sku') || '',
            kit_type: row.get('kit_type') || '', // EK5 HD / EK3 LD
            description: row.get('kit_description_en') || '',
            
            // Sección Maintenance Kits desglosada
            maintenance_kits: this.parseFiltersIncluded(rawFilters),
            
            equipment_applications: row.get('equipment_applications') || '',
            engine_applications: row.get('engine_applications') || '',
            industry_segment: row.get('industry_segment') || '',
            warranty_months: row.get('warranty_months') || '12',
            change_interval_km: row.get('change_interval_km') || '',
            change_interval_hours: row.get('change_interval_hours') || '',
            oem_kit_reference: row.get('oem_kit_reference') || '',
            product_image_url: row.get('product_image_url') || '',
            url_technical_sheet_pdf: row.get('url_technical_sheet_pdf') || '',
            stock_status: row.get('stock_status') || 'Available'
        };
    }

    /**
     * Parsea "EL82100(1), EF90345(2)" -> [{part_number: "EL82100", quantity: "1", family: "EL8"}]
     */
    parseFiltersIncluded(filtersString) {
        if (!filtersString) return [];
        
        const parts = filtersString.split(',').map(f => f.trim()).filter(f => f);
        
        return parts.map(part => {
            // Regex para detectar SKU(Cantidad)
            const match = part.match(/^([A-Z0-9]+)\((\d+)\)$/);
            
            if (match) {
                const sku = match[1];
                return {
                    part_number: sku,
                    quantity: match[2],
                    family: sku.substring(0, 3) // Primeros 3 caracteres (EL8, EF9, etc.)
                };
            }
            
            // Fallback si no tiene paréntesis
            return {
                part_number: part,
                quantity: "1",
                family: part.substring(0, 3)
            };
        });
    }

    matchVINtoEquipment(vin, equipmentApps, engineApps) {
        const wmi = vin.substring(0, 3).toUpperCase();
        const wmiMap = {
            '1FT': 'Ford', '1GC': 'Chevrolet', '4T1': 'Toyota', 
            'WBA': 'BMW', 'CAT': 'Caterpillar', '1XP': 'Peterbilt'
        };
        const manufacturer = wmiMap[wmi];
        if (manufacturer) {
            return equipmentApps.toLowerCase().includes(manufacturer.toLowerCase()) ||
                   engineApps.toLowerCase().includes(manufacturer.toLowerCase());
        }
        return false;
    }

    async search(searchTerm) {
        if (searchTerm.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/i.test(searchTerm)) {
            return await this.searchByVIN(searchTerm);
        }
        return await this.searchByEquipment(searchTerm);
    }
}

module.exports = new KitsService();
