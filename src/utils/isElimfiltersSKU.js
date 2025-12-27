// ============================================================================
// IS ELIMFILTERS SKU - Detector de SKU ELIMFILTERS
// ============================================================================

/**
 * Detecta si un código es SKU ELIMFILTERS
 * @param {string} codigo - Código a verificar
 * @returns {boolean} true si es SKU ELIMFILTERS
 */
function isElimfiltersSKU(codigo) {
  if (!codigo) return false;
  
  const normalized = String(codigo).trim().toUpperCase();
  
  // Prefijos ELIMFILTERS conocidos
  const elimfiltersPrefixes = [
    'EA1', 'EA2', 'EA3', // Air
    'EL8', 'EL9',        // Oil
    'EF9',               // Fuel
    'ES9',               // Fuel Separator
    'EC7',               // Cabin
    'EH6',               // Hydraulic
    'EK5', 'EK6',        // Coolant
    'ED4',               // Air Dryer
    'EM3'                // Marine
  ];
  
  // Verificar si comienza con algún prefijo ELIMFILTERS
  for (const prefix of elimfiltersPrefixes) {
    if (normalized.startsWith(prefix)) {
      // Verificar que tenga formato válido: PREFIJO + 4 dígitos
      const rest = normalized.substring(prefix.length);
      if (/^\d{4}$/.test(rest)) {
        return true;
      }
    }
  }
  
  return false;
}

module.exports = { isElimfiltersSKU };
