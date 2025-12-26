const express = require('express');
const router = express.Router();
const { search, searchBySKU } = require('../services/searchService');
const { isElimfiltersSKU } = require('../utils/isElimfiltersSKU');

router.get('/:codigo', async (req, res) => {
  try {
    const codigo = String(req.params.codigo || '').trim().toUpperCase();
    if (!codigo) {
      return res.status(400).json({ success: false, error: 'MISSING_CODE' });
    }
    
    console.log('[SEARCH ROUTE GET] Codigo:', codigo);
    
    if (isElimfiltersSKU(codigo)) {
      const result = await searchBySKU(codigo);
      return res.json(result);
    }
    
    const result = await search(codigo);
    return res.json(result);
  } catch (error) {
    console.error('[SEARCH ROUTE GET] Error:', error);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const codigo = req.body.partNumber || req.body.codigo || req.body.query || '';
    const codigoTrimmed = String(codigo).trim().toUpperCase();
    if (!codigoTrimmed) {
      return res.status(400).json({ success: false, error: 'MISSING_CODE' });
    }
    
    console.log('[SEARCH ROUTE POST] Codigo:', codigoTrimmed);
    
    if (isElimfiltersSKU(codigoTrimmed)) {
      const result = await searchBySKU(codigoTrimmed);
      return res.json(result);
    }
    
    const result = await search(codigoTrimmed);
    return res.json(result);
  } catch (error) {
    console.error('[SEARCH ROUTE POST] Error:', error);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const codigo = req.query.partNumber || req.query.codigo || req.query.q || '';
    const codigoTrimmed = String(codigo).trim().toUpperCase();
    if (!codigoTrimmed) {
      return res.status(400).json({ success: false, error: 'MISSING_CODE' });
    }
    
    console.log('[SEARCH ROUTE QUERY] Codigo:', codigoTrimmed);
    
    if (isElimfiltersSKU(codigoTrimmed)) {
      const result = await searchBySKU(codigoTrimmed);
      return res.json(result);
    }
    
    const result = await search(codigoTrimmed);
    return res.json(result);
  } catch (error) {
    console.error('[SEARCH ROUTE QUERY] Error:', error);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: error.message });
  }
});

module.exports = router;
