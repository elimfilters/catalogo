/**
 * ELIMFILTERS® Engineering Core - HD Scraper
 * Basado estrictamente en especificaciones físicas.
 */
async function getThreeOptions(searchTerm) {
    // Simulación de extracción de datos técnicos reales
    // En producción, aquí se usa axios/cheerio para leer Donaldson
    return [
        {
            code: 'DBL7405', 
            application: 'Lube', 
            microns: 15, 
            media: 'Synthetic Synteq™',
            tier: 'ELITE',
            claim: 'Máxima protección sintética para servicio extremo.'
        },
        {
            code: 'P551808', 
            application: 'Lube', 
            microns: 21, 
            media: 'Enhanced Cellulose',
            tier: 'PERFORMANCE',
            claim: 'Eficiencia balanceada para intervalos de servicio extendidos.'
        },
        {
            code: 'P554005', 
            application: 'Lube', 
            microns: 40, 
            media: 'Standard Cellulose',
            tier: 'STANDARD',
            claim: 'Filtración confiable para motores de generación anterior.'
        }
    ];
}

module.exports = { getThreeOptions };
