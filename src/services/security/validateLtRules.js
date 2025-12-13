'use strict';

// ===========================================================
//  LT / ELIMFILTERS — VALIDATOR CORE (PARTE 1)
//  Archivo: /services/security/validateLtRules.js
//  Función: Garantiza cumplimiento ESTRICTO del LT_RULES_MASTER.json
// ===========================================================

const fs = require("fs");
const path = require("path");

// ===============================
// Carga de reglas oficiales
// ===============================
const RULES_PATH = path.join(__dirname, "../../config/LT_RULES_MASTER.json");

function loadRules() {
  if (!fs.existsSync(RULES_PATH)) {
    throw new Error("❌ ERROR: LT_RULES_MASTER.json no existe. El servidor NO PUEDE INICIAR.");
  }

  const raw = fs.readFileSync(RULES_PATH, "utf8");

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error("❌ ERROR: LT_RULES_MASTER.json está corrupto.");
  }
}

const RULES = loadRules();


// =======================================================================
// VALIDACIÓN 1 — Fuentes de Scraping (Donaldson, Fleetguard, FRAM)
// =======================================================================
function validateScraperSource({ duty, source }) {
  const rules = RULES.rules.scraping;

  if (!rules[source]) {
    throw new Error(`❌ Fuente de scraping no permitida: ${source}`);
  }

  const allowedForDuty = rules[source].allowed_for;
  if (allowedForDuty !== duty) {
    throw new Error(
      `❌ Scraper inválido: ${source}. Permitido solo para ${allowedForDuty}.`
    );
  }

  return true;
}


// =======================================================================
// VALIDACIÓN 2 — Columnas permitidas según origen
// =======================================================================
function validateColumns({ source, columns }) {
  const allowed = RULES.rules.scraping[source].columns_allowed;

  for (const col of columns) {
    if (!allowed.includes(col)) {
      throw new Error(
        `❌ Columna prohibida para ${source}: ${col}. Solo permitidas: ${allowed.join(", ")}`
      );
    }
  }

  return true;
}


// =======================================================================
// VALIDACIÓN 3 — SKU Rules (HD / LD / INTERNOS)
// =======================================================================
function validateSkuGeneration({ duty, prefix, baseCode }) {
  let rule;

  if (duty === "HD") rule = RULES.rules.sku_generation.HD;
  else if (duty === "LD") rule = RULES.rules.sku_generation.LD;
  else rule = RULES.rules.sku_generation.LT_INTERNAL;

  const last4 = baseCode.slice(-4);

  if (!prefix || prefix.length < 2) {
    throw new Error("❌ Prefijo inválido en SKU.");
  }

  if (last4.length !== 4) {
    throw new Error("❌ SKU debe generarse con los últimos 4 dígitos del código base.");
  }

  return `${prefix}${last4}`;
}

// ===========================================================
//  LT / ELIMFILTERS — VALIDATOR CORE (PARTE 2)
// ===========================================================


// =======================================================================
// VALIDACIÓN 4 — Tecnologías oficiales
// =======================================================================
function validateTechnology(tech) {
  const allowed = RULES.rules.technology_assignment.allowed_values;

  if (!allowed.includes(tech)) {
    throw new Error(`❌ Tecnología prohibida: ${tech}`);
  }

  return true;
}


// =======================================================================
// VALIDACIÓN 5 — VIN Engine Rules
// =======================================================================
function validateVin(vin) {
  const regex = new RegExp(RULES.rules.vin_engine.validation_regex);

  if (!regex.test(vin)) {
    throw new Error("❌ VIN inválido. Debe ser de 17 caracteres válidos.");
  }

  return true;
}


// =======================================================================
// VALIDACIÓN 6 — Kits EK5 / EK3
// =======================================================================
function validateKit({ sku, duty }) {
  if (duty === "HD") {
    if (!sku.startsWith("EK5")) {
      throw new Error("❌ SKU de kit HD inválido. Debe comenzar con EK5.");
    }
  } else if (duty === "LD") {
    if (!sku.startsWith("EK3")) {
      throw new Error("❌ SKU de kit LD inválido. Debe comenzar con EK3.");
    }
  }

  return true;
}


// =======================================================================
// VALIDACIÓN 7 — Seguridad del servidor
// =======================================================================
function validateSecurity() {
  const sec = RULES.rules.security;

  if (sec.block_on_rule_violation !== true) {
    throw new Error("❌ La seguridad del servidor está mal configurada. MUST BLOCK = true");
  }

  return true;
}


// =======================================================================
// VALIDACIÓN GLOBAL — TODO PASA POR AQUÍ
// =======================================================================
function validateAll(payload) {
  try {
    validateSecurity();

    if (payload.source) validateScraperSource(payload);
    if (payload.columns) validateColumns(payload);
    if (payload.sku) validateKit(payload);
    if (payload.technology) validateTechnology(payload.technology);
    if (payload.vin) validateVin(payload.vin);

    return true;

  } catch (err) {
    console.error("🚨 VALIDACIÓN LT — BLOQUEADO:", err.message);
    throw err;
  }
}


// =======================================================================
// EXPORT
// =======================================================================
module.exports = {
  validateAll,
  validateScraperSource,
  validateColumns,
  validateSkuGeneration,
  validateTechnology,
  validateVin,
  validateKit,
  validateSecurity
};
