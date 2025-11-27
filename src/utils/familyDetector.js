// ===============================================
// DETECTOR DE FAMILIA ESTÁNDAR ELIMFILTERS
// ===============================================

function detectFamily(scrapedFamily) {
    if (!scrapedFamily) return null;

    const f = scrapedFamily.toUpperCase();

    if (f.includes("OIL")) return "OIL";
    if (f.includes("FUEL")) return "FUEL";
    if (f.includes("AIR")) return "AIRE";
    if (f.includes("CABIN")) return "CABIN";
    if (f.includes("HYD")) return "HIDRAULIC";
    if (f.includes("COOLANT")) return "COOLANT";
    if (f.includes("SEPARATOR")) return "FUEL SEPARATOR";
    if (f.includes("DRYER")) return "AIR DRYER";
    if (f.includes("TURBINE")) return "TURBINE SERIES";
    if (f.includes("MARINE")) return "MARINE";

    return null;
}

module.exports = { detectFamily };
