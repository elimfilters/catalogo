// =============================================
//  VIN DECODER ENDPOINT
// =============================================

const express = require('express');
const router = express.Router();
const { decodeVIN } = require('../services/vinService');

// =============================================
//  GET /api/vin/:code
//  Decode VIN and return vehicle information
// =============================================
router.get('/:code', async (req, res) => {
    try {
        const vin = req.params.code?.trim().toUpperCase();

        // VIN validation (must be 17 characters)
        if (!vin || vin.length !== 17) {
            return res.status(400).json({
                error: 'Invalid VIN',
                details: 'VIN must be exactly 17 characters',
                example: '/api/vin/1HGBH41JXMN109186'
            });
        }

        console.log(`🚗 Decoding VIN: ${vin}`);

        const result = await decodeVIN(vin);

        return res.json({
            success: true,
            vin,
            ...result
        });

    } catch (error) {
        console.error('❌ Error in VIN endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

module.exports = router;
