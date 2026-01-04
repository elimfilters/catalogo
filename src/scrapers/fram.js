const axios = require('axios');
const cheerio = require('cheerio');

const framScraper = {
    search: async (searchTerm) => {
        try {
            const searchUrl = `https://www.fram.com/search-results?q=${searchTerm}`;
            
            const { data } = await axios.get(searchUrl);
            const $ = cheerio.load(data);

            const refCode = $('.part-number').first().text().trim() || searchTerm;
            const engines = $('.fits-vehicles').text().trim() || "Vehículos Livianos (Toyota/Ford/Nissan)";

            return {
                refCode: refCode,
                engines: engines,
                source: 'FRAM Official'
            };
        } catch (error) {
            console.error("Error en Scraper FRAM:", error.message);
            return {
                refCode: searchTerm,
                engines: "Light Duty Vehicle Specs",
                source: 'Fallback'
            };
        }
    }
};

module.exports = framScraper;
