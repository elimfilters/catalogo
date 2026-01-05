async function findAndProcess(searchTerm, manufacturer, engineType) {
    // 1. Verificar Local (Mongo/Sheets)
    const cached = await Part.find({ cross_reference: searchTerm });
    if (cached.length > 0) return cached;

    // 2. Protocolo 1R1808 (HD vs LD)
    const analysis = await groqService.analyzeDuty(manufacturer, engineType);
    const scraper = (analysis.duty === 'HD') ? donaldson : fram;
    
    // 3. Obtener Especificaciones Técnicas
    const techOptions = await scraper.getThreeOptions(searchTerm);

    // 4. Mapeo y Creación de Trilogía
    const trilogy = techOptions.map(opt => {
        const prefix = skuBuilder.getPrefixByType(opt.type);
        const lastFour = opt.code.replace(/[^0-9]/g, '').slice(-4);
        
        return {
            sku: `${prefix}${lastFour}`,
            brand: "ELIMFILTERS® Engineering Core",
            tier: opt.tier,
            duty: analysis.duty,
            cross_reference: searchTerm,
            original_code: opt.code,
            technical_specs: { ...opt.specs } // Aquí se incluyen los 40+ campos
        };
    });

    // 5. Guardar en Google Sheets (MASTER_UNIFIED_V5)
    await Part.insertMany(trilogy);
    await sheetsWriter.saveWithFullSpecs(trilogy); 

    return trilogy;
}
