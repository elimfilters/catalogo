// ============================================================================
// DONALDSON SCRAPER – SCRAPING REAL DE PÁGINA OFICIAL
// Extrae el tipo de filtro directamente de https://shop.donaldson.com
// NO usa patrones de prefijos - Lee el tipo exacto del sitio web
// ============================================================================

const axios = require('axios');
const cheerio = require('cheerio');
const { extract4Digits } = require('../utils/digitExtractor');

// Base de datos de respaldo para códigos conocidos (solo para fallback)
const DONALDSON_FALLBACK = {
  'P552100': { family: 'OIL', duty: 'HD' },
  'P527682': { family: 'AIR', duty: 'HD' },
  'P551808': { family: 'OIL', duty: 'HD' },
  'P551329': { family: 'FUEL SEPARATOR', duty: 'HD' } // ← CORRECTO
};

/**
 * Extrae el tipo de filtro del HTML de Donaldson
 */
function extractFilterTypeFromHTML(html, code) {
  try {
    const $ = cheerio.load(html);
    
    // Buscar en diferentes posibles ubicaciones del tipo de filtro
    const possibleSelectors = [
      '.product-type',
      '.product-category',
      '.breadcrumb',
      'h1.product-title',
      '.product-description',
      '[class*="category"]',
      '[class*="type"]'
    ];

    let filterType = null;

    // Intentar extraer de breadcrumbs
    const breadcrumbs = $('.breadcrumb a, .breadcrumb span').text().toLowerCase();
    if (breadcrumbs.includes('fuel')) {
      if (breadcrumbs.includes('separator') || breadcrumbs.includes('water')) {
        filterType = 'FUEL SEPARATOR';
      } else {
        filterType = 'FUEL';
      }
    } else if (breadcrumbs.includes('oil') || breadcrumbs.includes('lube')) {
      filterType = 'OIL';
    } else if (breadcrumbs.includes('air')) {
      if (breadcrumbs.includes('dryer')) {
        filterType = 'AIR DRYER';
      } else {
        filterType = 'AIR';
      }
    } else if (breadcrumbs.includes('hydraulic')) {
      filterType = 'HYDRAULIC';
    } else if (breadcrumbs.includes('coolant')) {
      filterType = 'COOLANT';
    }

    // Si no encontró en breadcrumbs, buscar en el título del producto
    if (!filterType) {
      const title = $('h1').first().text().toLowerCase();
      
      if (title.includes('fuel water separator') || title.includes('fuel/water separator')) {
        filterType = 'FUEL SEPARATOR';
      } else if (title.includes('fuel')) {
        filterType = 'FUEL';
      } else if (title.includes('oil') || title.includes('lube')) {
        filterType = 'OIL';
      } else if (title.includes('air dryer')) {
        filterType = 'AIR DRYER';
      } else if (title.includes('air')) {
        filterType = 'AIR';
      } else if (title.includes('hydraulic')) {
        filterType = 'HYDRAULIC';
      } else if (title.includes('coolant')) {
        filterType = 'COOLANT';
      } else if (title.includes('cabin')) {
        filterType = 'CABIN';
      }
    }

    // Buscar en la descripción del producto
    if (!filterType) {
      const description = $('.product-description, .description').first().text().toLowerCase();
      
      if (description.includes('fuel water separator') || description.includes('fuel/water separator')) {
        filterType = 'FUEL SEPARATOR';
      } else if (description.includes('fuel filter')) {
        filterType = 'FUEL';
      } else if (description.includes('oil filter') || description.includes('lube filter')) {
        filterType = 'OIL';
      } else if (description.includes('air dryer')) {
        filterType = 'AIR DRYER';
      } else if (description.includes('air filter')) {
        filterType = 'AIR';
      }
    }

    return filterType;
  } catch (error) {
    console.error(`❌ Error extracting filter type from HTML: ${error.message}`);
    return null;
  }
}

/**
 * Hace scraping REAL de la página de Donaldson
 */
async function scrapeDonaldsonWebsite(code) {
  try {
    const normalized = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const url = `https://shop.donaldson.com/store/es-us/search?text=${normalized}`;

    console.log(`🌐 Scraping Donaldson: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const filterType = extractFilterTypeFromHTML(response.data, normalized);

    if (!filterType) {
      console.log(`⚠️  Could not extract filter type from Donaldson page for ${normalized}`);
      return null;
    }

    console.log(`✅ Donaldson ${normalized} → Type: ${filterType}`);

    return {
      confirmed: true,
      source: 'DONALDSON_WEBSITE',
      facts: {
        code: normalized,
        family: filterType,
        duty: 'HD',
        attributes: {},
        cross: [],
        applications: []
      }
    };
  } catch (error) {
    console.error(`❌ Error scraping Donaldson website: ${error.message}`);
    return null;
  }
}

/**
 * Scraper principal con fallback a base de datos
 */
async function scrapeDonaldson(code) {
  const normalized = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  // 1. Intentar scraping REAL del sitio web
  const webResult = await scrapeDonaldsonWebsite(normalized);
  if (webResult && webResult.confirmed) {
    return webResult;
  }

  // 2. Fallback a base de datos local (solo para códigos conocidos)
  if (DONALDSON_FALLBACK[normalized]) {
    const data = DONALDSON_FALLBACK[normalized];
    console.log(`📚 Using fallback database for ${normalized} → ${data.family}`);
    
    return {
      confirmed: true,
      source: 'DONALDSON_FALLBACK',
      facts: {
        code: normalized,
        family: data.family,
        duty: data.duty || 'HD',
        attributes: {},
        cross: [],
        applications: []
      }
    };
  }

  // 3. No encontrado
  console.log(`❌ Donaldson code ${normalized} not found`);
  return { confirmed: false };
}

async function validateDonaldsonCode(inputCode) {
  const normalized = String(inputCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const result = await scrapeDonaldson(normalized);

  if (!result || !result.confirmed) {
    return { 
      valid: false, 
      code: normalized, 
      reason: 'NOT_FOUND_DONALDSON' 
    };
  }

  return {
    valid: true,
    code: result.facts.code,
    source: result.source,
    family: result.facts.family,
    duty: result.facts.duty,
    last4: extract4Digits(result.facts.code),
    cross: result.facts.cross || [],
    attributes: result.facts.attributes || {}
  };
}

module.exports = {
  scrapeDonaldson,
  validateDonaldsonCode,
  scrapeDonaldsonWebsite,
  DONALDSON_FALLBACK
};
