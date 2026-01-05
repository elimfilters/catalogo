// DetectionService.js - v11.0.7
// ... (manten tus importaciones igual)

async processSearch(searchTerm) {
    try {
        const existingData = await this.searchInBothSources(searchTerm);
        if (existingData) return { success: true, source: 'cached', data: existingData };
        
        const dutyAnalysis = await groqService.detectDuty(searchTerm);
        const scraperResult = (dutyAnalysis.duty === 'HD') 
            ? await donaldsonScraper.search(searchTerm) 
            : await framScraper.search(searchTerm);
        
        if (!scraperResult || !scraperResult.mainProduct) throw new Error('No results found');

        // COMBINAMOS PRODUCTO PRINCIPAL + ALTERNATIVOS PARA EL ESPEJO
        const allFoundProducts = [scraperResult.mainProduct, ...scraperResult.alternatives];

        const skuData = allFoundProducts.map(product => {
            const prefix = PREFIX_MAP[product.systemKey] || 'EL8';
            // Regla de los 4 dígitos basada en el código REAL de Donaldson
            const last4Digits = product.code.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
            
            return {
                sku: `${prefix}${last4Digits}`,
                tier: product.tier,
                tier_description: TIER_DESCRIPTIONS[product.tier] || '',
                crossRefCode: product.code,
                description: product.description || `${product.tier} Filter`,
                specifications: scraperResult.specifications, // Datos técnicos reales
                // Consolidamos Cross References (OEM/Competencia)
                oem_codes: scraperResult.crossReferences.map(r => `${r.brand} ${r.code}`).join(', '),
                // Consolidamos Aplicaciones de Equipo
                equipment: scraperResult.equipment.map(e => `${e.equipment} (${e.engine})`).join(' | '),
                source: 'Donaldson Master Scraper'
            };
        });

        // Guardado Masivo
        await Promise.all([
            mongoService.saveFilters(searchTerm, skuData, dutyAnalysis, "Donaldson Master"),
            this.writeToSheets(searchTerm, skuData, dutyAnalysis, "Donaldson Master")
        ]);

        return { success: true, source: 'generated', data: skuData };
        
    } catch (error) {
        console.error(`❌ Error en búsqueda:`, error.message);
        return { success: false, error: error.message };
    }
}
