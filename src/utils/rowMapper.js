/**
 * ELIMFILTERS® Engineering Core - Row Mapper
 * v10.2 - Sustitución completa para Auditoría Donaldson
 */

const mapToMasterRow = (aiAnalysis, query) => {
    // Definimos las 56 columnas solicitadas
    const row = new Array(56).fill("");

    // --- IDENTIFICACIÓN ---
    row[0] = new Date().toLocaleDateString();
    row[1] = query.toUpperCase();              // Código OEM (ej: 1R-0755)
    row[2] = aiAnalysis.tipo_filtro;           // FUEL_SEPARATOR, LUBE_OIL, etc.
    row[3] = aiAnalysis.prefijo;                // ES9, EF9, EL8, etc.
    row[4] = aiAnalysis.duty || "HD";
    row[5] = aiAnalysis.motor_aplicacion || "";

    // --- TIER STANDARD (Calco Donaldson) ---
    if (aiAnalysis.skus?.STANDARD) {
        const std = aiAnalysis.skus.STANDARD;
        row[6] = std.sku;                      // ej: EF91316
        row[7] = std.donaldson_code;           // P551316
        row[8] = "STANDARD";
        row[9] = aiAnalysis.tecnologia;        // SYNTEPORE™, AQUAGUARD®, etc.
        row[10] = `ELIMFILTERS® ${aiAnalysis.tecnologia} - Standard Protection`;
    }

    // --- TIER PERFORMANCE ---
    if (aiAnalysis.skus?.PERFORMANCE) {
        const perf = aiAnalysis.skus.PERFORMANCE;
        row[16] = perf.sku;
        row[17] = perf.donaldson_code;
        row[18] = "PERFORMANCE";
        row[19] = aiAnalysis.tecnologia;
        row[20] = `ELIMFILTERS® ${aiAnalysis.tecnologia} - High Capacity`;
    }

    // --- TIER ELITE (Donaldson Blue Calco) ---
    if (aiAnalysis.skus?.ELITE) {
        const elite = aiAnalysis.skus.ELITE;
        row[26] = elite.sku;                   // ej: EF95810
        row[27] = elite.donaldson_code;        // DBF5810
        row[28] = "ELITE";
        row[29] = aiAnalysis.tecnologia;
        row[30] = `ELIMFILTERS® ${aiAnalysis.tecnologia} - Extreme Protection`;
    }

    // --- TAB DE ATRIBUTOS (36-40) ---
    const s = aiAnalysis.specs || {};
    row[36] = s['Length'] || s['Longitud'] || "N/A";
    row[37] = s['Outer Diameter'] || s['Diámetro exterior'] || "N/A";
    row[38] = s['Thread Size'] || s['Tamaño de la rosca'] || "N/A";
    row[39] = s['Efficiency 99%'] || s['Eficiencia 99%'] || "N/A";
    row[40] = aiAnalysis.iso_norm || "ISO COMPLIANT"; // Viene del homologation_map.json

    // --- ATRIBUTOS ES9 (Separadores) ---
    if (aiAnalysis.prefijo === "ES9") {
        row[53] = "99.5% WATER REMOVAL"; // Columna de especialidad
    }

    return row;
};

module.exports = { mapToMasterRow };
