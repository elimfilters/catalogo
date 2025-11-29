// ============================================================================
// ROUTES INDEX - German Quality ELIMFILTERS API
// Central routing configuration
// ============================================================================

const express = require('express');
const router = express.Router();

// Import route modules
const detectRoutes = require('./detectRoutes');
const pdfRoutes = require('./pdfRoutes');

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Filter Detection Routes
 * GET /api/detect/:code - Detect and return filter information
 */
router.use('/detect', detectRoutes);

/**
 * PDF Generation Routes
 * GET /api/pdf/:code - Generate and download technical datasheet PDF
 * POST /api/pdf/generate - Generate PDF from complete data
 */
router.use('/pdf', pdfRoutes);

/**
 * Health Check Route
 * GET /api/health - Check API status
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '5.3.0',
        features: [
            'Filter Detection (70 columns)',
            'PDF Technical Datasheets',
            'German Quality ELIMFILTERS',
            'Dual Unit System (Imperial + Metric)',
            'Upsell/Cross-sell Recommendations'
        ]
    });
});

/**
 * API Info Route
 * GET /api - Get API information
 */
router.get('/', (req, res) => {
    res.json({
        name: 'German Quality ELIMFILTERS API',
        tagline: 'Tecnología elaborada con IA',
        version: '5.3.0',
        endpoints: {
            detect: {
                url: '/api/detect/:code',
                method: 'GET',
                description: 'Detect filter and return complete specifications (70 columns)',
                example: '/api/detect/P552100'
            },
            pdf_download: {
                url: '/api/pdf/:code',
                method: 'GET',
                description: 'Generate and download technical datasheet PDF',
                example: '/api/pdf/P552100'
            },
            pdf_generate: {
                url: '/api/pdf/generate',
                method: 'POST',
                description: 'Generate PDF from complete filter data',
                body_example: {
                    sku: 'EL82100',
                    type: 'OIL',
                    duty: 'HD'
                }
            },
            health: {
                url: '/api/health',
                method: 'GET',
                description: 'Check API health status'
            }
        },
        features: {
            columns: 70,
            media_types: 7,
            technologies: 4,
            dual_units: true,
            pdf_generation: true,
            upsell_recommendations: true
        },
        brand: 'German Quality ELIMFILTERS - Tecnología elaborada con IA'
    });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * 404 Handler
 */
router.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
        available_endpoints: [
            '/api',
            '/api/health',
            '/api/detect/:code',
            '/api/pdf/:code',
            '/api/pdf/generate'
        ]
    });
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = router;
