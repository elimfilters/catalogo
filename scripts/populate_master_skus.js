// ============================================================================
// Script: Populate Google Sheet Master with provided SKUs
// Usage examples:
//   SKUS="AF25538,RS5641,AH1135" npm run sheet:populate
//   node scripts/populate_master_skus.js --skus "AF25538, RS5641, AH1135"
//   node scripts/populate_master_skus.js AF25538 RS5641 AH1135
// ----------------------------------------------------------------------------
// Requires Google Sheets credentials via env:
//   - GOOGLE_CREDENTIALS (JSON) OR
//   - GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY
// ----------------------------------------------------------------------------
// This script uses upsertBySku to insert/update rows with minimal data:
//   - sku: tal cual fue suministrado
//   - query_norm: versión normalizada del código (A-Z0-9)
// ============================================================================

try { require('dotenv').config(); } catch (_) {}

const { upsertBySku } = require('../src/services/syncSheetsService');

function parseSkusFromArgs() {
  const argv = process.argv.slice(2);
  // Support: --skus "a,b,c" OR positional args
  const skusFlagIndex = argv.findIndex(a => a === '--skus');
  let rawList = [];
  if (skusFlagIndex !== -1 && argv[skusFlagIndex + 1]) {
    rawList = argv[skusFlagIndex + 1].split(',');
  } else if (process.env.SKUS) {
    rawList = String(process.env.SKUS).split(',');
  } else {
    rawList = argv; // positional
  }
  return Array.from(new Set(
    rawList
      .map(s => String(s || '').trim())
      .filter(Boolean)
  ));
}

function normalizeCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function main() {
  const skus = parseSkusFromArgs();
  if (!skus.length) {
    console.error('❌ No se recibieron SKUs. Use --skus "AF25538,RS5641,..." o pase SKUs como argumentos.');
    process.exit(1);
  }

  console.log(`📋 SKUs a procesar: ${skus.join(', ')}`);

  // Validate credentials presence early
  const hasJsonCreds = !!process.env.GOOGLE_CREDENTIALS;
  const hasKeyPair = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL) && !!process.env.GOOGLE_PRIVATE_KEY;
  if (!hasJsonCreds && !hasKeyPair) {
    console.error('❌ Faltan credenciales de Google Sheets. Configure GOOGLE_CREDENTIALS o GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY.');
    process.exit(1);
  }

  let successCount = 0;
  for (const sku of skus) {
    const queryNorm = normalizeCode(sku);
    const data = {
      sku: sku,
      query_normalized: queryNorm,
      // Resto de campos opcionales se dejan vacíos para revisión manual en el Master
    };
    try {
      await upsertBySku(data, { deleteDuplicates: true });
      console.log(`✅ Upsert realizado para SKU: ${sku} (query_norm: ${queryNorm})`);
      successCount++;
    } catch (e) {
      console.error(`⚠️ Falló upsert para ${sku}: ${e.message}`);
    }
  }

  console.log(`🎯 Completado. Registros procesados: ${skus.length}, exitosos: ${successCount}.`);
}

main().catch(err => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});