const mongoose = require('mongoose');

/**
 * MongoDB Service - ELIMFILTERS
 * Gestiona conexión y operaciones con MongoDB Atlas
 * Base de datos: elimfilters
 * Colecciones: filters (MASTER_UNIFIED_V5), kits (MASTER_KITS_V1)
 */

class MongoService {
    constructor() {
        this.connectionString = process.env.MONGODB_URI || 
            'mongodb+srv://elimfilters:Elliot2025@cluster0.vairwow.mongodb.net/?appName=Cluster0';
        this.connected = false;
        this.db = null;
    }

    /**
     * Conecta a MongoDB Atlas
     */
    async connect() {
        if (this.connected) return;

        try {
            await mongoose.connect(this.connectionString, {
                dbName: 'elimfilters',
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            this.connected = true;
            this.db = mongoose.connection.db;
            
            console.log('✅ MongoDB Atlas connected: elimfilters database');
            
        } catch (error) {
            console.error('❌ MongoDB connection error:', error.message);
            throw error;
        }
    }

    /**
     * Schema para filters (MASTER_UNIFIED_V5)
     * 59 columnas completas
     */
    getFilterSchema() {
        if (mongoose.models.Filter) {
            return mongoose.models.Filter;
        }

        const filterSchema = new mongoose.Schema({
            // Columnas 1-10
            inputCode: { type: String, required: true, index: true },
            sku: { type: String, required: true, unique: true, index: true },
            description: String,
            filterType: String,
            prefix: String,
            duty: String,
            application: String,
            tierSystem: String,
            threadSize: String,
            heightMm: String,
            
            // Columnas 11-20
            heightInch: String,
            outerDiameterMm: String,
            outerDiameterInch: String,
            innerDiameterMm: String,
            gasketOdMm: String,
            gasketOdInch: String,
            gasketIdMm: String,
            gasketIdInch: String,
            isoTestMethod: String,
            micronRating: String,
            
            // Columnas 21-30
            betaRatio: String,
            nominalEfficiency: String,
            ratedFlowLmin: String,
            ratedFlowGpm: String,
            ratedFlowCfm: String,
            maxPressurePsi: String,
            burstPressurePsi: String,
            collapsePressurePsi: String,
            bypassValvePressurePsi: String,
            mediaType: String,
            
            // Columnas 31-40
            sealMaterial: String,
            housingMaterial: String,
            endCapMaterial: String,
            antiDrainbackValve: String,
            dirtHoldingCapacityG: String,
            serviceLifeHours: String,
            changeIntervalKm: String,
            operatingTempMinC: String,
            operatingTempMaxC: String,
            fluidCompatibility: String,
            
            // Columnas 41-50
            biodieselCompatible: String,
            filtrationTechnology: String,
            specialFeatures: String,
            oemCodes: String,
            crossReferenceCodes: { type: String, index: true },
            equipmentApplications: String,
            engineApplications: String,
            equipmentYear: String,
            qtyRequired: String,
            em9Flag: String,
            
            // Columnas 51-59
            et9Flag: String,
            specialConditions: String,
            stockStatus: String,
            warranty: String,
            operatingCost: String,
            technicalSheetUrl: String,
            auditStatus: String,
            urlTechnicalSheetPdf: String,
            createdAt: { type: Date, default: Date.now }
        }, {
            collection: 'filters',
            timestamps: true
        });

        // Índices para búsquedas rápidas
        filterSchema.index({ inputCode: 1 });
        filterSchema.index({ sku: 1 });
        filterSchema.index({ crossReferenceCodes: 1 });
        filterSchema.index({ oemCodes: 1 });

        return mongoose.model('Filter', filterSchema);
    }

    /**
     * Busca filtros en MongoDB
     * @param {string} searchTerm - Código a buscar
     * @returns {Array} Filtros encontrados
     */
    async searchFilters(searchTerm) {
        try {
            await this.connect();

            const Filter = this.getFilterSchema();
            const term = searchTerm.toString().trim();

            // Búsqueda en múltiples campos
            const results = await Filter.find({
                $or: [
                    { inputCode: { $regex: new RegExp(`^${term}$`, 'i') } },
                    { sku: { $regex: new RegExp(`^${term}$`, 'i') } },
                    { crossReferenceCodes: { $regex: new RegExp(term, 'i') } },
                    { oemCodes: { $regex: new RegExp(term, 'i') } }
                ]
            }).limit(10).lean();

            if (results.length > 0) {
                console.log(`✅ MongoDB: Found ${results.length} results for ${searchTerm}`);
            }

            return results.map(r => ({
                sku: r.sku,
                description: r.description,
                filterType: r.filterType,
                tier: r.tierSystem,
                duty: r.duty,
                microns: r.micronRating,
                mediaType: r.mediaType,
                technology: r.filtrationTechnology,
                applications: r.equipmentApplications,
                crossReference: r.crossReferenceCodes,
                prefix: r.prefix,
                iso: r.isoTestMethod,
                source: 'MongoDB'
            }));

        } catch (error) {
            console.error('❌ MongoDB search error:', error.message);
            return [];
        }
    }

    /**
     * Guarda múltiples filtros en MongoDB
     * @param {string} originalCode - Código original
     * @param {Array} skuData - Array de SKUs con datos completos
     * @param {object} duty - Información de DUTY
     * @param {string} scraperSource - Fuente (Donaldson/FRAM)
     */
    async saveFilters(originalCode, skuData, duty, scraperSource) {
        try {
            await this.connect();

            const Filter = this.getFilterSchema();
            const timestamp = new Date();

            const documents = skuData.map(sku => ({
                inputCode: originalCode,
                sku: sku.sku,
                description: sku.description,
                filterType: sku.systemKey?.replace(/_/g, ' '),
                prefix: sku.prefix,
                duty: duty.duty,
                application: duty.duty === 'HD' ? 'Heavy Duty Equipment' : 'Light Duty Vehicles',
                tierSystem: sku.tier,
                threadSize: sku.specs['Thread Size'] || '',
                heightMm: sku.specs['Height'] || sku.specs['Height (mm)'] || '',
                heightInch: sku.specs['Height (inch)'] || '',
                outerDiameterMm: sku.specs['Outer Diameter'] || sku.specs['OD'] || '',
                outerDiameterInch: sku.specs['Outer Diameter (inch)'] || '',
                innerDiameterMm: sku.specs['Inner Diameter'] || sku.specs['ID'] || '',
                gasketOdMm: sku.specs['Gasket OD'] || '',
                gasketOdInch: '',
                gasketIdMm: sku.specs['Gasket ID'] || '',
                gasketIdInch: '',
                isoTestMethod: sku.iso,
                micronRating: sku.microns?.toString(),
                betaRatio: this.getBetaRatio(sku.tier),
                nominalEfficiency: this.getEfficiency(sku.tier),
                ratedFlowLmin: sku.specs['Flow Rate'] || '',
                ratedFlowGpm: sku.specs['Flow Rate (GPM)'] || '',
                ratedFlowCfm: '',
                maxPressurePsi: sku.specs['Max Pressure'] || '',
                burstPressurePsi: sku.specs['Burst Pressure'] || '',
                collapsePressurePsi: sku.specs['Collapse Pressure'] || '',
                bypassValvePressurePsi: sku.specs['Bypass Pressure'] || '',
                mediaType: sku.mediaType,
                sealMaterial: sku.specs['Seal Material'] || 'Nitrile (Buna-N)',
                housingMaterial: sku.specs['Housing Material'] || 'Steel',
                endCapMaterial: sku.specs['End Cap Material'] || 'Steel',
                antiDrainbackValve: sku.systemKey === 'LUBE_OIL' ? 'Yes' : 'No',
                dirtHoldingCapacityG: this.getDirtHolding(sku.tier),
                serviceLifeHours: this.getServiceLife(sku.tier),
                changeIntervalKm: '',
                operatingTempMinC: sku.specs['Min Temperature'] || '-40',
                operatingTempMaxC: sku.specs['Max Temperature'] || this.getMaxTemp(sku.tier),
                fluidCompatibility: this.getFluidCompatibility(sku.systemKey),
                biodieselCompatible: sku.systemKey?.includes('FUEL') ? 'Yes' : 'N/A',
                filtrationTechnology: sku.technology,
                specialFeatures: this.getSpecialFeatures(sku.tier),
                oemCodes: originalCode,
                crossReferenceCodes: sku.crossRefCode,
                equipmentApplications: duty.duty === 'HD' ? 'CAT, Cummins, Volvo, Mack' : 'Ford, Toyota, Honda',
                engineApplications: '',
                equipmentYear: '',
                qtyRequired: '1',
                em9Flag: sku.systemKey === 'MARINE_FILTER' ? 'Yes' : 'No',
                et9Flag: sku.systemKey === 'TURBINE_FUEL' ? 'Yes' : 'No',
                specialConditions: '',
                stockStatus: 'Available',
                warranty: '12 months',
                operatingCost: '',
                technicalSheetUrl: '',
                auditStatus: 'AI_GENERATED',
                urlTechnicalSheetPdf: '',
                createdAt: timestamp
            }));

            // Usar updateOne con upsert para evitar duplicados
            const operations = documents.map(doc => ({
                updateOne: {
                    filter: { sku: doc.sku },
                    update: { $set: doc },
                    upsert: true
                }
            }));

            const result = await Filter.bulkWrite(operations);

            console.log(`✅ MongoDB: Saved ${result.upsertedCount + result.modifiedCount} filters for ${originalCode}`);

            return { success: true, saved: result.upsertedCount + result.modifiedCount };

        } catch (error) {
            console.error('❌ MongoDB save error:', error.message);
            // No throw - continuar aunque MongoDB falle
            return { success: false, error: error.message };
        }
    }

    // Helper methods (iguales a detectionService)
    getBetaRatio(tier) {
        return tier === 'ELITE' ? 'β15 > 200' : tier === 'PERFORMANCE' ? 'β20 > 75' : 'β40 > 20';
    }

    getEfficiency(tier) {
        return tier === 'ELITE' ? '99.9' : tier === 'PERFORMANCE' ? '98.7' : '95.0';
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

    /**
     * Cierra la conexión de MongoDB
     */
    async disconnect() {
        if (this.connected) {
            await mongoose.disconnect();
            this.connected = false;
            console.log('🔌 MongoDB disconnected');
        }
    }
}

module.exports = new MongoService();
