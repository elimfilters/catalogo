/**
 * ELIMFILTERS® Engineering Core - Donaldson Scraper
 * v15.1 - Fix de Ruta de Configuración
 */

const axios = require('axios');
const cheerio = require('cheerio');
let homologationMap;

try {
    // Ajuste de ruta: Ahora busca en ./src/config/ desde la raíz
    homologationMap = require('./src/config/homologation_map.json');
} catch (e) {
    console.error("⚠️ [CONFIG ERROR]: No se encontró homologation_map.json. Usando mapa de emergencia.");
    // Fallback básico para evitar que el sistema se detenga
    homologationMap = { TECHNOLOGY_HOMOLOGATION_MAP: { MAPPING_RULES: { FUEL_SYSTEM: { pref: "EF9", tech: "STANDARD", iso: "ISO" } } } };
}

// ... resto del código del scraper v15.0 ...
