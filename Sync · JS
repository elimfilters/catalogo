// =============================================
//  SYNC ENDPOINT - MongoDB → Google Sheets
// =============================================

const express = require('express');
const router = express.Router();
const { syncToSheets } = require('../services/syncSheetsService');
const { getCacheStats } = require('../services/mongoService');

// =============================================
//  POST /api/sync/sheets
//  Trigger sync from MongoDB to Google Sheets
// =============================================
router.post('/sheets', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 1000;

        console.log(`🔄 Manual sync triggered (limit: ${limit})`);

        const result = await syncToSheets(limit);

        return res.json({
            success: result.success,
            ...result
        });

    } catch (error) {
        console.error('❌ Error in sync endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Sync failed',
            details: error.message
        });
    }
});

// =============================================
//  GET /api/sync/stats
//  Get MongoDB cache statistics
// =============================================
router.get('/stats', async (req, res) => {
    try {
        const stats = await getCacheStats();

        return res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ Error getting stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stats',
            details: error.message
        });
    }
});

module.exports = router;
