// =============================================
//  DETECT FILTER ENDPOINT
// =============================================

const express = require('express');
const router = express.Router();
const { detectFilter } = require('../services/detectionServiceFinal');

// =============================================
//  GET /api/detect/:code
//  Detect filter by part number
// =============================================
router.get('/:code', async (req, res) => {
    try {
        const code = req.params.code?.trim();
        const force = (String(req.query.force || '').toLowerCase() === 'true') || (req.query.force === '1');
        const generateAll = (String(req.query.generate_all || '').toLowerCase() === 'true') || (req.query.generate_all === '1');
        const qlang = String(req.query.lang || '').toLowerCase();
        const lang = qlang === 'es' ? 'es' : 'en';

        // Validation
        if (!code || code.length < 3) {
            return res.status(400).json({
                error: 'Invalid part number',
                details: 'Part number must be at least 3 characters',
                example: '/api/detect/P552100'
            });
        }
        if (!/^[A-Za-z0-9-]{3,64}$/.test(code)) {
            return res.status(400).json({
                error: 'Invalid part number format',
                details: 'Only letters, numbers, and hyphen allowed (3-64 chars)'
            });
        }

        console.log(`🔎 Detecting filter: ${code} (force=${force}, generate_all=${generateAll}, lang=${lang})`);

        const result = await detectFilter(code, lang, { force, generateAll });

        return res.json({
            success: true,
            query: code,
            ...result
        });

    } catch (error) {
        console.error('❌ Error in detect endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

// =============================================
//  GET /api/detect/search?q=
//  Search filters by query
// =============================================
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q?.trim();
        const force = (String(req.query.force || '').toLowerCase() === 'true') || (req.query.force === '1');
        const generateAll = (String(req.query.generate_all || '').toLowerCase() === 'true') || (req.query.generate_all === '1');
        const qlang = String(req.query.lang || '').toLowerCase();
        const lang = qlang === 'es' ? 'es' : 'en';

        if (!query) {
            return res.status(400).json({
                error: 'Missing query parameter',
                details: 'Please provide ?q= parameter',
                example: '/api/detect/search?q=P552100'
            });
        }
        if (!/^[A-Za-z0-9-]{3,64}$/.test(query)) {
            return res.status(400).json({
                error: 'Invalid query format',
                details: 'Only letters, numbers, and hyphen allowed (3-64 chars)'
            });
        }

        console.log(`🔍 Searching: ${query} (force=${force}, generate_all=${generateAll}, lang=${lang})`);

        const result = await detectFilter(query, lang, { force, generateAll });

        return res.json({
            success: true,
            query,
            ...result
        });

    } catch (error) {
        console.error('❌ Error in search endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

module.exports = router;
