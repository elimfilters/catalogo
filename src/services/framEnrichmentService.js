// =============================================================================
// FRAM Enrichment Service (LD Flow)
// - Headless scraping (optional Playwright) + mapping & normalization
// - Returns lightweight enrichment to merge into masterData
// =============================================================================

const https = require('https');

// URL template for FRAM product pages
// Example: https://www.fram.com/fram-extra-guard-oil-filter-spin-on-PH8A
const URL_TEMPLATE = (code) => `https://www.fram.com/fram-extra-guard-oil-filter-spin-on-${String(code).toUpperCase()}`;

// Utility: parse number from text (e.g., "120 psi" -> 120)
function parseNumber(text) {
  const m = String(text || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// Utility: inches to millimeters
function toMM(inches) {
  const n = typeof inches === 'number' ? inches : parseNumber(inches);
  if (typeof n !== 'number' || isNaN(n)) return null;
  return Math.round(n * 25.4);
}

// Lightweight HTML fetch (fallback when Playwright not available)
function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', (err) => resolve(null));
  });
}

// Detect technology from page text
function detectTechnology(pageText, family) {
  const t = String(pageText || '').toLowerCase();
  if (/ultra\s+synthetic|high\s+mileage/.test(t)) return 'ELIMTEK™ MultiCore';
  if (/extra\s+guard/.test(t)) return 'ELIMTEK™ Standard';
  if (String(family).toUpperCase().includes('AIRE') || /cabin\s+air|air\s+filter/.test(t)) return 'MACROCORE™';
  return undefined;
}

// Extract dimensions from raw HTML heuristically (label matching)
function extractDimensionsFromHtml(html) {
  const text = String(html || '');
  const getAround = (labelRegex) => {
    const m = text.match(labelRegex);
    if (!m) return null;
    const idx = m.index;
    const snippet = text.slice(idx, idx + 200);
    return parseNumber(snippet);
  };
  // Heuristics: look near labels
  const heightIn = getAround(/overall\s*height|\bheight\b/i);
  const odIn = getAround(/outer\s*diameter|\bod\b/i);
  const threadTxt = (() => {
    const m = text.match(/thread\s*size[^\n<]{0,40}/i);
    return m ? m[0].replace(/.*?:/,'').trim() : null;
  })();

  return {
    height_mm: heightIn != null ? toMM(heightIn) : null,
    outer_diameter_mm: odIn != null ? toMM(odIn) : null,
    thread_size: threadTxt || null
  };
}

// Extract cross references as codes array (heuristic)
function extractCrossRefsFromHtml(html) {
  const t = String(html || '');
  // Collect alphanumeric codes that look like parts (min 3 chars, mix letters/digits)
  const codes = new Set();
  const regex = /\b([A-Z]{1,5}\d{2,6}[A-Z]?)\b/g;
  let m;
  while ((m = regex.exec(t))) {
    codes.add(m[1]);
    if (codes.size > 50) break;
  }
  return Array.from(codes);
}

async function enrichFramLD(code, opts = {}) {
  const url = URL_TEMPLATE(code);
  let html = null;

  // Try Playwright first (if available)
  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    try { await page.waitForSelector('body', { timeout: 5000 }); } catch (_) {}
    html = await page.content();
    await browser.close();
  } catch (_) {
    // Fallback to simple HTTPS fetch
    html = await fetchHtml(url);
  }

  // If page failed to load or layout changed, return empty enrichment
  if (!html) return {};

  const dims = extractDimensionsFromHtml(html);
  const cross = extractCrossRefsFromHtml(html);
  const tecnologia_aplicada = detectTechnology(html, opts.family || '');

  // Build enrichment object (only non-null fields)
  const attributes = {};
  if (dims.height_mm) attributes.height_mm = dims.height_mm;
  if (dims.outer_diameter_mm) attributes.outer_diameter_mm = dims.outer_diameter_mm;
  if (dims.thread_size) attributes.thread_size = dims.thread_size;

  return {
    url,
    attributes,
    oem_codes_from_cross: cross,
    tecnologia_aplicada
  };
}

module.exports = {
  enrichFramLD,
  URL_TEMPLATE
};
