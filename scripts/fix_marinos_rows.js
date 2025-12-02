#!/usr/bin/env node
// Saneamiento de filas en Google Sheet 'Marinos':
// - Reubica textos de mensaje mal ubicados en columnas de especificaciones a la columna 'message'
// - Inicializa 'query' y 'normsku' a partir de 'sku' cuando falten
// - Mantiene datos existentes; no borra especificaciones reales

const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const { initSheet, getOrCreateMarinosSheet } = require('../src/services/marineImportService');
const prefixMap = require('../src/config/prefixMap');

const MESSAGE_TOKENS = new Set([
  'SKU ya existe en Master',
  'Listo para upsert en Master',
  'SKU guardado en Marinos'
]);

// Columnas de especificación añadidas (objetivo para reubicar mensajes mal colocados)
const SPEC_COLUMNS = [
  'height_mm','outer_diameter_mm','thread_size','micron_rating',
  'operating_temperature_min_c','operating_temperature_max_c','fluid_compatibility','disposal_method',
  'gasket_od_mm','gasket_id_mm','bypass_valve_psi','beta_200','hydrostatic_burst_psi','dirt_capacity_grams',
  'rated_flow_gpm','rated_flow_cfm','operating_pressure_min_psi','operating_pressure_max_psi','weight_grams',
  'panel_width_mm','panel_depth_mm','water_separation_efficiency_percent','drain_type','inner_diameter_mm','pleat_count',
  'seal_material','housing_material','iso_main_efficiency_percent','iso_test_method','manufacturing_standards',
  'certification_standards','service_life_hours','change_interval_km'
];

async function run({ dryRun = false } = {}) {
  const doc = await initSheet();
  const sheet = await getOrCreateMarinosSheet(doc);
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();

  let processed = 0;
  let movedMessages = 0;
  let initializedQuery = 0;
  let initializedNormsku = 0;

  for (const row of rows) {
    let changed = false;

    // Reubicar mensajes mal colocados
    for (const col of SPEC_COLUMNS) {
      const val = row[col];
      const s = String(val || '').trim();
      if (!s) continue;
      if (MESSAGE_TOKENS.has(s)) {
        // Mover a message (apend si ya existe)
        const curMsg = String(row.message || '').trim();
        row.message = curMsg ? `${curMsg}; ${s}` : s;
        row[col] = '';
        movedMessages++;
        changed = true;
      }
    }

    // Inicializar query desde sku si falta
    const sku = String(row.sku || '').toUpperCase().trim();
    if (sku) {
      const q = String(row.query || '').trim();
      if (!q) {
        row.query = prefixMap.normalize(sku);
        initializedQuery++;
        changed = true;
      }
      const ns = String(row.normsku || '').toUpperCase().trim();
      if (!ns) {
        row.normsku = sku;
        initializedNormsku++;
        changed = true;
      }
    }

    if (changed && !dryRun) {
      await row.save();
    }
    if (changed) processed++;
  }

  console.log(JSON.stringify({
    ok: true,
    dryRun,
    rows_total: rows.length,
    rows_changed: processed,
    moved_messages: movedMessages,
    initialized_query: initializedQuery,
    initialized_normsku: initializedNormsku
  }, null, 2));
}

(async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  await run({ dryRun });
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });