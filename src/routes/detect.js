const express = require('express');
const router = express.Router();

const { isElimfiltersSKU } = require('../utils/isElimfiltersSKU');
const mongo = require('../scrapers/mongoDBScraper');
const { scraperBridge } = require('../scrapers/scraperBridge');

// Importar función de guardado en Sheets
const { saveToGoogleSheets } = require('../path/to/server'); 
// Ajusta la ruta si está en otro archivo / carpeta

router.get('/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();

    let result, source;

    // === BLOQUEO ELIMFILTERS ===
    if (isElimfiltersSKU(code)) {
      result = await mongo.findBySKU(code);
      source = 'ELIMFILTERS';

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'SKU_ELIMFILTERS_NOT_FOUND'
        });
      }
    } else {
      // === FLUJO NORMAL OEM ===
      result = await scraperBridge(code);
      source = 'SCRAPING';

      if (!result) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      }
    }

    // === GUARDAR EN GOOGLE SHEETS ===
    try {
      // Ajusta qué quieres guardar en cada columna:
      // aquí usamos: código, SKU o código, tipo, fuente, etc.
      await saveToGoogleSheets(
        code,
        result.normsku || result.sku || code,
        source
      );
      console.log('✅ Guardado en Google Sheets (detect.js)', code);
    } catch (sheetErr) {
      console.error('⚠️ Error guardando en Sheets:', sheetErr.message);
    }

    // === RESPUESTA ===
    return res.json({ success: true, source, data: result });

  } catch (err) {
    console.error('Error en /detect/:code ->', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
