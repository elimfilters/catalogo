/**
 * MAPEO UNIVERSAL ELIMFILTERS® - 56 COLUMNAS
 */
export function mapToMasterRow(aiAnalysis, query) {
    const row = new Array(56).fill("");

    // --- IDENTIFICACIÓN (0-5) ---
    row[0] = new Date().toLocaleDateString();
    row[1] = query;
    row[2] = aiAnalysis.tipo_filtro;
    row[3] = aiAnalysis.prefijo;
    row[4] = aiAnalysis.duty || "HD";
    row[5] = aiAnalysis.motor_aplicacion || "";

    // --- TIER STANDARD (6-15) ---
    if (aiAnalysis.skus?.STANDARD) {
        const std = aiAnalysis.skus.STANDARD;
        row[6] = std.sku;
        row[7] = std.pivote;
        row[8] = "STANDARD";
        row[9] = std.media_type;
        row[10] = std.descripcion;
    }

    // --- TIER PERFORMANCE (16-25) ---
    if (aiAnalysis.skus?.PERFORMANCE || aiAnalysis.tier === "PERFORMANCE") {
        const perf = aiAnalysis.skus?.PERFORMANCE || aiAnalysis;
        row[16] = perf.sku;
        row[17] = perf.pivote;
        row[18] = "PERFORMANCE";
        row[19] = perf.media_type;
        row[20] = perf.descripcion;
    }

    // --- TIER ELITE (26-35) ---
    if (aiAnalysis.skus?.ELITE) {
        const elite = aiAnalysis.skus.ELITE;
        row[26] = elite.sku;
        row[27] = elite.pivote;
        row[28] = "ELITE";
        row[29] = elite.media_type;
        row[30] = elite.descripcion;
    }

    // --- ESPECIFICACIONES E ISO (36-45) ---
    row[36] = aiAnalysis.specs?.height || "";
    row[37] = aiAnalysis.specs?.od || "";
    row[38] = aiAnalysis.specs?.thread || "";
    row[39] = aiAnalysis.specs?.micron || "";
    // COLUMNA ISO CRÍTICA
    row[40] = aiAnalysis.specs?.iso_norm || "ISO 4548-12 / ISO 5011 COMPLIANT"; 

    // --- HOMOLOGACIÓN (50-55) ---
    if (aiAnalysis.homologation) {
        row[50] = "HOMOLOGATED";
        row[51] = aiAnalysis.homologation.donaldson_original;
        row[52] = aiAnalysis.homologation.elimfilters_equivalent;
        row[53] = aiAnalysis.homologation.performance_match;
    }

    return row;
}
