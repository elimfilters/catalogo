// Search endpoint con scraping automático
app.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const mongoDBScraper = require('./src/scrapers/mongoDBScraper');
    const { scraperBridge } = require('./src/scrapers/scraperBridge');
    const { upsertBySku } = require('./src/services/syncSheetsService');

    // Primero buscar en MongoDB
    const mongoResult = await mongoDBScraper.search(query);
    
    if (mongoResult.success && mongoResult.count > 0) {
      return res.json({
        success: true,
        query: query,
        results: mongoResult.results[0]
      });
    }

    // Si no existe, hacer scraping
    const scrapedResult = await scraperBridge(query);
    
    if (scrapedResult) {
      // Guardar en Sheets
      try {
        await upsertBySku({
          sku: scrapedResult.normsku || query,
          query_normalized: query,
          duty: scrapedResult.duty_type,
          type: scrapedResult.filter_type || scrapedResult.type,
          family: scrapedResult.family,
          attributes: scrapedResult.attributes || {},
          oem_codes: scrapedResult.oem_codes,
          cross_reference: scrapedResult.cross_reference,
          description: scrapedResult.description,
          source: scrapedResult.source
        });
        console.log(`✅ Guardado en Sheets: ${scrapedResult.normsku || query}`);
      } catch (err) {
        console.error('⚠️ Error guardando en Sheets:', err.message);
      }

      return res.json({
        success: true,
        query: query,
        results: scrapedResult
      });
    }

    res.json({
      success: false,
      query: query,
      error: 'No results found'
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});
