// ========================================================
// DETECTOR HD/LD POR OEM (OIL–AIR–FUEL–CABIN…)
// ========================================================

function detectOEMType(oem) {
    const c = (oem || "").toUpperCase();

    if (c.startsWith("P")) return "HD";
    if (c.startsWith("1R")) return "HD";
    if (c.startsWith("CAT")) return "HD";
    if (c.startsWith("LF")) return "HD";

    if (["PH", "CA", "CH", "CF"].some(k => c.startsWith(k))) return "LD";

    return "LD";
}

module.exports = { detectOEMType };
