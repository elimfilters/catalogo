// ===============================================
// MENSAJES MULTILINGUE — MODO ESTRICTO PROFESIONAL
// ===============================================

const dict = {
    UNKNOWN_EQUIVALENT: {
        en: (q) => `The code ${q} does not have a verifiable equivalent. Please verify your OEM or provide more information.`,
        es: (q) => `El código ${q} no posee equivalente verificable. Por favor revise el OEM o proporcione más información.`
    },
    INVALID_CODE: {
        en: (q) => `The code ${q} is invalid.`,
        es: (q) => `El código ${q} es inválido.`
    }
};

function t(key, lang = "en", q = "") {
    return dict[key]?.[lang]?.(q) || dict[key].en(q);
}

function noEquivalentFound(query, lang = "en") {
    return {
        status: "UNKNOWN",
        query_norm: query,
        sku: null,
        equivalent: false,
        message: t("UNKNOWN_EQUIVALENT", lang, query)
    };
}

module.exports = { t, noEquivalentFound };
