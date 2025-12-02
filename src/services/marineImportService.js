const { GoogleSpreadsheet } = require('google-spreadsheet');
const prefixMap = require('../config/prefixMap');
const { scraperBridge } = require('../scrapers/scraperBridge');
const { generateSKU, generateEM9SubtypeSKU, generateEM9SSeparatorSKU, generateET9SystemSKU, generateET9FElementSKU } = require('../sku/generator');
const { getMedia } = require('../utils/mediaMapper');
const { searchInSheet, buildRowData } = require('./syncSheetsService');

const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';
const MARINOS_TITLE = 'Marinos';

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  const s = String(value || '')
    .split(/[,;\n\t/]+/)
    .map(x => x.trim())
    .filter(Boolean);
  return Array.from(new Set(s));
}

async function initSheet() {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  const credsRaw = process.env.GOOGLE_CREDENTIALS;
  if (credsRaw) {
    let creds = JSON.parse(credsRaw);
    if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    await doc.useServiceAccountAuth({ client_email: creds.client_email, private_key: creds.private_key });
  } else if ((process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL) && process.env.GOOGLE_PRIVATE_KEY) {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    await doc.useServiceAccountAuth({ client_email: clientEmail, private_key: privateKey });
  } else {
    throw new Error('Missing Google Sheets credentials');
  }
  await doc.loadInfo();
  return doc;
}

// Header schema for 'Marinos' tab: preserve existing order and append requested columns
const INPUT_HEADERS = [
  // Existing inputs and hints (preserved to avoid data misalignment)
  'code',
  'brand_hint',
  'family_hint',
  'duty_hint',
  'description',
  'oem_codes_raw',
  'cross_reference_raw',
  'notes',
  'engine_applications_raw',
  'equipment_applications_raw',
  'oem_codes_extra_raw',
  'cross_reference_extra_raw',
  // Existing outputs
  'normsku',
  'sku',
  'media_type',
  'duty_type',
  'type',
  'subtype',
  'oem_codes',
  'cross_reference',
  'engine_applications',
  'equipment_applications',
  'status',
  'message',
  // Requested additions (appended to preserve existing data positions)
  'query',
  'height_mm',
  'outer_diameter_mm',
  'thread_size',
  'micron_rating',
  'operating_temperature_min_c',
  'operating_temperature_max_c',
  'fluid_compatibility',
  'disposal_method',
  'gasket_od_mm',
  'gasket_id_mm',
  'bypass_valve_psi',
  'beta_200',
  'hydrostatic_burst_psi',
  'dirt_capacity_grams',
  'rated_flow_gpm',
  'rated_flow_cfm',
  'operating_pressure_min_psi',
  'operating_pressure_max_psi',
  'weight_grams',
  'panel_width_mm',
  'panel_depth_mm',
  'water_separation_efficiency_percent',
  'drain_type',
  'inner_diameter_mm',
  'pleat_count',
  'seal_material',
  'housing_material',
  'iso_main_efficiency_percent',
  'iso_test_method',
  'manufacturing_standards',
  'certification_standards',
  'service_life_hours',
  'change_interval_km'
];

async function getOrCreateMarinosSheet(doc) {
  let sheet = doc.sheetsByTitle[MARINOS_TITLE] || null;
  if (!sheet) {
    sheet = await doc.addSheet({ title: MARINOS_TITLE, headerValues: INPUT_HEADERS });
  } else {
    // Ensure headers (non-destructive)
    try {
      const cur = Array.isArray(sheet.headerValues) ? sheet.headerValues : [];
      const need = INPUT_HEADERS;
      if (cur.length !== need.length || cur.some((h, i) => h !== need[i])) {
        await sheet.setHeaderRow(need);
      }
    } catch (_) {}
  }
  return sheet;
}

async function seedMarinosRow(code, doc) {
  const sheet = await getOrCreateMarinosSheet(doc);
  await sheet.addRow({
    query: prefixMap.normalize(code),
    normsku: '',
    duty_type: '',
    type: '',
    subtype: '',
    description: '',
    media_type: '',
    oem_codes_raw: code,
    cross_reference_raw: '',
    engine_applications_raw: '',
    equipment_applications_raw: ''
  });
  return true;
}

function decideSkuAndFamily(codeRaw, duty, familyHint) {
  const up = String(codeRaw || '').toUpperCase();
  let family = familyHint || null;
  let sku = null;
  if (/^R(12|15|20|25|45|60|90|120)(T|S)$/.test(up)) {
    sku = generateEM9SSeparatorSKU(up);
    family = 'MARINE';
    return { sku, family };
  }
  if (/^\d{3,5}(MA|FH)\b/.test(up)) {
    sku = generateET9SystemSKU(up);
    family = 'TURBINE SERIES';
    return { sku, family };
  }
  if (/^(2010|2020|2040)/.test(up)) {
    sku = generateET9FElementSKU(up);
    family = 'TURBINE SERIES';
    return { sku, family };
  }
  if (String(family).toUpperCase() === 'MARINE') {
    const base = 'FUEL';
    sku = generateEM9SubtypeSKU(base, require('../utils/digitExtractor').extract4Digits(up));
    return { sku, family: 'MARINE' };
  }
  // Fallback generic
  sku = generateSKU(family || 'FUEL', duty || 'HD', require('../utils/digitExtractor').extract4Digits(up));
  return { sku, family: family || 'FUEL' };
}

