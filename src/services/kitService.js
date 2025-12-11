// ============================================================================
// KIT SERVICE — BLINDED VERSION (IMMUTABLE SKU CONTRACT)
// Los kits solo pueden usar:
//    EK3 → LD
//    EK5 → HD
// Prefijos no pueden generarse aquí. Solo generator.js lo hace.
// ============================================================================

const PREFIXES = require('../config/prefixes');
const { generateSKU } = require('../sku/generator');
const { normalizeFamily } = require('../utils/familyNormalizer');
const LT_RULES = require('../config/LT_RULES_MASTER.json').rules;

// ============================================================================
// VALIDADORES
// ============================================================================

function validateColumns(kitRow) {
  const required = [
    "Contenido del Kit",
    "Filtro Principal (Ref)",
    "Tecnología"
  ];

  for (const col of required) {
    if (!kitRow[col] || String(kitRow[col]).trim() === "") {
      throw new Error(`❌ Missing required column: ${col}`);
    }
  }
}

// ============================================================================
// NORMALIZACIÓN DEL TIPO DE DUTY SEGÚN REGLAS
// ============================================================================

function detectDutyFromLT(brand) {
  if (!brand) return null;

  const rules = LT_RULES.scraping[brand];
  if (!rules) return null;

  return rules.allowed_for || null;
}

// ============================================================================
// MATRIZ DE DECISIÓN DEL PREFIJO
// ============================================================================

function getKitPrefix(duty) {
  if (!duty) return null;

  const d = duty.toUpperCase();

  if (d === "LD") return PREFIXES.KIT_LD;   // EK3
  if (d === "HD") return PREFIXES.KIT_HD;   // EK5

  return null;
}

// ============================================================================
// PROCESADOR PRINCIPAL DE KIT
// ============================================================================

function processKitRow(kitRow = {}) {
  validateColumns(kitRow);

  const primaryRef = String(kitRow["Filtro Principal (Ref)"]).trim();
  const contenido = String(kitRow["Contenido del Kit"]).trim();
  const technology = String(kitRow["Tecnología"]).trim();

  // ========================================================================
  // 1. DETERMINAR FAMILY BASADO EN EL FILTRO PRINCIPAL
  //    (solo synonyms → normalizeFamily)
  // ========================================================================
  let family = normalizeFamily(primaryRef);
  if (!family) {
    throw new Error(`❌ Unable to determine family for primary filter: ${primaryRef}`);
  }

  // ========================================================================
  // 2. DETERMINAR DUTY DEL KIT (solo a partir de LT_RULES_MASTER)
  // ========================================================================
  const brand = kitRow.brand || null;
  const duty = detectDutyFromLT(brand);

  if (!duty) {
    throw new Error(`❌ Unable to determine duty for KIT. Brand: ${brand}`);
  }

  // ========================================================================
  // 3. DETERMINAR PREFIJO DEL KIT
  // ========================================================================
  const prefix = getKitPrefix(duty);
  if (!prefix) {
    throw new Error(`❌ Invalid duty. Could not map KIT prefix for: ${duty}`);
  }

  // ========================================================================
  // 4. GENERAR SKU OFICIAL DEL KIT (solo 1)
  // ========================================================================
  const digits = primaryRef.replace(/\D/g, '').slice(-4) || "0000";

  const officialSKU = generateSKU(family, duty, digits);

  if (typeof officialSKU !== "string") {
    throw new Error(`❌ SKU generation failure for KIT with main filter: ${primaryRef}`);
  }

  return {
    main_filter: primaryRef,
    family,
    duty,
    prefix,
    sku: officialSKU,
    contenido,
    technology,
    status: "FINAL/Homologada"
  };
}

module.exports = {
  processKitRow
};