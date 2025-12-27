// ============================================================================
// SCRAPER BRIDGE – GEMINI GROUNDING
// ============================================================================

const { scrapeDonaldson, scrapeFRAM } = require('./geminiGroundingScraper');

async function scraperBridge(normalizedCode) {
  console.log([BRIDGE] Buscando: );
  
  // Intentar con Donaldson (HD) primero
  try {
    const donResult = await scrapeDonaldson(normalizedCode);
    
    if (donResult && donResult.encontrado) {
      console.log([BRIDGE] ✅ Encontrado en Donaldson);
      return {
        confirmed: true,
        source: 'DONALDSON_GEMINI',
        facts: donResult.datos
      };
    }
  } catch (err) {
    console.log([BRIDGE] ⚠️ Error en Donaldson:, err.message);
  }

  // Intentar con FRAM (LD)
  try {
    const framResult = await scrapeFRAM(normalizedCode);
    
    if (framResult && framResult.encontrado) {
      console.log([BRIDGE] ✅ Encontrado en FRAM);
      return {
        confirmed: true,
        source: 'FRAM_GEMINI',
        facts: framResult.datos
      };
    }
  } catch (err) {
    console.log([BRIDGE] ⚠️ Error en FRAM:, err.message);
  }

  console.log([BRIDGE] ❌ No encontrado en ningún scraper);
  return null;
}

module.exports = { scraperBridge };
