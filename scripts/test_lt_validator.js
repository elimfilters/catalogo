/*
 * Test harness para validateLtRules.js
 * Ejecuta tres casos: EK5 (HD), EK3 (LD) y uno inválido
 */

const path = require('path');

async function main() {
  const {
    validateAll,
    loadRules,
  } = require(path.join('..', 'src', 'services', 'security', 'validateLtRules.js'));

  let rules = null;
  try {
    rules = await loadRules();
    console.log('[info] LT_RULES_MASTER.json cargado correctamente');
  } catch (e) {
    console.warn('[warn] No se pudo cargar LT_RULES_MASTER.json, se probará validateAll sin reglas explícitas:', e.message);
  }

  const tests = [
    {
      name: 'EK5 (HD) Fleetguard válido',
      input: {
        duty: 'HD',
        source: 'Fleetguard',
        columns: ['Contenido del Kit', 'Filtro Principal (Ref)', 'Tecnología'],
        sku: 'EK5-0123',
        technology: 'ELIMTEK™ Standard',
        vin: '1FDWF7DE7JDF12345',
        kits: {
          type: 'EK5',
          primaryFilter: 'LF16352',
          contents: ['LF16352 x1', 'AF25139 x1', 'WF2071 x1'],
        },
        security: { enabled: true, mode: 'strict' },
      },
    },
    {
      name: 'EK3 (LD) Fleetguard válido',
      input: {
        duty: 'LD',
        source: 'FRAM',
        columns: ['Contenido del Kit', 'Filtro Principal (Ref)', 'Tecnología'],
        sku: 'EK3-0456',
        technology: 'ELIMTEK™ Standard',
        vin: '1GCHK23U43F123456',
        kits: {
          type: 'EK3',
          primaryFilter: 'AF25139',
          contents: ['AF25139 x1', 'LF16352 x1'],
        },
        security: { enabled: true, mode: 'strict' },
      },
    },
    {
      name: 'Caso inválido (fuente/columnas/SKU/VIN)',
      input: {
        duty: 'HD',
        source: 'UnknownBrand',
        columns: ['Precio', 'Descuento'],
        sku: 'EK5-00AB',
        technology: 'ELIMTEK™ Standard',
        vin: 'XXXX',
        kits: { type: 'EK5', contents: ['LF16352 x1'] },
        security: { enabled: false },
      },
    },
  ];

  for (const t of tests) {
    try {
      const result = rules ? await validateAll(t.input, rules) : await validateAll(t.input);
      console.log(`\n=== Resultado: ${t.name} ===`);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`\n=== Error en: ${t.name} ===`);
      console.error(err && err.stack ? err.stack : err);
    }
  }
}

main().catch((e) => {
  console.error('[fatal] Error ejecutando test_lt_validator:', e && e.stack ? e.stack : e);
  process.exit(1);
});