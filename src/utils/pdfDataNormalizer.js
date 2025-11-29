// ============================================================================
// PDF DATA NORMALIZER - German Quality ELIMFILTERS
// Normaliza datos del API para generación de fichas técnicas PDF
// ============================================================================

const { psiToBar, barToPsi, mmToInches, inchesToMm } = require('./unitConverter');

/**
 * Normalize hydrostatic burst pressure to PSI
 * @param {object} data - API response data
 * @returns {object} - Normalized burst data
 */
function normalizeBurstPressure(data) {
    let psi = data.hydrostatic_burst_psi || data.rafaga_colapso_psi || '';
    let bar = data.hydrostatic_burst_bar || data.rafaga_colapso_bar || '';
    
    // Si tenemos Bar pero no PSI, convertir
    if (bar && !psi) {
        psi = barToPsi(bar);
    }
    
    // Si tenemos PSI pero no Bar, convertir
    if (psi && !bar) {
        bar = psiToBar(psi);
    }
    
    return {
        rafaga_colapso_psi: psi,
        rafaga_colapso_bar: bar,
        rafaga_colapso_display: psi ? `${psi} PSI (${bar} Bar)` : 'N/A'
    };
}

/**
 * Normalize outer diameter to both units
 * @param {object} data - API response data
 * @returns {object} - Normalized diameter data
 */
function normalizeOuterDiameter(data) {
    let mm = data.outer_diameter_mm || data.diametro_exterior_mm || '';
    let inches = data.outer_diameter_inches || data.diametro_exterior_pulgadas || '';
    
    // Si tenemos pulgadas pero no mm, convertir
    if (inches && !mm) {
        mm = inchesToMm(inches);
    }
    
    // Si tenemos mm pero no pulgadas, convertir
    if (mm && !inches) {
        inches = mmToInches(mm);
    }
    
    return {
        diametro_exterior_mm: mm,
        diametro_exterior_pulgadas: inches,
        diametro_exterior_display: mm && inches ? `${inches}" (${mm} mm)` : 'N/A'
    };
}

/**
 * Normalize all dimensions to dual units
 * @param {object} data - API response data
 * @returns {object} - All normalized dimensions
 */
function normalizeAllDimensions(data) {
    const dimensions = {};
    
    // Height / Length
    const height_mm = data.height_mm || data.longitud_total_mm || '';
    const height_inches = data.height_inches || data.longitud_total_pulgadas || mmToInches(height_mm);
    dimensions.longitud_total_mm = height_mm;
    dimensions.longitud_total_pulgadas = height_inches;
    dimensions.longitud_total_display = height_mm && height_inches ? `${height_inches}" (${height_mm} mm)` : 'N/A';
    
    // Outer Diameter
    const od = normalizeOuterDiameter(data);
    Object.assign(dimensions, od);
    
    // Thread Size
    dimensions.tamaño_rosca = data.thread_size || data.tamaño_rosca || '';
    
    // Gasket OD
    const gasket_od_mm = data.gasket_od_mm || data.empaque_od_mm || '';
    const gasket_od_inches = data.gasket_od_inches || data.empaque_od_pulgadas || mmToInches(gasket_od_mm);
    dimensions.empaque_od_mm = gasket_od_mm;
    dimensions.empaque_od_pulgadas = gasket_od_inches;
    dimensions.empaque_od_display = gasket_od_mm && gasket_od_inches ? `${gasket_od_inches}" (${gasket_od_mm} mm)` : 'N/A';
    
    // Gasket ID
    const gasket_id_mm = data.gasket_id_mm || data.empaque_id_mm || '';
    const gasket_id_inches = data.gasket_id_inches || data.empaque_id_pulgadas || mmToInches(gasket_id_mm);
    dimensions.empaque_id_mm = gasket_id_mm;
    dimensions.empaque_id_pulgadas = gasket_id_inches;
    dimensions.empaque_id_display = gasket_id_mm && gasket_id_inches ? `${gasket_id_inches}" (${gasket_id_mm} mm)` : 'N/A';
    
    return dimensions;
}

/**
 * Normalize Beta Ratio to standard format
 * @param {object} data - API response data
 * @returns {object} - Normalized beta ratio
 */
function normalizeBetaRatio(data) {
    const beta200 = data.beta_200 || data.eficiencia_beta_ratio || '';
    const micronRating = data.micron_rating || data.clasificacion_micron || '';
    
    let betaFormatted = '';
    let betaDisplay = '';
    
    if (beta200) {
        // Formato estándar: β20(c)=200
        const micron = micronRating || '20';
        betaFormatted = `β${micron}(c)=${beta200}`;
        betaDisplay = `β${micron}(c) = ${beta200}`;
    } else if (micronRating) {
        // Si solo tenemos micron rating sin beta
        betaDisplay = `${micronRating} μm`;
        betaFormatted = betaDisplay;
    }
    
    return {
        eficiencia_beta_ratio: betaFormatted,
        eficiencia_beta_display: betaDisplay || 'N/A',
        micron_rating: micronRating
    };
}

/**
 * Normalize OEM codes to array format
 * @param {object} data - API response data
 * @returns {array} - Array of OEM codes
 */
function normalizeOEMCodes(data) {
    const oemCodes = data.oem_codes || data.oem_codes_adicionales || [];
    
    // Si es string, convertir a array
    if (typeof oemCodes === 'string') {
        return oemCodes.split(',').map(code => code.trim()).filter(code => code);
    }
    
    // Si ya es array, retornar
    if (Array.isArray(oemCodes)) {
        return oemCodes;
    }
    
    return [];
}

