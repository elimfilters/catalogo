// ============================================================================
//  PREFIJOS OFICIALES ELIMFILTERS (INMUTABLES)
//  Este archivo define los prefijos corporativos oficiales utilizados en
//  todos los catálogos, APIs, sistemas internos y productos físicos.
//
//  *** BAJO NINGUNA CIRCUNSTANCIA PUEDE SER MODIFICADO ***
//
//  Protegido mediante:
//  - Object.freeze()
//  - CODEOWNERS (solo el CEO aprueba cambios)
//  - Validación de integridad al arrancar el servidor (policyGuard)
// ============================================================================

const PREFIXES = Object.freeze({

  // ------------------------------------------------------------------------
  // LIGHT DUTY (LD) & HEAVY DUTY (HD) — COMPARTIDOS
  // ------------------------------------------------------------------------
  OIL_LD: "EL8",
  OIL_HD: "EL8",

  FUEL_LD: "EF9",
  FUEL_HD: "EF9",

  AIR_LD: "EA1",
  AIR_HD: "EA1",

  CABIN_LD: "EC1",
  CABIN_HD: "EC1",

  // ------------------------------------------------------------------------
  // HEAVY DUTY — ESPECIALIZADOS
  // ------------------------------------------------------------------------
  TURBINE_HD: "ET9",          // TURBINEs Donaldson / Racor / Parker
  HYDRAULIC_HD: "EH6",        // Hidráulicos HD
  SEPARATOR_HD: "ES9",        // Filtros FUEL FILTER SEPARATORes de agua (Racor/Parker)
  COOLANT_HD: "EW7",          // Coolant / Extended Life Coolant Filters

  // ------------------------------------------------------------------------
  // AIR HOUSINGS (AIR HOUSINGs de AIR)
  // ------------------------------------------------------------------------
  AIR_HOUSING_LD: "EA2",
  AIR_HOUSING_HD: "EA2",

  // ------------------------------------------------------------------------
  // MARINES — TODOS LOS TIPOS
  // ------------------------------------------------------------------------
  MARINE_ANY: "EM9",          // MARINEs general, FUEL/OIL/AIR
  TURBINE_MARINE: "EM9",      // Racor Marine Series

  // ------------------------------------------------------------------------
  // KITS ELIMFILTERS — OFICIALES
  // ------------------------------------------------------------------------
  KIT_LD: "EK3",              // Kits Light Duty
  KIT_HD: "EK5",              // Kits Heavy Duty
});

// Exportación final inmutable
module.exports = PREFIXES;
