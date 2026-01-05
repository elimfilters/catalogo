async function findAndProcess(searchTerm, manufacturer) {
    // 1. Verificar en Google Sheets y MongoDB primero
    const existing = await checkLocalDatabases(searchTerm);
    if (existing) return existing;

    // 2. Si no existe, activar Protocolo Externo con Groq
    const analysis = await groqService.analyzeDuty(manufacturer); // CAT -> HD
    const scraper = (analysis.duty === 'HD') ? donaldson : fram;
    
    // 3. Obtener los 3 resultados técnicos de Donaldson (DBL, P55...)
    const techOptions = await scraper.getThreeOptions(searchTerm);

    // 4. Crear la Trilogía ElimFilters
    return techOptions.map(opt => ({
        sku: skuBuilder.buildDynamicSKU(opt.type, opt.code, opt.microns),
        tier: opt.tier, // ELITE, PERFORMANCE, STANDARD
        microns: opt.microns,
        media: opt.media,
        performance_claim: opt.claim
    }));
}
