const express = require('express');
const cors = require('cors');
require('dotenv').config();

const detectionService = require('./src/services/detectionService');
const kitsService = require('./src/services/kitsService');

/**
 * ELIMFILTERS API Server v9.0
 * 
 * Endpoints:
 * - POST /api/v1/search      → Part Number search (GROQ + Scrapers + SKU generation)
 * - POST /api/v1/kits        → VIN/Equipment search (Returns maintenance kits)
 * - POST /api/search         → Legacy endpoint (compatibility)
 * - GET  /health             → Health check
 */

const app = express();
const PORT = process.env.PORT || 3000;

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
 * ENDPOINT 1: Part Number Search
 * POST /api/v1/search
 * 
 * Body: {
 *   searchTerm: "1R1808",
 *   type: "part-number"
 * }
 * 
 * Response: {
 *   success: true,
 *   source: "cached" | "generated",
 *   data: [
 *     {
 *       sku: "EL81808",
 *       description: "...",
 *       tier: "PERFORMANCE",
 *       duty: "HD",
 *       microns: 21,
 *       ...
 *     }
 *   ]
 * }
 */
app.post('/api/v1/search', async (req, res) => {
    try {
        const { searchTerm, type } = req.body;
        
        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                error: 'searchTerm is required'
            });
        }
        
        console.log(`🔍 Petición Recibida: [${type || 'part-number'}] ${searchTerm}`);
        
        // Procesar búsqueda con el flujo completo
        const result = await detectionService.processSearch(searchTerm);
        
        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: 'No results found',
                details: result.error
            });
        }
        
        // Formatear respuesta para el plugin
        const response = {
            success: true,
            source: result.source,
            data: result.data,
            metadata: result.metadata
        };
        
        console.log(`✅ Response sent: ${result.data.length} results`);
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ Error in /api/v1/search:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * ENDPOINT 2: Kits Search (VIN/Equipment)
 * POST /api/v1/kits
 * 
 * Body: {
 *   searchTerm: "1HGBH41JXMN109186" | "Caterpillar 320D",
 *   type: "vin" | "equipment"
 * }
 * 
 * Response: {
 *   success: true,
 *   data: [
 *     {
 *       kit_sku: "EK5-CAT320",
 *       kit_type: "Maintenance Kit",
 *       description: "Complete service kit for CAT 320D",
 *       filters_included: ["EL81808", "EA14005", "EF97405"],
 *       ...
 *     }
 *   ]
 * }
 */
app.post('/api/v1/kits', async (req, res) => {
    try {
        const { searchTerm, type } = req.body;
        
        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                error: 'searchTerm is required'
            });
        }
        
        console.log(`🔍 Kits Search: [${type || 'auto'}] ${searchTerm}`);
        
        let kits;
        
        if (type === 'vin') {
            kits = await kitsService.searchByVIN(searchTerm);
        } else if (type === 'equipment') {
            kits = await kitsService.searchByEquipment(searchTerm);
        } else {
            // Auto-detect
            kits = await kitsService.search(searchTerm);
        }
        
        if (!kits || kits.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No maintenance kits found',
                searchTerm: searchTerm
            });
        }
        
        console.log(`✅ Found ${kits.length} maintenance kits`);
        
        res.json({
            success: true,
            count: kits.length,
            data: kits
        });
        
    } catch (error) {
        console.error('❌ Error in /api/v1/kits:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * ENDPOINT 3: Legacy Search (Compatibility)
 * POST /api/search
 */
app.post('/api/search', async (req, res) => {
    console.log('⚠️  Legacy endpoint /api/search called, redirecting to /api/v1/search');
    req.url = '/api/v1/search';
    return app._router.handle(req, res);
});

/**
 * ENDPOINT 4: Health Check
 * GET /health
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '9.0',
        timestamp: new Date().toISOString(),
        services: {
            groq: !!process.env.GROQ_API_KEY,
            googleSheets: !!process.env.GOOGLE_SHEETS_ID,
            serviceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
        }
    });
});

/**
 * 404 Handler
 */
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: [
            'POST /api/v1/search',
            'POST /api/v1/kits',
            'GET /health'
        ]
    });
});

/**
 * Error Handler
 */
app.use((err, req, res, next) => {
    console.error('❌ Unhandled Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: err.message
    });
});

/**
 * Start Server
 */
app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 ELIMFILTERS API Server v9.0 RUNNING');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 CORS: ${process.env.FRONTEND_URL || 'All origins'}`);
    console.log('');
    console.log('📋 Available Endpoints:');
    console.log('   POST /api/v1/search  → Part Number Search');
    console.log('   POST /api/v1/kits    → VIN/Equipment Kits');
    console.log('   GET  /health         → Health Check');
    console.log('');
    console.log('🔧 Services Status:');
    console.log(`   GROQ API:        ${process.env.GROQ_API_KEY ? '✅' : '❌'}`);
    console.log(`   Google Sheets:   ${process.env.GOOGLE_SHEETS_ID ? '✅' : '❌'}`);
    console.log(`   Service Account: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✅' : '❌'}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('⚠️  SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('⚠️  SIGINT received, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
