// ============================================================================
// DUTY DETECTOR — ELIMFILTERS
// Determina si un filtro es:
// - HD (Heavy Duty)
// - LD (Light Duty)
// Usando FAMILY + OEM + Engine + Scraper + Prefix
// ============================================================================

const normalize = (t) =>
    !t ? "" : t.toString().trim().toUpperCase().replace(/\s+/g, " ");

// ============================================================================
// DETERMINACIÓN POR FAMILIA (REGLA DURA)
// ============================================================================

const FAMILY_FORCE_HD = [
    "FUEL SEPARATOR",
    "AIR DRYER",
    "HIDRAULIC",
    "COOLANT",
    "CARCAZA AIR FILTER",
    "TURBINE SERIES",
    "CENTRIFUGAL"
];

const FAMILY_HD_LD = [
    "OIL",
    "FUEL",
    "AIRE",
    "CABIN",
    "MARINE"
];

// ============================================================================
// PALABRAS CLAVE HD
// ============================================================================

const KEYWORDS_HD = [
    "DIESEL",
    "HEAVY DUTY",
    "HD",
    "INDUSTRIAL",
    "TRACTOR",
    "CONSTRUCTION",
    "EXCAVATOR",
    "MINING",
    "GENERATOR",
    "TRUCK",
    "CUMMINS",
    "DETROIT",
    "VOLVO",
    "CAT",
    "MACK",
    "PACCAR",
    "KENWORTH",
    "FREIGHTLINER",
    "ISX",
    "DD15",
    "DD13",
    "MX-13",
    "C6.4",
    "C7",
    "C9",
    "C13",
    "C15",
    "C18"
];

// ============================================================================
// PALABRAS CLAVE LD
// ============================================================================

const KEYWORDS_LD = [
    "GASOLINE",
    "PETROL",
    "LIGHT DUTY",
    "LD",
    "PICKUP",
    "SUV",
    "CAR",
    "SMALL ENGINE",
    "4CYL",
    "V6",
    "V8",
    "2ZR-FE",
    "1TR-FE",
    "2TR-FE"
];

// ============================================================================
// DETECTOR PRINCIPAL
// ============================================================================

function detectDuty(scraperData = {}, detectedFamily = null) {
    const fields = [
        scraperData.product_type,
        scraperData.type,
        scraperData.attributes?.type,
        scraperData.attributes?.product_type,
        scraperData.attributes?.category,
        scraperData.attributes?.application,
        scraperData.engine,
        scraperData.title,
        scraperData.description,
        scraperData.oem_code
    ];

    const haystack = normalize(fields.filter(Boolean).join(" "));

    // ============================================================
    // 1) PRIORIDAD MÁXIMA — REGLA POR FAMILIA
    // ============================================================

    if (detectedFamily) {
        if (FAMILY_FORCE_HD.includes(detectedFamily)) {
            return "HD";
        }

        if (detectedFamily === "MARINE") {
            // MARINE tiene LD y HD según tipo de motor
            if (haystack.includes("DIESEL")) return "HD";
            if (haystack.includes("GAS") || haystack.includes("PETROL")) return "LD";

            // Si no se puede detectar, usamos prefix rule fallback
            return "HD"; // mayoría de embarcaciones medianas/grandes
        }

        if (FAMILY_HD_LD.includes(detectedFamily)) {
            // Pasamos a análisis profundo
        }
    }

    // ============================================================
    // 2) ANÁLISIS POR PALABRAS CLAVE HD
    // ============================================================

    for (const k of KEYWORDS_HD) {
        if (haystack.includes(k)) return "HD";
    }

    // ============================================================
    // 3) ANÁLISIS POR PALABRAS CLAVE LD
    // ============================================================

    for (const k of KEYWORDS_LD) {
        if (haystack.includes(k)) return "LD";
    }

    // ============================================================
    // 4) ANÁLISIS POR MOTOR (MUY PRECISO)
    // ============================================================

    if (/ISX|MX-13|DD15|DD13|C6\.4|C7|C9|C13|C15|C18/i.test(haystack)) return "HD";
    if (/2ZR-FE|1TR-FE|2TR-FE|VQ40|QR25/i.test(haystack)) return "LD";

    // ============================================================
    // 5) ANÁLISIS POR OEM
    // ============================================================

    if (/P55|LF|FF|BF|AF|PA/i.test(haystack)) return "HD"; // Donaldson HD
    if (/PH|CA|CF|CS|WIX|MO/i.test(haystack)) return "LD"; // FRAM/WIX LD

    // ============================================================
    // 6) DEFAULT — SI NO SE PUEDE DETERMINAR
    // ============================================================

    return "HD"; 
    // Los equipos HD dominan 80% del universo OEM
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
    detectDuty
};