async function importMarinos({ dryRun = true } = {}) {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  const rows = await sheet.getRows();
  const results = [];

  for (const row of rows) {
    const code = String(row.code || '').trim();
    if (!code) continue;
    const hint = prefixMap.resolveBrandFamilyDutyByPrefix(code) || {};
    const duty = row.duty_hint || hint.duty || 'HD';
    const familyHint = row.family_hint || hint.family || null;

    let scraper = await scraperBridge(code, duty);
    // If scraper did not classify family, use hint
    const family = (scraper && scraper.family) || familyHint || 'MARINE';
    const { sku, family: famFinal } = decideSkuAndFamily(code, duty, family);
    const media_type = getMedia(famFinal, duty);

    const oemA = toArray(row.oem_codes_raw);
    const oemB = toArray(row.oem_codes_extra_raw);
    const crossA = toArray(row.cross_reference_raw);
    const crossB = toArray(row.cross_reference_extra_raw);
    const engines = toArray(row.engine_applications_raw);
    const equipments = toArray(row.equipment_applications_raw);

    const oem_codes = Array.from(new Set([code, ...oemA, ...oemB]));
    const cross_reference = Array.from(new Set([...(scraper?.cross || []), ...crossA, ...crossB]));

  const existing = await searchInSheet(sku);
  const isDuplicate = !!existing;

  row.normsku = sku;
  row.sku = sku;
  row.media_type = media_type;
  row.duty_type = duty;
  row.type = famFinal;
  row.subtype = /^R(12|15|20|25|45|60|90|120)(T|S)$/i.test(code) ? 'SEPARATOR' : (/^\d{3,5}(MA|FH)\b/.test(code) ? 'SYSTEM' : (/^(2010|2020|2040)/.test(code) ? 'ELEMENT' : ''));
  row.oem_codes = JSON.stringify(oem_codes);
    row.cross_reference = JSON.stringify(cross_reference);
    row.engine_applications = JSON.stringify(engines);
    row.equipment_applications = JSON.stringify(equipments);
    row.status = isDuplicate ? 'DUPLICATE' : 'OK';
    row.message = isDuplicate ? 'SKU ya existe en Master' : 'Listo para upsert en Master';
    await row.save();

    if (!dryRun && !isDuplicate) {
      const data = {
        status: 'OK',
        query_normalized: prefixMap.normalize(code),
        code_input: code,
        code_oem: code,
        oem_codes,
        duty,
        family: famFinal,
        sku,
        media: media_type,
        source: scraper?.source || 'OEM',
        cross_reference,
        applications: engines,
        equipment_applications: equipments,
        attributes: {
          manufactured_by: 'ELIMFILTERS'
        },
        message: 'Importador Marinos'
      };
      await upsertBySku(data);
    }

    results.push({ code, sku, media_type, duty, family: famFinal, duplicate: isDuplicate });
  }

  return { ok: true, processed: results.length, results };
}

module.exports = { importMarinos, initSheet, getOrCreateMarinosSheet, seedMarinosRow };

/**
 * Upsert a detected Marine SKU into the 'Marinos' sheet (not Master).
 * Maps detection payload into Marinos output columns.
 * @param {object} data - detection masterData payload
 * @returns {Promise<void>}
 */
async function upsertMarinosBySku(data) {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  const rows = await sheet.getRows();

  const skuNorm = String(data.sku || '').toUpperCase().trim();
  const match = rows.find(r => String(r.normsku || '').toUpperCase().trim() === skuNorm);

  // Build base row using Master mapping (ensures formatting/normalizations)
  const base = buildRowData({ ...data });
  // Helper to format list-like values into comma-separated string
  const formatList = (list) => {
    const arr = Array.isArray(list) ? list : (list ? [list] : []);
    return Array.from(new Set(arr.map(v => typeof v === 'string' ? v : (v?.toString?.() || '')).map(s => s.trim()).filter(Boolean))).join(', ');
  };

  const rowData = {
    // Base normalized fields
    ...base,
    normsku: skuNorm,
    sku: skuNorm,
    // Raw inputs
    oem_codes_raw: formatList(data.oem_codes),
    cross_reference_raw: formatList(data.cross_reference),
    engine_applications_raw: formatList((data.applications || []).map(a => a?.name || a)),
    equipment_applications_raw: formatList((data.equipment_applications || []).map(a => a?.name || a)),
    // Operational
    status: 'OK',
    message: 'SKU guardado en Marinos'
  };

  if (match) {
    Object.entries(rowData).forEach(([k, v]) => { match[k] = v; });
    await match.save();
    console.log(`✅ Upserted to Google Sheet 'Marinos': ${skuNorm}`);
  } else {
    await sheet.addRow(rowData);
    console.log(`➕ Inserted into Google Sheet 'Marinos': ${skuNorm}`);
  }
}

module.exports.upsertMarinosBySku = upsertMarinosBySku;