const { scrapeDonaldson } = require('./donaldson-stagehand'); // src/scrapers/unified-scraper-service.js

/**
 * Servicio unificado de scraping con Gemini 2.5 Flash
 * Auto-detecta el fabricante del código y ejecuta el scraper apropiado
 */

class UnifiedScraperService {
  constructor(options = {}) {
    this.options = {
      enableCache: true,
      debugMode: false,
      timeout: 30000,
      ...options
    };
  }

  /**
   * Detecta el fabricante basado en el patrón del código
   */
  detectManufacturer(code) {
    const normalized = code.toUpperCase().trim();

    // Donaldson: P + 6 dígitos, DBL, DBA, ELF
    if (
      /^P\d{6}$/.test(normalized) ||
      normalized.startsWith('DBL') ||
      normalized.startsWith('DBA') ||
      normalized.startsWith('ELF')
    ) {
      return 'donaldson';
    }

    // FRAM: PH, TG, XG, HM, CH, CA, CF, G, PS
    if (/^(PH|TG|XG|HM|CH|CA|CF|G|PS)\d+/.test(normalized)) {
      return 'fram';
    }

    // Fleetguard: LF, FF, AF, WF, HF, FS
    if (/^(LF|FF|AF|WF|HF|FS)\d{4,5}/.test(normalized)) {
      return 'fleetguard';
    }

    // RACOR: R, S3, diversos formatos
    if (
      /^(R|S3)\d+/.test(normalized) ||
      /^\d{3,6}(FH|MA|MOR|MOL|WD|REMAN)/.test(normalized)
    ) {
      return 'racor';
    }

    // Mercruiser: formato XXX-XXXXXX
    if (/^\d{2,3}-\d{6}/.test(normalized)) {
      return 'mercruiser';
    }

    // Mercury: 35-XXXXXX formato
    if (normalized.startsWith('35-')) {
      return 'mercury';
    }

    return null;
  }

  /**
   * Scrape automático con detección de fabricante
   */
  async scrapeFilter(code, customOptions = {}) {
    const options = { ...this.options, ...customOptions };
    const manufacturer = this.detectManufacturer(code);

    if (!manufacturer) {
      console.log(`❌ [Unified Scraper] Unknown manufacturer for: ${code}`);
      return {
        found: false,
        error: 'Unknown manufacturer - unable to determine filter brand',
        code: code
      };
    }

    console.log(
      `🎯 [Unified Scraper] Detected manufacturer: ${manufacturer} for ${code}`
    );

    try {
      let result;

      switch (manufacturer) {
        case 'donaldson':
          result = await scrapeDonaldson(code, options);
          break;

        case 'fram':
          // TODO: Implementar cuando esté listo
          result = {
            found: false,
            error: 'FRAM scraper not yet implemented',
            code: code,
            source: 'fram'
          };
          break;

        case 'fleetguard':
          result = {
            found: false,
            error: 'Fleetguard scraper not yet implemented',
            code: code,
            source: 'fleetguard'
          };
          break;

        case 'racor':
          result = {
            found: false,
            error: 'RACOR scraper not yet implemented',
            code: code,
            source: 'racor'
          };
          break;

        case 'mercruiser':
          result = {
            found: false,
            error: 'Mercruiser scraper not yet implemented',
            code: code,
            source: 'mercruiser'
          };
          break;

        case 'mercury':
          result = {
            found: false,
            error: 'Mercury scraper not yet implemented',
            code: code,
            source: 'mercury'
          };
          break;

        default:
          return {
            found: false,
            error: `Scraper not implemented for: ${manufacturer}`,
            code: code
          };
      }

      return result;
    } catch (error) {
      console.error(`❌ [Unified Scraper] Error for ${code}:`, error.message);
      return {
        found: false,
        error: error.message,
        code: code,
        manufacturer: manufacturer
      };
    }
  }

  /**
   * Scrape múltiples códigos en batch
   */
  async scrapeBatch(codes, options = {}) {
    const results = [];
    const delay = options.delay || 2000;

    for (const code of codes) {
      const result = await this.scrapeFilter(code, options);
      results.push(result);

      if (codes.indexOf(code) < codes.length - 1) {
        await this.sleep(delay);
      }
    }

    return results;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instancia singleton
const scraperService = new UnifiedScraperService();

module.exports = scraperService;
module.exports.UnifiedScraperService = UnifiedScraperService;

