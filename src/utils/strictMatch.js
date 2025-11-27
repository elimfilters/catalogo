// ===========================================
// STRICT MATCH — REGLA A43
// ===========================================

function strictMatch(input, scraped) {
    if (!input || !scraped) return false;

    const i = input.replace(/[^A-Z0-9]/gi, "");
    const s = scraped.replace(/[^A-Z0-9]/gi, "");

    return i === s;
}

module.exports = { strictMatch };
