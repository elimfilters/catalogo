'use strict';

// Fleetguard Maintenance Kits Scraper (Stagehand-ready)
// Dado make/model/engine/year construye la URL de resultados y extrae códigos de Kits
// Luego retorna partNumbers y metadatos básicos para derivar EK5 y persistir.

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Construye URL de búsqueda de Fleetguard
 */
function buildFleetguardSearchURL({ make, model, engine, year }) {
  const base = 'https://www.fleetguard.com/s/searchResults';
  const params = new URLSearchParams({
    language: 'en_US',
    eqVal1: String(make || '').trim(),
    eqModel1: String(model || '').trim(),
    eqEngine1: String(engine || '').trim(),
    eqYear1: String(year || '').trim()
  });
  return `${base}?${params.toString()}`;
}

/**
 * Heurística para detectar posibles part numbers de kits en texto
 */
function extractCodesFromText(text) {
  const out = new Set();
  const T = String(text || '').toUpperCase();
  // Patrón alfanumérico común con 2+ letras seguidas de 3+ dígitos
  const re = /\b[A-Z]{2,}[0-9]{3,}[A-Z0-9\-]*\b/g;
  const m = T.match(re) || [];
  for (const code of m) out.add(code);
  return Array.from(out);
}

/**
 * Determina si un nodo parece pertenecer a un resultado de Kit
 */
function isKitContext($, el) {
  const txt = $(el).text().toUpperCase();
  if (txt.includes('MAINTENANCE KIT')) return true;
  if (txt.includes('KIT')) return true;
  // Anclas/hrefs con palabras clave
  const href = $(el).attr('href') || '';
  if (href.toUpperCase().includes('KIT')) return true;
  return false;
}

/**
 * Scrapea la página de resultados y extrae part numbers de Kits
 * @returns {Promise<{ url: string, kits: Array<{ partNumber: string, title?: string }> }>} 
 */
async function scrapeFleetguardMaintenanceKits({ make, model, engine, year }) {
  const url = buildFleetguardSearchURL({ make, model, engine, year });
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  };
  const kits = new Map();

  try {
    const resp = await axios.get(url, { headers, timeout: 15000 });
    const html = String(resp.data || '');
    const $ = cheerio.load(html);

    // Estrategia: recorrer tarjetas/enlaces y recolectar códigos si el contexto sugiere "Kit"
    $('a, div, span, li').each((_, el) => {
      if (!isKitContext($, el)) return;
      const text = $(el).text();
      const codes = extractCodesFromText(text);
      const title = $(el).text().trim();
      for (const c of codes) {
        // Guardar único
        if (!kits.has(c)) kits.set(c, { partNumber: c, title });
      }
    });

    // Descubrir enlaces candidatos a detalle de kit
    const candidateLinks = new Set();
    $('a').each((_, a) => {
      const href = String($(a).attr('href') || '').trim();
      const text = $(a).text().toUpperCase();
      const isKit = text.includes('KIT') || href.toUpperCase().includes('KIT');
      if (!href || !isKit) return;
      // Construir URL absoluta
      let abs = href;
      if (href.startsWith('/')) abs = `https://www.fleetguard.com${href}`;
      if (href.startsWith('http')) abs = href;
      candidateLinks.add(abs);
    });

    // Intentar enriquecer con componentes visitando páginas de detalle
    for (const link of Array.from(candidateLinks)) {
      try {
        const detail = await scrapeKitDetailPage(link);
        if (detail && detail.partNumber) {
          const existing = kits.get(detail.partNumber) || { partNumber: detail.partNumber };
          existing.title = existing.title || detail.title;
          existing.components = Array.isArray(detail.components) ? detail.components : [];
          kits.set(detail.partNumber, existing);
        }
      } catch (e) {
        console.log(`⚠️  Falló scrape de detalle ${link}: ${e.message}`);
      }
    }

    // Fallback: si no hay contexto, buscar códigos globalmente y filtrar por ocurrencias cercanas a "Kit"
    if (kits.size === 0) {
      const allText = $('body').text();
      const codes = extractCodesFromText(allText);
      for (const c of codes) {
        // Señal simple: mantener códigos cuando aparece "Kit" en el HTML
        if (html.toUpperCase().includes('KIT')) {
          if (!kits.has(c)) kits.set(c, { partNumber: c });
        }
      }
    }

  } catch (e) {
    console.log(`⚠️  Error scrapeFleetguardMaintenanceKits: ${e.message}`);
  }

  return {
    url,
    kits: Array.from(kits.values())
  };
}

