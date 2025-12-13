// ============================================================================
//  SKU GENERATOR — ELIMFILTERS v6.0.0 (INMUTABLE)
//  Sistema oficial de generación de SKU ELIMFILTERS
//
//  *** BAJO NINGUNA CIRCUNSTANCIA PUEDE SER MODIFICADO ***
//
//  Protecciones:
//   - Usa exclusivamente los prefijos oficiales (prefixes.js)
//   - Sin inventos, sin fallback, sin valores por defecto
//   - Validación estricta de los últimos 4 dígitos
//   - Manejo de errores controlado
//   - Rutas especiales EM9 / ET9 blindadas
// ============================================================================

const { appendFailure } = require('../services/selfHealingLogger');
const { extract4Digits } = require('../utils/digitExtractor');
const PREFIXES = require('../config/prefixes');
const { getPrefix } = require('./getPrefix');

// ============================================================================
// VALIDACIONES BASE
// ============================================================================

function validateLast4(last4) {
    if (!/^\d{4}$/.test(last4)) {
        return `Invalid last4 digits '${last4}'. Must be exactly 4 numeric digits.`;
    }
    return null;
}

function logFailure(ctx, reason) {
    try {
        appendFailure({
            failed_query_code: ctx?.rawCode || ctx?.code || null,
            family_inference_signals: ctx?.family_inference_signals || 'sku:generationError',
            suggested_family_duty: ctx?.suggested_family_duty || null,
            reason
        });
    } catch (_) {}
}

// ============================================================================
// SKU PRINCIPAL — ELIMFILTERS
// ============================================================================

function generateSKU(family, duty, last4, ctx = {}) {
    // ---------------------------------------
    // Validación de parámetros
    // ---------------------------------------
    if (!family || !duty) {
        const err = "Missing family or duty for SKU generation";
        logFailure(ctx, err);
        return { error: err };
    }

    if (!last4) {
        const err = "Missing last4 digits for SKU generation";
        logFailure(ctx, err);
        return { error: err };
    }

    // ---------------------------------------
    // Validación estricta de los últimos 4 dígitos
    // ---------------------------------------
    const digitErr = validateLast4(last4);
    if (digitErr) {
        logFailure(ctx, digitErr);
        return { error: digitErr };
    }

    // ---------------------------------------
    // Obtener prefijo (reglas inmutables)
    // ---------------------------------------
    const prefix = getPrefix(family, duty);
    if (!prefix) {
        const err = `No prefix rule found for ${family}|${duty}`;
        logFailure(ctx, err);
        return { error: err };
    }

    // ---------------------------------------
    // Generar SKU final
    // ---------------------------------------
    const sku = prefix + last4;
    console.log(`✅ SKU Generated: ${sku}`);
    return sku;
}

// ============================================================================
//  BLOQUE EM9 — LÍNEA MARINA (100% blindado)
// ============================================================================
//
//  Reglas:
//   EM9-FXXXX → fuel marine
//   EM9-OXXXX → oil marine
//   EM9-AXXXX → air marine
//   EM9-SXXXX → separators marinos
//
// ============================================================================

function generateEM9SubtypeSKU(subtypeFamily, last4) {
    const fam = String(subtypeFamily || "").toUpperCase();
    const map = {
        FUEL: "EM9-F",
        OIL: "EM9-O",
        AIRE: "EM9-A"
    };

    const prefix = map[fam] || "EM9-F";

    const l4 = String(last4 || "").toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(l4)) {
        return { error: `Invalid last4 '${last4}'. Must be 4 alphanumeric characters.` };
    }

    return prefix + l4;
}

function generateEM9SSeparatorSKU(originalCode) {
    const code = String(originalCode || "").trim();
    if (!code) return { error: "Missing original code for EM9-S" };
    return "EM9-S" + code;
}

// ============================================================================
//  BLOQUE ET9 — Turbinas HD (Donaldson/Racor/Parker)
// ============================================================================
//
//  Reglas:
//    • ET9XXXX   → sistemas / housings
//    • ET9-FYYYY → elementos
//
// ============================================================================

function generateET9SystemSKU(originalCode) {
    const code = String(originalCode || "").trim();
    if (!code) return { error: "Missing original ET9 system code" };
    return "ET9" + code;
}

function generateET9FElementSKU(originalCode) {
    const raw = String(originalCode || "").toUpperCase().trim();
    if (!raw) return { error: "Missing ET9 element code" };

    // Extrae base numérica de 3–5 dígitos
    const mBase = raw.match(/^(\d{3,5})/);
    if (!mBase) return { error: `No numeric base found in '${originalCode}'` };
    const base = mBase[1];

    // Determina el sufijo (micron)
    let suffix = "S";
    if (/[T]/.test(raw)) suffix = "T";
    else if (/[P]/.test(raw)) suffix = "P";
    else if (/[S]/.test(raw)) suffix = "S";

    return "ET9-F" + base + suffix;
}

// ============================================================================
// EXPORTS (blindado)
// ============================================================================

module.exports = {
    generateSKU,
    generateEM9SubtypeSKU,
    generateEM9SSeparatorSKU,
    generateET9SystemSKU,
    generateET9FElementSKU,
};
