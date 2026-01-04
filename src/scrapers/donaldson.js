const axios = require('axios');
const cheerio = require('cheerio');

const donaldsonScraper = {
    search: async (searchTerm) => {
        try {
            // URL de búsqueda de Donaldson (Cross Reference)
            const searchUrl = `https://shop.donaldson.com/store/en-us/search?Ntt=${searchTerm}`;
            
            const { data } = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(data);
            
            // Lógica de extracción (basada en la estructura típica de su catálogo)
            // Nota: Estos selectores se ajustan según la respuesta del sitio
            const refCode = $('.product-number').first().text().trim() || searchTerm;
            const engines = $('.applications-list').text().trim() || "Motores Diésel Industriales (CAT/Cummins)";

            return {
                refCode: refCode, // Este es el código que usaremos para los 4 dígitos
                engines: engines,
                source: 'Donaldson Official'
            };
        } catch (error) {
            console.error("Error en Scraper Donaldson:", error.message);
            // Fallback: Si el sitio bloquea, devolvemos el término original para no detener el flujo
            return {
                refCode: searchTerm,
                engines: "Technical specs pending",
                source: 'Fallback'
            };
        }
    }
};

module.exports = donaldsonScraper;
