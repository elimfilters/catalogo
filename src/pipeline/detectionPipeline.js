// =====================================================================
// A80 — DETECTION PIPELINE FINAL ELIMFILTERS™
// Integra: normalize → detect family → scraper HD/LD → OEM fallback
// → extract4 → SKU generator → media assignment → final response
// =====================================================================

const normalize = require("../utils/normalize");
const { extract4 } = require("../utils/extractDigits");
const { detectFamily } = require("../services/familyDetector");
const { detectDuty } = require("../services/dutyDetector");

const { scraperDonaldson } = require("../services/scrapers/donaldson");
const { scraperFram } = require("../services/scrapers/fram");

const { generateSKU } = require("../sku/generator");
const { assignMedia } = require("../utils/mediaAssignment");
const { noEquivalentFound } = require("../utils/messages");


// ================================================================
// MOTOR PRINCIPAL DE DETECCIÓN
// ================================================================
async function detectionPipeline(rawCode, lang = "en") {
    
    // 1) Normalizar Código
    const code = normalize.code(rawCode);
    if (!code) return noEquivalentFound(rawCode, lang);


    // 2) Detectar Familia
    const family = detectFamily(code);
    if (!family) return noEquivalentFound(code, lang);


    // 3) Detectar DUTY (HD o LD)
    const duty = detectDuty(code, family);


    // ============================================================
    // 4) SCRAPER HD (DONALDSON) o LD (FRAM)
    // ============================================================
    let scraperResult = null;

    if (duty === "HD") {
        scraperResult = await scraperDonaldson(code);
    } else {
        scraperResult = await scraperFram(code);
    }

    // Si scraper no encuentra equivalente → Fallback OEM
    let oemForDigits = null;

    if (scraperResult && scraperResult.found) {
        oemForDigits = scraperResult.oem_normalized;
    } else {
        // Fallback OEM → tomar últimos 4 dígitos del code ingresado
        oemForDigits = code;
    }


    // ============================================================
    // 5) Reglas inviolables: EXTRACT LAST 4 DIGITS
    // ============================================================
    const last4 = extract4(oemForDigits);
    if (!last4) return noEquivalentFound(code, lang);


    // ============================================================
    // 6) GENERAR SKU OFICIAL
    // ============================================================
    const sku = generateSKU(family, duty, oemForDigits);

    if (!sku) return noEquivalentFound(code, lang);


    // ============================================================
    // 7) ASIGNAR MEDIA FILTRANTE ELIMFILTERS™
    // ============================================================
    const media = assignMedia(family, duty);


    // ============================================================
    // 8) RESPONSE FINAL PROFESIONAL
    // ============================================================
    return {
        status: "OK",
        query: rawCode,
        normalized_query: code,
        family,
        duty,
        sku,
        digits: last4,
        media,
        source: scraperResult?.source || "OEM-FALLBACK",
        oem_equivalent: scraperResult?.oem || null,
        cross_reference: scraperResult?.cross || [],
        applications: scraperResult?.applications || [],
        specs: scraperResult?.specs || {}
    };
}

module.exports = {
    detectionPipeline
};
