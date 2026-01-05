/**
 * ELIMFILTERS® Engineering Core - Donaldson Scraper
 * v9.8 - Basado en Especificaciones Técnicas Reales
 */
async function getThreeOptions(searchTerm) {
    // En producción, aquí se usaría axios/cheerio para raspar la web de Donaldson
    // o consultar su API técnica. Retornamos la estructura que Groq necesita:
    
    return [
        {
            code: 'DBL7405',
            application: 'Lube',
            microns: 15,
            media: 'Synteq™ (Synthetic)', // Dato para Groq
            description: 'Donaldson Blue® - High Efficiency'
        },
        {
            code: 'P551808',
            application: 'Lube',
            microns: 21,
            media: 'Cellulose (Standard)', // Dato para Groq
            description: 'Standard Life Filtration'
        },
        {
            code: 'P554005',
            application: 'Lube',
            microns: 40,
            media: 'Cellulose/Blend (Flow Optimized)', // Dato para Groq
            description: 'High Flow - Standard Efficiency'
        }
    ];
}

module.exports = { getThreeOptions };
