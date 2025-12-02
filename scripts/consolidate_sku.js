// Consolidate multiple rows of the same SKU into a single canonical row
// Usage: node scripts/consolidate_sku.js <SKU> [codes...]
// Example: node scripts/consolidate_sku.js EL82100 LF3620 P552100

const { searchInSheet, upsertBySku } = require('../src/services/syncSheetsService');

function toArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String).map(s => s.trim()).filter(Boolean);
    } catch (_) {
      // fallthrough to split by comma
    }
    return v.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [String(v).trim()].filter(Boolean);
}

function uniq(arr) {
  return Array.from(new Set((arr || []).map(s => String(s).trim()).filter(Boolean)));
}

(async () => {
  const [, , skuArg, ...extraCodes] = process.argv;
  if (!skuArg) {
    console.error('Usage: node scripts/consolidate_sku.js <SKU> [codes...]');
    process.exit(1);
  }

  const SKU = skuArg.toUpperCase().trim();
  const CODES = uniq(extraCodes.map(c => c.toUpperCase().trim()));

  console.log(` Consolidating SKU ${SKU} ...`);

  // Try to fetch base data from known codes if provided (e.g., OEM and alias)
  let base = null;
  for (const code of CODES) {
    try {
      const row = await searchInSheet(code);
      if (row && row.sku && row.sku.toUpperCase().trim() === SKU) {
        base = base || row; // pick the first matching row as base
        console.log(` Using base row from code ${code}`);
      }
    } catch (e) {
      console.warn(` Could not fetch row for ${code}: ${e.message}`);
    }
  }

  // If no base found via codes, try fetching by SKU directly
  if (!base) {
    try {
      const bySku = await searchInSheet(SKU);
      if (bySku && bySku.sku && bySku.sku.toUpperCase().trim() === SKU) {
        base = bySku;
        console.log(` Using base row from SKU ${SKU}`);
      }
    } catch (e) {
      console.warn(` Could not fetch row for SKU ${SKU}: ${e.message}`);
    }
  }

  if (!base) {
    console.error(' No existing row found to consolidate. Aborting.');
    process.exit(2);
  }

  // Build consolidated lists
  const baseOEM = toArray(base.oem_codes);
  const baseXREF = toArray(base.cross_reference);
  // Include provided codes in cross_reference (aliases) and OEM list if applicable
  const oemCodes = uniq(baseOEM);
  const crossRefs = uniq(baseXREF.concat(CODES));

  const consolidated = {
    query_norm: SKU, // one row per SKU policy
    sku: SKU,
    duty: base.duty || '',
    type: base.filter_type || base.type || '',
    subtype: base.subtype || '',
    description: base.description || '',
    oem_codes: oemCodes,
    cross_reference: crossRefs,
    media_type: base.media_type || '',
    equipment_applications: base.equipment_applications || [],
    engine_applications: base.engine_applications || [],
    attributes: { ...(base.attributes || {}) }
  };

  console.log(` Upserting consolidated row for ${SKU} with refs: ${crossRefs.join(', ')}`);
  await upsertBySku(consolidated, { deleteDuplicates: true });
  console.log(' Consolidation complete. Duplicate rows removed.');
})();
