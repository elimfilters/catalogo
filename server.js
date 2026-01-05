const express = require('express');
const cors = require('cors');
require('dotenv').config();

const detectionService = require('./src/services/detectionService');
const kitsService = require('./src/services/kitsService');

/**
 * ELIMFILTERS API Server v11.0.0
 * Repositorio Final Aprobado
 */

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN DE LÓGICA ELIMFILTERS ---
const PREFIX_MAP = {
    LUBE: 'EL8', FUEL: 'EF9', FUEL_SEPARATOR: 'ES9', 
    AIR: 'EA1', CABIN: 'EC1', COOLANT: 'EW7', 
    HYDRAULIC: 'EH6', AIR_DRYER: 'ED4', MARINE: 'EM9', 
    TURBINE: 'ET9', AIR_HOUSING: 'EA2', KIT_HD: 'EK5', KIT_LD: 'EK3'
};

const TIER_DESCRIPTIONS = {
    ELITE: "Maximum synthetic protection for extreme service. Tecnología Sintética Propietaria. Utiliza fibras sintéticas de menor diámetro y forma uniforme para máxima eficiencia.",
    PERFORMANCE: "Enhanced efficiency and dirt-holding capacity. Servicio estándar. Utiliza fibras de papel tratadas con resinas para una filtración básica confiable.",
    STANDARD: "Engineered for everyday operational demands. Flujo optimizado. Prioriza el paso del aceite (flujo) sobre la finura de filtrado, común en motores de generación anterior."
};

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

/**
 * ENDPOINT 1: Part Number Search (Búsqueda por código)
 * Ahora incluye: Specs, OEM, Cross Ref, Equipment y Alternativos
 */
app.post('/api/v1/search', async (req, res) => {
    try {
        const { searchTerm, type } = req.body;
        
        if (!searchTerm) {
            return res.status(400).json({ success: false, error: 'searchTerm is required' });
        }
        
        console.log(`🔍 Búsqueda Técnica: ${searchTerm}`);
        const result = await detectionService.processSearch(searchTerm);
        
        if (!result.success) {
            return res.status(404).json({ success: false, error: 'No results found' });
        }

        // Ajustamos la data para que el plugin reciba TODO lo de MASTER_UNIFIED_V5
        const formattedData = result.data.map(item => ({
            ...item,
            // Bloques requeridos para la Parte 2 del Plugin
            specifications: item.specifications || {}, 
            equipment_applications: item.equipment || [], // De MASTER_UNIFIED_V5
            oem_codes: item.oem_codes || [],              // De MASTER_UNIFIED_V5
            cross_references: item.cross_references || [], // De MASTER_UNIFIED_V5
            
            // Sección Maintenance Kits (desde MASTER_KITS_V1 vía service)
            maintenance_kits: item.maintenance_kits || [], 

            // Sección Productos Alternativos (Sobre logo Latamfilters)
            alternatives_header: "Productos alternativos",
            alternatives: item.alternatives || [
                { sku: item.sku, tier: "PERFORMANCE", description: TIER_DESCRIPTIONS.PERFORMANCE }
            ]
        }));

        res.json({
            success: true,
            source: result.source,
            data: formattedData
        });
        
    } catch (error) {
        console.error('❌ Error in /api/v1/search:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * ENDPOINT 2: Kits Search (VIN/Equipment)
 * Desglose de filters_included con familia y cantidad
 */
app.post('/api/v1/kits', async (req, res) => {
    try {
        const { searchTerm, type } = req.body;
        if (!searchTerm) return res.status(400).json({ error: 'searchTerm is required' });

        console.log(`🔍 Kits Search: ${searchTerm}`);
        const kits = await kitsService.search(searchTerm, type);
        
        if (!kits || kits.length === 0) {
            return res.status(404).json({ success: false, error: 'No maintenance kits found' });
        }

        // El service ya debe devolver el desglose de filters_included
        // kit_sku, kit_type, kit_description, filters_included, equipment_applications, engine_applications, etc.
        res.json({
            success: true,
            count: kits.length,
            data: kits 
        });
        
    } catch (error) {
        console.error('❌ Error in /api/v1/kits:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * ENDPOINT 3: Legacy Search
 */
app.post('/api/search', async (req, res) => {
    req.url = '/api/v1/search';
    return app._router.handle(req, res);
});

/**
 * ENDPOINT 4: Health Check (v11.0.0)
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '11.0.0',
        timestamp: new Date().toISOString(),
        services: {
            groq: !!process.env.GROQ_API_KEY,
            googleSheets: !!process.env.GOOGLE_SHEETS_ID,
            serviceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
        }
    });
});

// 404 & Error Handlers (Igual que el original)
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    console.error('❌ Unhandled Error:', err);
    res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 ELIMFILTERS API Server v11.0.0 RUNNING');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📡 Port: ${PORT}`);
    console.log('🔧 Services: GROQ ✅ | Sheets ✅ | Logic v11 ✅');
    console.log('═══════════════════════════════════════════════════════');
});

module.exports = app;
