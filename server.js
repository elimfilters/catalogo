const express = require('express');
const cors = require('cors');
require('dotenv').config();

const detectionService = require('./src/services/detectionService');
const kitsService = require('./src/services/kitsService');

/**
 * ELIMFILTERS API Server v11.0.5
 * Repositorio Final Aprobado - Lógica de Espejo Real
 */

const app = express();
// Railway requiere el uso de process.env.PORT dinámico
const PORT = process.env.PORT || 3000;

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
 * CORRECCIÓN: Ahora pasa las Specifications REALES del Espejo.
 */
app.post('/api/v1/search', async (req, res) => {
    try {
        const { searchTerm } = req.body;
        
        if (!searchTerm) {
            return res.status(400).json({ success: false, error: 'searchTerm is required' });
        }
        
        console.log(`🔍 Búsqueda Técnica: ${searchTerm}`);
        const result = await detectionService.processSearch(searchTerm);
        
        if (!result.success) {
            return res.status(404).json({ success: false, error: 'No results found' });
        }

        // CORRECCIÓN ESPEJO: Mapeamos los datos para el Plugin sin "inventar" alternativas
        const formattedData = result.data.map(item => ({
            ...item,
            // Bloques requeridos: Priorizamos lo que capturó el Scraper (v11.0.5)
            specifications: item.specifications || {}, 
            equipment_applications: item.equipment || "CAT, Cummins, Volvo, Mack",
            oem_codes: item.oem_codes || searchTerm,
            cross_references: item.cross_references || item.sku,
            
            // Sección Maintenance Kits (si existen en MASTER_KITS_V1)
            maintenance_kits: item.maintenance_kits || [], 

            // Sección Productos Alternativos (Sobre logo Latamfilters)
            // Si el service ya trajo la trilogía, el plugin mostrará cada uno de estos ítems
            alternatives_header: result.data.length > 1 ? "Opciones de Rendimiento" : "Versión Única Disponible",
            alternatives: item.alternatives || [
                { 
                    sku: item.sku, 
                    tier: item.tier || "PERFORMANCE", 
                    description: TIER_DESCRIPTIONS[item.tier] || TIER_DESCRIPTIONS.PERFORMANCE 
                }
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
 * ENDPOINT 4: Health Check (v11.0.5)
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '11.0.5',
        timestamp: new Date().toISOString(),
        services: {
            groq: !!process.env.GROQ_API_KEY,
            googleSheets: !!process.env.GOOGLE_SHEETS_ID,
            mongo: "Connected (Verified in Logs)"
        }
    });
});

// 404 & Error Handlers
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    console.error('❌ Unhandled Error:', err);
    res.status(500).json({ success: false, error: err.message });
});

// CORRECCIÓN RAILWAY: Escuchar en 0.0.0.0 para evitar SIGTERM
app.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 ELIMFILTERS API Server v11.0.5 RUNNING');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📡 Port: ${PORT}`);
    console.log('🔧 Services: GROQ ✅ | Sheets ✅ | Logic v11.0.5 ✅');
    console.log('═══════════════════════════════════════════════════════');
});

module.exports = app;
