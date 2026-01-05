/**
 * ELIMFILTERS® Engineering Core - LD Scraper
 */
async function getThreeOptions(searchTerm) {
    // Extracción de datos para motores ligeros
    return [
        {
            code: 'XG8A', 
            application: 'Lube', 
            microns: 20, 
            media: 'Synthetic Blend',
            tier: 'ELITE'
        },
        {
            code: 'PH8A', 
            application: 'Lube', 
            microns: 30, 
            media: 'Cellulose',
            tier: 'STANDARD'
        }
    ];
}

module.exports = { getThreeOptions };
