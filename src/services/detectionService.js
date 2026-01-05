/**
 * ELIMFILTERS® Engineering Core - Detection Service
 * v12.0 - Auditoría Duty HD/LD y Ruteo de Pestañas
 */

const HD_BRANDS = ['CATERPILLAR', 'CAT', 'JOHN DEERE', 'BOBCAT', 'KOMATSU', 'MACK', 'FREIGHTLINER'];
const LD_BRANDS = ['FORD', 'TOYOTA', 'BMW', 'MERCEDES BENZ', 'NISSAN', 'CHEVROLET'];

async function handleElimfiltersLogic(query, searchType, brand) {
    // 1. Verificación Inicial (Sheets & Mongo)
    const sheetTab = (searchType === 'VIN' || searchType === 'EQUIPMENT') 
        ? 'MASTER_KITS_V1' 
        : 'MASTER_UNIFIED_V5';
    
    const existing = await checkDatabase(query, sheetTab);
    if (existing) return formatPart2(existing); // Retorna al plugin

    // 2. Determinación de Duty
    const duty = HD_BRANDS.includes(brand.toUpperCase()) ? 'HD' : 'LD';

    // 3. Protocolo de Scraping y Calco
    let results = [];
    if (duty === 'HD') {
        results = await donaldsonScraper.getTrilogy(query); // Protocolo Donaldson
    } else {
        results = await framScraper.getTrilogy(query); // Protocolo FRAM
    }

    // 4. Registro y Mapeo (Regla 4 dígitos + Prefijo)
    for (const item of results) {
        await sheetsWriter.writeToMaster(item, sheetTab); // Escribe en la pestaña correcta
    }
    
    return formatPart2(results);
}
