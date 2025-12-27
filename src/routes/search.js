const express = require('express');
const router = express.Router();
const searchService = require('../services/searchService');
const isElimfiltersSKU = require('../utils/isElimfiltersSKU').isElimfiltersSKU;

router.get('/:codigo', async (req, res) => {
  try {
    const codigo = String(req.params.codigo).trim().toUpperCase();
    if (!codigo) {
      return res.status(400).json({ success: false, error: 'MISSING_CODE' });
    }
    
    console.log('[SEARCH GET]', codigo);
    
    if (isElimfiltersSKU(codigo)) {
      const result = await searchService.searchBySKU(codigo);
      return res.json(result);
    }
    
    const result = await searchService.search(codigo);
    return res.json(result);
  } catch (error) {
    console.error('[SEARCH GET ERROR]', error);
    return res.status(500).json({ 
      success: false, 
      error: 'INTERNAL_ERROR', 
      message: error.message 
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const codigo = String(req.body.partNumber || req.body.codigo || '').trim().toUpperCase();
    if (!codigo) {
      return res.status(400).json({ success: false, error: 'MISSING_CODE' });
    }
    
    console.log('[SEARCH POST]', codigo);
    
    if (isElimfiltersSKU(codigo)) {
      const result = await searchService.searchBySKU(codigo);
      return res.json(result);
    }
    
    const result = await searchService.search(codigo);
    return res.json(result);
  } catch (error) {
    console.error('[SEARCH POST ERROR]', error);
    return res.status(500).json({ 
      success: false, 
      error: 'INTERNAL_ERROR', 
      message: error.message 
    });
  }
});

module.exports = router;
