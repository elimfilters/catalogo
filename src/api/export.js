/**
 * EXPORT API - Export filtered products to Google Sheets
 */
const express = require('express');
const router = express.Router();
const { writeToGoogleSheets } = require('../sheets');

router.post('/sheets', async (req, res) => {
  try {
    const { products } = req.body;
    
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de productos'
      });
    }

    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El array de productos está vacío'
      });
    }

    console.log('Exportando ' + products.length + ' productos a Google Sheets...');
    
    const result = await writeToGoogleSheets(products);
    
    console.log('Exportados ' + result.rowsWritten + ' productos exitosamente');
    
    res.json({
      success: true,
      message: result.rowsWritten + ' productos exportados exitosamente',
      count: result.rowsWritten,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error exportando a Google Sheets:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al exportar a Google Sheets',
      details: error.message
    });
  }
});

router.get('/status', (req, res) => {
  res.json({
    success: true,
    service: 'Google Sheets Export',
    status: 'operational',
    spreadsheet_id: process.env.SPREADSHEET_ID || 'not configured',
    sheet_name: 'MASTER_UNIFIED_V5'
  });
});

module.exports = router;