/**
 * Normalize cross-reference codes to array format
 * @param {object} data - API response data
 * @returns {array} - Array of cross-reference codes
 */
function normalizeCrossReference(data) {
    const crossRef = data.cross_reference || data.referencias_cruzadas || [];
    
    // Si es string, convertir a array
    if (typeof crossRef === 'string') {
        return crossRef.split(',').map(code => code.trim()).filter(code => code);
    }
    
    // Si ya es array, retornar
    if (Array.isArray(crossRef)) {
        return crossRef;
    }
    
    return [];
}

/**
 * Normalize equipment applications to array format
 * @param {object} data - API response data
 * @returns {array} - Array of equipment applications
 */
function normalizeEquipmentApplications(data) {
    const equipment = data.equipment_applications || data.aplicaciones_equipo || [];
    
    // Si es string, convertir a array
    if (typeof equipment === 'string') {
        return equipment.split(',').map(app => app.trim()).filter(app => app);
    }
    
    // Si ya es array, retornar
    if (Array.isArray(equipment)) {
        return equipment;
    }
    
    return [];
}

/**
 * Get static German Quality ELIMFILTERS marketing text
 * @returns {string} - Fixed marketing text
 */
function getMarketingText() {
    return `German Quality ELIMFILTERS representa la fusión perfecta entre la legendaria precisión de la ingeniería alemana y la innovación de la tecnología elaborada con IA. Cada filtro es el resultado de décadas de experiencia en manufactura avanzada, combinada con sistemas de control de calidad automatizados que garantizan consistencia del 99.97% en cada unidad producida.

Nuestros medios filtrantes no solo cumplen con las especificaciones originales de los fabricantes de equipo - las superan mediante innovación continua y rigurosos procesos de certificación internacional. Con tecnologías propietarias como ELIMTEK™, MACROCORE™ y MICROKAPPA™, ofrecemos soluciones de filtración que extienden la vida útil de su equipamiento, reducen costos operativos y minimizan el impacto ambiental.

Respaldados por certificaciones ISO 9001, ISO/TS 16949 y cumplimiento de estándares internacionales como ISO 5011, ISO 4548-12, SAE J806 y SAE J1858, German Quality ELIMFILTERS es la elección inteligente para operadores que exigen lo mejor en protección de motores y sistemas críticos.`;
}

/**
 * Normalize complete API data for PDF generation
 * @param {object} apiData - Complete API response
 * @returns {object} - Normalized data ready for PDF
 */
function normalizeForPDF(apiData) {
    return {
        // Identificación básica
        sku: apiData.sku || '',
        query_original: apiData.query_normalized || apiData.codigo_buscado || '',
        duty: apiData.duty || '',
        type: apiData.type || apiData.familia || '',
        filter_classification: apiData.filter_classification || apiData.clasificacion_filtro || '',
        
        // Descripción
        description: apiData.description || '',
        media_type: apiData.media_type || apiData.tipo_medio || '',
        seal_type: apiData.seal_type || apiData.tipo_sello || '',
        
        // Dimensiones normalizadas (dual unit)
        ...normalizeAllDimensions(apiData),
        
        // Rendimiento normalizado
        ...normalizeBurstPressure(apiData),
        ...normalizeBetaRatio(apiData),
        
        // Válvula bypass
        bypass_valve_psi: apiData.bypass_valve_psi || apiData.valvula_bypass_psi || '',
        bypass_valve_bar: apiData.bypass_valve_bar || apiData.valvula_bypass_bar || '',
        has_bypass_valve: apiData.has_bypass_valve || false,
        
        // Flujos
        rated_flow_gpm: apiData.rated_flow_gpm || apiData.flujo_nominal_gpm || '',
        rated_flow_lpm: apiData.rated_flow_lpm || apiData.flujo_nominal_lpm || '',
        
        // Arrays normalizados
        oem_codes_adicionales: normalizeOEMCodes(apiData),
        referencias_cruzadas: normalizeCrossReference(apiData),
        aplicaciones_equipo: normalizeEquipmentApplications(apiData),
        
        // Estándares
        iso_test_method: apiData.iso_test_method || apiData.metodo_prueba_iso || '',
        certification_standards: apiData.certification_standards || apiData.estandares_certificacion || '',
        manufacturing_standards: apiData.manufacturing_standards || apiData.estandares_manufactura || '',
        
        // Intervalos de servicio
        service_life_hours: apiData.service_life_hours || apiData.vida_util_horas || '',
        change_interval_km: apiData.change_interval_km || apiData.intervalo_cambio_km || '',
        
        // Estrategia de producto
        upgrade_product_media: apiData.upgrade_product_media || apiData.producto_upgrade || '',
        related_service_filters: apiData.related_service_filters || apiData.filtros_servicio_relacionados || '',
        service_kit_description: apiData.service_kit_description || apiData.descripcion_kit_servicio || '',
        
        // Texto de marketing estático (MANDATORIO - NO MODIFICAR)
        texto_ia_genuino: getMarketingText(),
        
        // Brand
        brand: apiData.brand || 'German Quality ELIMFILTERS - Tecnología elaborada con IA'
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    normalizeBurstPressure,
    normalizeOuterDiameter,
    normalizeAllDimensions,
    normalizeBetaRatio,
    normalizeOEMCodes,
    normalizeCrossReference,
    normalizeEquipmentApplications,
    getMarketingText,
    normalizeForPDF
};
