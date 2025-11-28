// ============================================================================
// DONALDSON SCRAPER - Simplified Version
// Scrapes Donaldson website for HD filter data
// ============================================================================

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrape Donaldson for filter information
 * @param {string} code - Filter code to search
 * @returns {object} - Scraper result
 */
async function scrapeDonaldson(code) {
    try {
        console.log(`📡 Donaldson scraper: ${code}`);

        // Donaldson search URL
        const url = `https://www.donaldson.com/en-us/industrial/search/?q=${encodeURIComponent(code)}`;

        // Make request
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // Parse HTML
        const $ = cheerio.load(response.data);

        // Try to find filter information
        // This is a simplified version - adjust selectors based on actual Donaldson site structure
        const found = $('body').text().toLowerCase().includes(code.toLowerCase());

        if (found) {
            return {
                found: true,
                code: code,
                family_hint: 'OIL', // Default - could be improved with actual parsing
                cross: [],
                applications: [],
                attributes: {}
            };
        }

        return {
            found: false,
            code: code,
            family_hint: null,
            cross: [],
            applications: [],
            attributes: {}
        };

    } catch (error) {
        console.error(`❌ Donaldson scraper error: ${error.message}`);
        
        // Return not found on error
        return {
            found: false,
            code: code,
            family_hint: null,
            cross: [],
            applications: [],
            attributes: {}
        };
    }
}

module.exports = {
    scrapeDonaldson
};