/**
 * Scrapea página de detalle de un kit para extraer componentes
 * Heurísticas con selectores comunes (tabla de partes, listas)
 */
async function scrapeKitDetailPage(detailUrl) {
  if (!detailUrl) return null;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  };
  try {
    const resp = await axios.get(detailUrl, { headers, timeout: 15000 });
    const html = String(resp.data || '');
    const $ = cheerio.load(html);

    const title = ($('h1').first().text() || $('title').text() || '').trim();
    // Intentar obtener partNumber explícito
    let partNumber = null;
    const pnText = $('h1, .product-number, .sku, .part-number, .pdp-sku').text();
    const codes = extractCodesFromText(pnText || title);
    if (codes.length > 0) partNumber = codes[0];

    // Extraer componentes de tablas típicas
    const components = [];
    $('table').each((_, table) => {
      const headers = [];
      $(table).find('thead th').each((__, th) => headers.push($(th).text().toUpperCase().trim()));
      const hasPN = headers.some(h => h.includes('PART'));
      const hasQty = headers.some(h => h.includes('QTY') || h.includes('QUANTITY'));
      if (!hasPN || !hasQty) return;
      $(table).find('tbody tr').each((__, tr) => {
        const cells = $(tr).find('td');
        if (cells.length === 0) return;
        const cellTexts = cells.map((i, td) => $(td).text().trim()).get();
        const textJoined = cellTexts.join(' ');
        const codesRow = extractCodesFromText(textJoined);
        const qtyCell = cellTexts.find(t => /\b[0-9]+\b/.test(t)) || '1';
        const qty = parseInt(qtyCell.match(/([0-9]+)/)?.[1] || '1', 10) || 1;
        const desc = cellTexts.find(t => /[A-Za-z]/.test(t)) || '';
        const fam = guessFamilyFromText(desc);
        components.push({ code: codesRow[0] || null, qty, family: fam, description: desc });
      });
    });

    // Fallback: listas
    if (components.length === 0) {
      $('ul li').each((_, li) => {
        const t = $(li).text().trim();
        const codesRow = extractCodesFromText(t);
        if (codesRow.length === 0) return;
        const qty = parseInt((t.match(/([0-9]+)\s*x/i) || t.match(/qty\s*[:\-]?\s*([0-9]+)/i))?.[1] || '1', 10) || 1;
        const fam = guessFamilyFromText(t);
        components.push({ code: codesRow[0] || null, qty, family: fam, description: t });
      });
    }

    return { partNumber, title, components };
  } catch (e) {
    console.log(`⚠️  Error scrapeKitDetailPage: ${e.message}`);
    return null;
  }
}

function guessFamilyFromText(text) {
  const T = String(text || '').toUpperCase();
  if (/(OIL|ACEITE|LUBE)/.test(T)) return 'OIL';
  if (/(FUEL|COMBUSTIBLE|SEPARATOR)/.test(T)) return 'FUEL';
  if (/(AIR|AIRE)/.test(T)) return 'AIR';
  if (/(HYDRAULIC|HIDR)/.test(T)) return 'HYDRAULIC';
  if (/(COOLANT|REFRIG)/.test(T)) return 'COOLANT';
  if (/(CABIN|CABINA)/.test(T)) return 'CABIN';
  return 'COMPONENT';
}

module.exports = {
  buildFleetguardSearchURL,
  scrapeFleetguardMaintenanceKits,
  scrapeKitDetailPage
};
