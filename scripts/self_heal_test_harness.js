// Self-Heal Test Harness
// Objetivo: simular 3 fallos para un prefijo (p.ej. 'S')
// y verificar que el cron inyecte una regla determinista en skuRules.json.

const { appendFailure } = require('../src/services/selfHealingLogger');

function simulateFailures(prefix = 'S', suggestion = 'OIL|LD', count = 3) {
  for (let i = 1; i <= count; i++) {
    const code = `${prefix}_HARNESS_${i}`;
    appendFailure({
      failed_query_code: code,
      family_inference_signals: `prefix:${prefix}|morph:HARNESS`,
      suggested_family_duty: suggestion,
      reason: 'test_harness'
    });
  }
  console.log(`✅ Insertados ${count} fallos simulados para prefijo '${prefix}' con sugerencia '${suggestion}'.`);
}

if (require.main === module) {
  simulateFailures('S', 'OIL|LD', 3);
}

module.exports = { simulateFailures };