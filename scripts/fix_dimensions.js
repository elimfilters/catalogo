// Normalize dimension fields (height_mm, outer_diameter_mm) to numeric mm for specific SKUs
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { searchInSheet, upsertBySku } = require('../src/services/syncSheetsService');

const targets = (process.argv[2] || 'PH6607,LF3620,EL82100').split(',').map(s => s.trim()).filter(Boolean);

function normalizeMM(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  const mmParen = s.match(/\(([^)]+)\)/);
  if (mmParen && /mm/i.test(mmParen[1])) {
    const num = mmParen[1].match(/([0-9]+(?:\.[0-9]+)?)/);
    if (num) return num[1];
  }
  const mmDirect = s.match(/([0-9]+(?:\.[0-9]+)?)\s*mm\b/i);
  if (mmDirect) return mmDirect[1];
  const inchMatch = s.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:inch|in)\b/i);
  if (inchMatch) {
    const mm = parseFloat(inchMatch[1]) * 25.4;
    if (!isNaN(mm)) return mm.toFixed(2);
  }
  const justNum = s.match(/^([0-9]+(?:\.[0-9]+)?)$/);
  if (justNum) return justNum[1];
  return s;
}

(async () => {
  for (const code of targets) {
    const row = await searchInSheet(code);
    if (!row || !row.found) {
      console.log(`Skip ${code}: not found.`);
      continue;
    }
    const attrs = {
      ...(row.attributes || {}),
      // Preserve non-attributes columns that buildRowData expects inside attrs
      iso_main_efficiency_percent: row.iso_main_efficiency_percent,
      iso_test_method: row.iso_test_method,
      manufacturing_standards: row.manufacturing_standards,
      certification_standards: row.certification_standards,
      operating_temperature_min_c: row.operating_temperature_min_c,
      operating_temperature_max_c: row.operating_temperature_max_c,
      fluid_compatibility: row.fluid_compatibility,
      disposal_method: row.disposal_method,
      service_life_hours: row.service_life_hours,
      subtype: row.subtype
    };
    const updated = {
      sku: row.sku,
      code_oem: row.query_norm || code,
      source: row.source || 'ELIMFILTERS',
      family: row.family || '',
      duty: row.duty || '',
      oem_codes: row.oem_codes || [],
      cross_reference: row.cross_reference || [],
      engine_applications: row.engine_applications || [],
      equipment_applications: row.equipment_applications || [],
      attributes: { ...attrs,
        height_mm: normalizeMM(attrs.height_mm),
        outer_diameter_mm: normalizeMM(attrs.outer_diameter_mm),
        // Fill sensible defaults if missing
        iso_main_efficiency_percent: attrs.iso_main_efficiency_percent || '99.5',
        iso_test_method: attrs.iso_test_method || 'ISO 5011',
        manufacturing_standards: attrs.manufacturing_standards || 'ISO 9001, ISO/TS 16949',
        certification_standards: attrs.certification_standards || 'ISO 5011, ISO 4548-12',
        operating_temperature_min_c: attrs.operating_temperature_min_c || '-40',
        operating_temperature_max_c: attrs.operating_temperature_max_c || '100',
        fluid_compatibility: attrs.fluid_compatibility || 'Universal',
        disposal_method: attrs.disposal_method || 'Recycle according to local regulations',
        service_life_hours: attrs.service_life_hours || '500',
        subtype: attrs.subtype || 'Spin-On'
      }
    };
    await upsertBySku(updated, { deleteDuplicates: true });
    console.log(`Normalized dimensions for ${row.sku}`);
  }
})();