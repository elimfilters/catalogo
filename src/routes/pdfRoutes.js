// ============================================================================
// PDF ENDPOINT - German Quality ELIMFILTERS
// API endpoint para generar y descargar fichas técnicas en PDF
// ============================================================================

const express = require('express');
const router = express.Router();
const { detectFilter } = require('../services/detectionServiceFinal');
const { generateTechnicalDatasheet } = require('../services/pdfGenerator');

/**
 * GET /api/pdf/:code
 * Generate and download technical datasheet PDF for a filter code
 * 
 * @route GET /api/pdf/:code
 * @param {string} code - Filter code to lookup
 * @returns {application/pdf} - PDF file download
 * 
 * @example
 * GET /api/pdf/P552100
 * Response: PDF file download "ELIMFILTERS_EL82100_Ficha_Tecnica.pdf"
 */
router.get('/:code', async (req, res) => {
    try {
        const { code } = req.params;
        
        console.log(`📄 PDF Request: ${code}`);
        
        // Step 1: Get filter data from detection service
        const filterData = await detectFilter(code);
        
        if (filterData.status !== 'OK') {
            return res.status(404).json({
                error: 'Filter not found',
                message: filterData.message || 'No equivalent found for this code'
            });
        }
        
        console.log(`✅ Filter data retrieved: ${filterData.sku}`);
        
        // Step 2: Generate PDF
        console.log(`🔄 Generating PDF for ${filterData.sku}...`);
        
        await generateTechnicalDatasheet(filterData, res);
        
        console.log(`✅ PDF generated and sent: ${filterData.sku}`);
        
    } catch (error) {
        console.error(`❌ PDF Generation Error: ${error.message}`);
        
        res.status(500).json({
            error: 'PDF Generation Failed',
            message: error.message
        });
    }
});

/**
 * POST /api/pdf/generate
 * Generate PDF from complete filter data (for internal use)
 * 
 * @route POST /api/pdf/generate
 * @param {object} body - Complete filter data object
 * @returns {application/pdf} - PDF file download
 * 
 * @example
 * POST /api/pdf/generate
 * Body: { sku: "EL82100", type: "OIL", duty: "HD", ... }
 * Response: PDF file download
 */
router.post('/generate', async (req, res) => {
    try {
        const filterData = req.body;
        
        if (!filterData || !filterData.sku) {
            return res.status(400).json({
                error: 'Invalid Request',
                message: 'Filter data with SKU is required'
            });
        }
        
        console.log(`📄 PDF Direct Generation Request: ${filterData.sku}`);
        
        await generateTechnicalDatasheet(filterData, res);
        
        console.log(`✅ PDF generated and sent: ${filterData.sku}`);
        
    } catch (error) {
        console.error(`❌ PDF Generation Error: ${error.message}`);
        
        res.status(500).json({
            error: 'PDF Generation Failed',
            message: error.message
        });
    }
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = router;
