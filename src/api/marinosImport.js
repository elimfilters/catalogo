// =============================================
//  MARINOS IMPORT ENDPOINT
// =============================================

const express = require('express');
const router = express.Router();
const { importMarinos, initSheet, seedMarinosRow } = require('../services/marineImportService');

// =============================================
//  POST /api/import/marinos
//  Import data from Google Sheet 'Marinos' tab
// =============================================
router.post('/', async (req, res) => {
    try {
        const dryRun = req.query.dryRun === 'true' || req.body?.dryRun === true;
        const seed = typeof req.query.seed === 'string' ? req.query.seed.trim() : null;
        if (seed) {
            const doc = await initSheet();
            await seedMarinosRow(seed, doc);
        }
        const result = await importMarinos({ dryRun });
        res.json({ ok: true, dryRun, ...result });
    } catch (error) {
        console.error('❌ Error in Marinos import:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

module.exports = router;