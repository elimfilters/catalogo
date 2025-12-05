'use strict';

// Stagehand Job: Scrape Fleetguard Maintenance Kits and save to KITS_EK5
// Usage: node scripts/scrape_fleetguard_kits.js "Freightliner" "XB SERIES" "C7" "2004"

const { scrapeFleetguardMaintenanceKits, buildFleetguardSearchURL } = require('../src/services/fleetguardKitsScraperService');
const { deriveEk5Sku, summarizeComponents } = require('../src/services/kitService');
const { saveKitToSheet } = require('../src/services/syncSheetsService');

async function main() {
  const [make, model, engine, year] = process.argv.slice(2);
  if (!make || !model || !engine || !year) {
    console.log('Uso: node scripts/scrape_fleetguard_kits.js <make> <model> <engine> <year>');
    console.log('Ejemplo: node scripts/scrape_fleetguard_kits.js "Freightliner" "XB SERIES" "C7" "2004"');
    process.exit(1);
  }

  console.log(`🔎 Scrape Fleetguard Kits: ${make} ${model} ${engine} ${year}`);
  console.log(`URL: ${buildFleetguardSearchURL({ make, model, engine, year })}`);

  const { kits } = await scrapeFleetguardMaintenanceKits({ make, model, engine, year });
  if (!Array.isArray(kits) || kits.length === 0) {
    console.log('⚠️  No se encontraron códigos de Maintenance Kits en la página.');
    return;
  }

  let saved = 0;
  for (const k of kits) {
    const ek5 = deriveEk5Sku(k.partNumber);
    if (!ek5) {
      console.log(`⏭️  Saltando código no válido para EK5: ${k.partNumber}`);
      continue;
    }
    // Enriquecer contenido y filtro principal si hay componentes
    const content = Array.isArray(k.components) && k.components.length > 0
      ? summarizeComponents(k.components)
      : 'N/A';
    const primary = pickPrimaryFilter(k.components);
    const row = {
      'SKU': ek5,
      'Tipo de Producto': 'Kit de Mantenimiento',
      'Contenido del Kit': content,
      'Tecnología': 'ELIMTEK™ Standard',
      'Filtro Principal (Ref)': primary?.code || '',
      'Duty': 'HD'
    };
    try {
      await saveKitToSheet(row);
      console.log(`☑️ Guardado en KITS_EK5: ${ek5} (part: ${k.partNumber})`);
      saved += 1;
    } catch (e) {
      console.log(`⚠️  Falló guardar en Sheets para ${ek5}: ${e.message}`);
    }
  }

  console.log(`✅ Completado. Kits guardados: ${saved}/${kits.length}`);
}

main().catch(err => {
  console.error('❌ Error en job de scraping de Kits Fleetguard:', err);
  process.exit(2);
});

// Prioridad: OIL > FUEL > AIR > HYDRAULIC > COOLANT > CABIN
function pickPrimaryFilter(components) {
  if (!Array.isArray(components) || components.length === 0) return null;
  const priority = ['OIL', 'FUEL', 'AIR', 'HYDRAULIC', 'COOLANT', 'CABIN'];
  let best = null;
  let bestScore = -1;
  for (const c of components) {
    const fam = String(c.family || '').toUpperCase();
    const idx = priority.indexOf(fam);
    const score = idx === -1 ? 99 : idx;
    if (best === null || score < bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}