// ============================================================================
// SCRAPER BRIDGE - v5.0.0
// Routes filter requests to appropriate scraper (Donaldson HD / FRAM LD)
// ============================================================================

const { scrapeDonaldson } = require('./donaldson');
const { scrapeFram } = require('./fram');
const normalize = require('../utils/normalize');
const { detectFamilyHD, detectFamilyLD } = require('../utils/familyDetector');
const { extract4Digits } = require('../utils/digitExtractor');
const { noEquivalentFound } = require('../utils/messages');

// ============================================================================
// MAIN SCRAPER BRIDGE
// ============================================================================

async function scraperBridge(originalCode, duty) {
    const code = normalize.code(originalCode);

    console.log(`🌉 Scraper Bridge: ${code} | Duty: ${duty}`);

    // ---------------------------------------------------------
    // HD → DONALDSON
    // ---------------------------------------------------------
    if (duty === 'HD') {
        console.log(`📡 Calling Donaldson scraper...`);
        const donResult = await scrapeDonaldson(code);

        if (donResult.found) {
            const family = detectFamilyHD(donResult.family_hint);

            if (!family) {
                console.log(`⚠️  Family detection failed for HD`);
                return null;
            }

            const last4 = extract4Digits(donResult.code);

            return {
                found: true,
                source: 'DONALDSON',
                code: donResult.code,
                family,
                last4,
                cross: donResult.cross || [],
                applications: donResult.applications || [],
                attributes: donResult.attributes || {}
            };
        }

        // Fallback OEM-only
        console.log(`ℹ️  Donaldson not found, using OEM fallback`);
        const fallback4 = extract4Digits(code);

        return {
            found: false,
            source: 'OEM_ONLY',
            code: code,
            family: detectFamilyHD(null),
            last4: fallback4,
            cross: [],
            applications: [],
            attributes: {}
        };
    }

    // ---------------------------------------------------------
    // LD → FRAM
    // ---------------------------------------------------------
    if (duty === 'LD') {
        console.log(`📡 Calling FRAM scraper...`);
        const framResult = await scrapeFram(code);

        if (framResult.found) {
            const family = detectFamilyLD(framResult.family_hint);

            if (!family) {
                console.log(`⚠️  Family detection failed for LD`);
                return null;
            }

            const last4 = extract4Digits(framResult.code);

            return {
                found: true,
                source: 'FRAM',
                code: framResult.code,
                family,
                last4,
                cross: framResult.cross || [],
                applications: framResult.applications || [],
                attributes: framResult.attributes || {}
            };
        }

        // Fallback OEM-only
        console.log(`ℹ️  FRAM not found, using OEM fallback`);
        const fallback4 = extract4Digits(code);

        return {
            found: false,
            source: 'OEM_ONLY',
            code: code,
            family: detectFamilyLD(null),
            last4: fallback4,
            cross: [],
            applications: [],
            attributes: {}
        };
    }

    // Invalid duty
    console.log(`❌ Invalid duty: ${duty}`);
    return null;
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
    scraperBridge
};
