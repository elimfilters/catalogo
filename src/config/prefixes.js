// ============================================================================
//  PREFIJOS OFICIALES ELIMFILTERS (INMUTABLES)
//  Este archivo define los prefijos corporativos oficiales utilizados en
//  todos los catalogos, APIs, sistemas internos y productos fisicos.
//
//  *** BAJO NINGUNA CIRCUNSTANCIA PUEDE SER MODIFICADO ***
//
//  Protegido mediante:
//  - Object.freeze()
//  - CODEOWNERS (solo el CEO aprueba cambios)
//  - Validacion de integridad al arrancar el servidor
// ============================================================================

const PREFIXES = Object.freeze({
  // ------------------------------------------------------------------------
  // LD & HD (compartidos)
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
  // Heavy Duty — Especializados
  // ------------------------------------------------------------------------
  TURBINE_HD: "ET9",
  HYDRAULIC_HD: "EH6",
  SEPARATOR_HD: "ES9",
  COOLANT_HD: "EW7",
  AIR_DRYER_HD: "ED4",
  
  // ------------------------------------------------------------------------
  // Air Housings (carcasas de filtros de aire)
  // ------------------------------------------------------------------------
  AIR_HOUSING_HD: "EA2",
  
  // ------------------------------------------------------------------------
  // MARINE — Todos los tipos
  // ------------------------------------------------------------------------
  MARINE_ANY: "EM9",
  TURBINE_MARINE: "EM9",
  
  // ------------------------------------------------------------------------
  // Kits
  // ------------------------------------------------------------------------
  KIT_LD: "EK3",
  KIT_HD: "EK5",
});

module.exports = PREFIXES;
