// =============================================
//  MARINES IMPORT ENDPOINT
// =============================================

const express = require('express');
const router = express.Router();
const { importMARINEs, initSheet, seedMARINEsRow } = require('../services/marineImportService');

// =============================================
//  POST /api/import/MARINEs
//  Import data from Google Sheet 'MARINEs' tab
// =============================================
router.post('/', async (req, res) => {
    try {
        const dryRun = req.query.dryRun === 'true' || req.body?.dryRun === true;
        const seed = typeof req.query.seed === 'string' ? req.query.seed.trim() : null;
        if (seed) {
            const doc = await initSheet();
            await seedMARINEsRow(seed, doc);
        }
        const result = await importMARINEs({ dryRun });
        res.json({ ok: true, dryRun, ...result });
    } catch (error) {
        console.error('❌ Error in MARINEs import:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

module.exports = router;
