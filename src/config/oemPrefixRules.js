// Universal OEM prefix → family/duty resolver
// Centraliza la lógica de inferencia por prefijo OEM (evita heurísticas dispersas)

/**
 * Reglas de prefijo OEM. Orden importa: patrones más específicos primero.
 * Cada regla puede definir `family` y opcionalmente `duty` cuando es inequívoco.
 */
const RULES = [
  // Caterpillar 1R-series → FUEL / HD
  { regex: /^1R[- ]?\d{3,6}$/i, family: 'FUEL', duty: 'HD', brand: 'CATERPILLAR' },
  // John Deere RE-series → FUEL / HD
  { regex: /^RE[- ]?\d{3,6}$/i, family: 'FUEL', duty: 'HD', brand: 'JOHN DEERE' },
  // Toyota 90915 → OIL / LD (familia inequívoca en automotriz)
  { regex: /^90915[- ]?\d{0,6}$/i, family: 'OIL', duty: 'LD', brand: 'TOYOTA' },
  // MANN WK-series → FUEL (duty puede variar; no forzar)
  { regex: /^WK[- ]?\d{2,5}$/i, family: 'FUEL', brand: 'MANN' },
  // Bosch NNNNN (algunos combustibles) – opcional; sin duty
  { regex: /^N\d{5}$/i, family: null },
];

/**
 * Normaliza código a mayúsculas y sin espacios/guiones redundantes.
 */
function normalize(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/--+/g, '-')
    .replace(/[^A-Z0-9-]/g, '');
}

// Carga reglas aprendidas (prefijos dinámicos) desde skuRules.json
let learnedPrefixes = {};
try {
  const skuRules = require('./skuRules.json');
  learnedPrefixes = skuRules && (skuRules.learnedPrefixes || skuRules.learned_prefixes) || {};
} catch (_) {
  learnedPrefixes = {};
}

function resolveFromLearnedPrefixes(rawCode, hintDuty = null) {
  const code = normalize(rawCode);
  if (!learnedPrefixes || typeof learnedPrefixes !== 'object') return null;
  // Prioridad: claves con formato regex (inician con '^') luego claves de prefijo literal
  const keys = Object.keys(learnedPrefixes);
  // Regex-anchored keys first
  for (const k of keys.filter(k => k.startsWith('^'))) {
    try {
      const rx = new RegExp(k, 'i');
      if (rx.test(code)) {
        const val = String(learnedPrefixes[k] || '').toUpperCase();
        const [family, duty] = val.split('|');
        return { family: family || null, duty: duty || hintDuty || null, brand: null };
      }
    } catch (_) { /* ignore bad regex */ }
  }
  // Literal prefix keys
  for (const k of keys.filter(k => !k.startsWith('^'))) {
    const kk = String(k || '').toUpperCase();
    if (kk && code.startsWith(kk)) {
      const val = String(learnedPrefixes[k] || '').toUpperCase();
      const [family, duty] = val.split('|');
      return { family: family || null, duty: duty || hintDuty || null, brand: null };
    }
  }
  return null;
}

/**
 * Resuelve familia y duty por prefijo OEM universal.
 * @param {string} rawCode
 * @param {string|null} hintDuty - Sugerencia de duty (HD/LD) si ya está detectada
 * @returns {{family: string|null, duty: string|null, brand?: string}|null}
 */
function resolveFamilyDutyByOEMPrefix(rawCode, hintDuty = null) {
  const code = normalize(rawCode);
  // 1) Consultar reglas aprendidas dinámicas
  const learned = resolveFromLearnedPrefixes(code, hintDuty);
  if (learned) return learned;
  // 2) Consultar reglas estáticas definidas aquí
  for (const rule of RULES) {
    if (rule.regex.test(code)) {
      return {
        family: rule.family || null,
        duty: rule.duty || hintDuty || null,
        brand: rule.brand || null,
      };
    }
  }
  return null;
}

module.exports = {
  resolveFamilyDutyByOEMPrefix,
  RULES,
  resolveFromLearnedPrefixes
};