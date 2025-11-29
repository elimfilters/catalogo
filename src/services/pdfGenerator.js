// ============================================================================
// PDF GENERATOR - German Quality ELIMFILTERS
// Genera fichas técnicas profesionales en PDF
// ============================================================================

const PDFDocument = require('pdfkit');
const { normalizeForPDF } = require('../utils/pdfDataNormalizer');

/**
 * Generate professional technical datasheet PDF
 * @param {object} apiData - Complete API response data
 * @param {object} res - Express response object (for streaming)
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function generateTechnicalDatasheet(apiData, res = null) {
    // Normalize data first
    const data = normalizeForPDF(apiData);
    
    // Create PDF document
    const doc = new PDFDocument({
        size: 'LETTER',
        margins: {
            top: 40,
            bottom: 40,
            left: 40,
            right: 40
        }
    });
    
    // If response object provided, pipe to response
    if (res) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ELIMFILTERS_${data.sku}_Ficha_Tecnica.pdf"`);
        doc.pipe(res);
    }
    
    // =========================================================================
    // PÁGINA 1: MARCA, VALOR Y RESUMEN EJECUTIVO
    // =========================================================================
    
    // Corporate Header Banner
    doc.rect(0, 0, 612, 80).fill('#003366');
    
    // Logo and Brand (White text on blue background)
    doc.fontSize(24)
       .fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .text('ELIMFILTERS®', 40, 25);
    
    doc.fontSize(12)
       .fillColor('#FFD700') // Gold color for tagline
       .text('German Quality - Tecnología elaborada con IA', 40, 55);
    
    // SKU Badge (top right)
    doc.fontSize(10)
       .fillColor('#FFFFFF')
       .text(`SKU: ${data.sku}`, 450, 30);
    
    // Product Title - Identification
    doc.fillColor('#000000')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text(`${data.sku} - ${data.description.split('.')[0]}`, 40, 100, {
           width: 532,
           align: 'left'
       });
    
    // Product Image Placeholder
    let yPos = 135;
    doc.rect(40, yPos, 200, 200)
       .stroke('#CCCCCC');
    
    doc.fontSize(8)
       .fillColor('#999999')
       .text('Imagen del Producto', 90, yPos + 95, {
           width: 100,
           align: 'center'
       });
    
    // Propuesta de Valor - IA Genuina (Right column)
    doc.fontSize(11)
       .fillColor('#003366')
       .font('Helvetica-Bold')
       .text('GERMAN QUALITY ELIMFILTERS', 260, yPos);
    
    yPos += 20;
    doc.fontSize(9)
       .fillColor('#333333')
       .font('Helvetica')
       .text(data.texto_ia_genuino, 260, yPos, {
           width: 292,
           align: 'justify',
           lineGap: 2
       });
    
    // Datos Clave Rápidos - Executive Summary Row
    yPos = 360;
    
    // Background box for key metrics
    doc.rect(40, yPos, 532, 80)
       .fill('#F0F4F8');
    
    yPos += 15;
    
    doc.fontSize(12)
       .fillColor('#003366')
       .font('Helvetica-Bold')
       .text('RESUMEN EJECUTIVO', 50, yPos);
    
    yPos += 25;
    
    // Key metrics in columns
    const metrics = getKeyMetrics(data);
    const colWidth = 130;
    let xPos = 50;
    
    metrics.forEach((metric, index) => {
        if (index > 0 && index % 4 === 0) {
            yPos += 25;
            xPos = 50;
        }
        
        doc.fontSize(8)
           .fillColor('#666666')
           .font('Helvetica')
           .text(metric.label, xPos, yPos);
        
        doc.fontSize(10)
           .fillColor('#000000')
           .font('Helvetica-Bold')
           .text(metric.value, xPos, yPos + 12, {
               width: colWidth - 10
           });
        
        xPos += colWidth;
    });
    
    // Separator line
    yPos = 455;
    doc.moveTo(40, yPos)
       .lineTo(572, yPos)
       .stroke('#CCCCCC');
    
    // Section: Clasificación y Especificaciones Generales
    yPos += 20;
    doc.fontSize(14)
       .fillColor('#003366')
       .font('Helvetica-Bold')
       .text('CLASIFICACIÓN Y ESPECIFICACIONES', 40, yPos);
    
    yPos += 25;
    doc.fontSize(10)
       .fillColor('#000000')
       .font('Helvetica');
    
    const classification = [
        { label: 'Tipo de Filtro:', value: `${data.type} - ${data.filter_classification}` },
        { label: 'Categoría:', value: data.duty === 'HD' ? 'Heavy Duty (Servicio Pesado)' : 'Light Duty (Servicio Ligero)' },
        { label: 'Medio Filtrante:', value: data.media_type },
        { label: 'Línea de Producto:', value: data.product_line || data.media_type.split('™')[0] + '™' }
    ];
    
    classification.forEach(item => {
        doc.font('Helvetica-Bold').text(item.label, 40, yPos, { continued: true, width: 180 });
        doc.font('Helvetica').text(` ${item.value}`, { width: 352 });
        yPos += 18;
    });
    
    // Section: Dimensiones Físicas y Montaje
    yPos += 10;
    doc.fontSize(14)
       .fillColor('#003366')
       .font('Helvetica-Bold')
       .text('DIMENSIONES FÍSICAS Y MONTAJE', 40, yPos);
    
    yPos += 25;
    doc.fontSize(10)
       .fillColor('#000000');
    
    const dimensions = [
        { label: 'Longitud Total:', value: data.longitud_total_display },
        { label: 'Diámetro Exterior:', value: data.diametro_exterior_display },
        { label: 'Tamaño de Rosca:', value: data.tamaño_rosca || 'N/A' },
        { label: 'Tipo de Sello:', value: data.seal_type },
        { label: 'Empaque OD:', value: data.empaque_od_display },
        { label: 'Empaque ID:', value: data.empaque_id_display }
    ];
    
    dimensions.forEach(item => {
        doc.font('Helvetica-Bold').text(item.label, 40, yPos, { continued: true, width: 180 });
        doc.font('Helvetica').text(` ${item.value}`, { width: 352 });
        yPos += 18;
    });
    
    // Footer - Page 1
    doc.fontSize(7)
       .fillColor('#666666')
       .text('German Quality ELIMFILTERS® - Tecnología elaborada con IA | www.elimfilters.com', 40, 740, {
           width: 532,
           align: 'center'
       });
    
    doc.fontSize(8)
       .text('Página 1 de 2', 40, 755, {
        width: 532,
        align: 'center'
    });
    
    // =========================================================================
    // PÁGINA 2: DATOS TÉCNICOS Y COMPATIBILIDAD
    // =========================================================================
    
    doc.addPage();
    
    // Corporate Header Banner (same as page 1)
    doc.rect(0, 0, 612, 60).fill('#003366');
    
    doc.fontSize(20)
       .fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .text('ELIMFILTERS®', 40, 20);
    
    doc.fontSize(10)
       .fillColor('#FFFFFF')
       .text(`SKU: ${data.sku}`, 450, 25);
    
    yPos = 80;
    
    // =========================================================================
    // A. ESPECIFICACIONES DE RENDIMIENTO (CONDICIONAL POR TIPO)
    // =========================================================================
    
    doc.fontSize(14)
       .fillColor('#003366')
       .font('Helvetica-Bold')
       .text('ESPECIFICACIONES DE RENDIMIENTO', 40, yPos);
    
    yPos += 25;
    
    // Render conditional performance section based on filter type
    yPos = renderPerformanceSection(doc, data, yPos);
    
    // =========================================================================
    // B. DIMENSIONES FÍSICAS Y MONTAJE (DUAL UNIT TABLE)
    // =========================================================================
    
    yPos += 15;
    doc.fontSize(14)
       .fillColor('#003366')
       .font('Helvetica-Bold')
       .text('DIMENSIONES FÍSICAS', 40, yPos);
    
    yPos += 20;
    
    // Table header
    doc.fontSize(9)
       .fillColor('#FFFFFF');
    
    doc.rect(40, yPos, 532, 15).fill('#003366');
    doc.text('Parámetro', 45, yPos + 3);
    doc.text('Pulgadas', 250, yPos + 3);
    doc.text('Milímetros', 380, yPos + 3);
    
    yPos += 15;
    
    // Table rows
    doc.fontSize(9)
       .fillColor('#000000')
       .font('Helvetica');
    
    const dimRows = [
        { label: 'Longitud Total', inches: data.longitud_total_pulgadas, mm: data.longitud_total_mm },
        { label: 'Diámetro Exterior', inches: data.diametro_exterior_pulgadas, mm: data.diametro_exterior_mm },
        { label: 'Empaque OD', inches: data.empaque_od_pulgadas, mm: data.empaque_od_mm },
        { label: 'Empaque ID', inches: data.empaque_id_pulgadas, mm: data.empaque_id_mm }
    ];
    
    dimRows.forEach((row, index) => {
        const bgColor = index % 2 === 0 ? '#F8F9FA' : '#FFFFFF';
        doc.rect(40, yPos, 532, 18).fill(bgColor);
        
        doc.fillColor('#000000')
           .text(row.label, 45, yPos + 4);
        doc.text(row.inches ? `${row.inches}"` : 'N/A', 250, yPos + 4);
        doc.text(row.mm ? `${row.mm} mm` : 'N/A', 380, yPos + 4);
        
        yPos += 18;
    });
    
    // =========================================================================
    // C. COMPATIBILIDAD Y REFERENCIAS CRUZADAS
    // =========================================================================
    
    yPos += 15;
    doc.fontSize(14)
       .fillColor('#003366')
       .font('Helvetica-Bold')
       .text('COMPATIBILIDAD Y REFERENCIAS', 40, yPos);
    
    yPos += 25;
    
    // Split into two columns
    const leftCol = 40;
    const rightCol = 306;
    const colWidth = 246;
    
    // LEFT COLUMN: OEM Codes
    doc.fontSize(11)
       .fillColor('#003366')
       .font('Helvetica-Bold')
       .text('Referencias OE:', leftCol, yPos);
    
    let leftYPos = yPos + 18;
    doc.fontSize(9)
       .fillColor('#000000')
       .font('Helvetica');
    
    if (data.oem_codes_adicionales && data.oem_codes_adicionales.length > 0) {
        data.oem_codes_adicionales.slice(0, 8).forEach(code => {
            doc.text(`• ${code}`, leftCol + 10, leftYPos, { width: colWidth - 10 });
            leftYPos += 12;
        });
    } else {
        doc.text('N/A', leftCol + 10, leftYPos);
        leftYPos += 12;
    }
    
    leftYPos += 10;
    doc.fontSize(11)
       .fillColor('#003366')
       .font('Helvetica-Bold')
       .text('Aplicaciones de Motor:', leftCol, leftYPos);
    
    leftYPos += 18;
    doc.fontSize(9)
       .fillColor('#000000')
       .font('Helvetica');
    
    if (data.aplicaciones_equipo && data.aplicaciones_equipo.length > 0) {
        data.aplicaciones_equipo.slice(0, 5).forEach(app => {
            doc.text(`• ${app}`, leftCol + 10, leftYPos, { width: colWidth - 10 });
            leftYPos += 12;
        });
    } else {
        doc.text('Ver descripción del producto', leftCol + 10, leftYPos, { width: colWidth - 10 });
    }
    
    // RIGHT COLUMN: Cross References
    doc.fontSize(11)
       .fillColor('#003366')
       .font('Helvetica-Bold')
       .text('Referencias Cruzadas:', rightCol, yPos);
    
    let rightYPos = yPos + 18;
    doc.fontSize(9)
       .fillColor('#000000')
       .font('Helvetica');
    
    if (data.referencias_cruzadas && data.referencias_cruzadas.length > 0) {
        data.referencias_cruzadas.slice(0, 10).forEach(code => {
            doc.text(`• ${code}`, rightCol + 10, rightYPos, { width: colWidth - 10 });
            rightYPos += 12;
        });
        if (data.referencias_cruzadas.length > 10) {
            doc.fillColor('#666666')
               .text(`... y ${data.referencias_cruzadas.length - 10} más`, rightCol + 10, rightYPos);
        }
    } else {
        doc.text('N/A', rightCol + 10, rightYPos);
    }
    
    // =========================================================================
    // D. PIE DE PÁGINA - UPGRADE & GARANTÍA
    // =========================================================================
    
    yPos = 670;
    
    // Upgrade recommendation
    if (data.upgrade_product_media) {
        doc.fontSize(10)
           .fillColor('#003366')
           .font('Helvetica-Bold')
           .text('SUSTITUTO DE ACTUALIZACIÓN:', 40, yPos);
        
        doc.fontSize(9)
           .fillColor('#000000')
           .font('Helvetica')
           .text(`Upgrade disponible: ${data.upgrade_product_media}`, 210, yPos);
        
        yPos += 15;
    }
    
    // Service kit recommendation
    if (data.service_kit_description) {
        doc.fontSize(9)
           .fillColor('#666666')
           .font('Helvetica')
           .text(data.service_kit_description, 40, yPos, { width: 532 });
        yPos += 25;
    }
    
    // Warranty statement
    doc.fontSize(8)
       .fillColor('#333333')
       .font('Helvetica-Bold')
       .text('GARANTÍA:', 40, yPos);
    
    doc.font('Helvetica')
       .text('Este producto está cubierto por nuestra Política de Garantía Limitada General. Consulte www.elimfilters.com/garantia para términos completos.', 95, yPos, {
           width: 477
       });
    
    yPos += 25;
    
    // Legal footer
    doc.fontSize(7)
       .fillColor('#666666')
       .text('© 2025 ELIMFILTERS. Todos los derechos reservados. ELIMFILTERS®, ELIMTEK™, MACROCORE™ y MICROKAPPA™ son marcas registradas.', 40, yPos, {
           width: 532,
           align: 'center'
       });
    
    // Page footer
    doc.fontSize(7)
       .fillColor('#666666')
       .text('German Quality ELIMFILTERS® - Tecnología elaborada con IA | www.elimfilters.com', 40, 740, {
           width: 532,
           align: 'center'
       });
    
    doc.fontSize(8)
       .text('Página 2 de 2', 40, 755, {
        width: 532,
        align: 'center'
    });
    
    // Finalize PDF
    doc.end();
    
    return new Promise((resolve, reject) => {
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });
        doc.on('error', reject);
    });
}

/**
 * Get key metrics for executive summary based on filter type
 * @param {object} data - Normalized filter data
 * @returns {array} - Array of metric objects
 */
function getKeyMetrics(data) {
    const metrics = [
        { label: 'SKU', value: data.sku },
        { label: 'Clasificación', value: data.type },
        { label: 'OEM Principal', value: data.oem_codes_adicionales && data.oem_codes_adicionales.length > 0 ? data.oem_codes_adicionales[0] : 'N/A' }
    ];
    
    // Add type-specific key metric
    if (data.type === 'OIL') {
        metrics.push({ 
            label: 'Rendimiento Superior', 
            value: data.rafaga_colapso_psi ? `${data.rafaga_colapso_psi} PSI` : data.eficiencia_beta_display || 'N/A'
        });
    } else if (data.type === 'AIR') {
        metrics.push({ 
            label: 'Eficiencia', 
            value: data.iso_main_efficiency_percent ? `${data.iso_main_efficiency_percent}%` : 'N/A'
        });
    } else if (data.type === 'FUEL') {
        metrics.push({ 
            label: 'Sep. Agua', 
            value: data.water_separation_efficiency_percent ? `${data.water_separation_efficiency_percent}%` : 'N/A'
        });
    } else {
        metrics.push({ label: 'Categoría', value: data.duty === 'HD' ? 'Heavy Duty' : 'Light Duty' });
    }
    
    return metrics;
}

/**
 * Render conditional performance section based on filter type
 * @param {object} doc - PDFDocument instance
 * @param {object} data - Normalized filter data
 * @param {number} startY - Starting Y position
 * @returns {number} - Ending Y position
 */
function renderPerformanceSection(doc, data, startY) {
    let yPos = startY;
    
    // Table header styling
    const renderTableHeader = (headers, yPos) => {
        doc.fontSize(9)
           .fillColor('#FFFFFF')
           .font('Helvetica-Bold');
        
        doc.rect(40, yPos, 532, 15).fill('#003366');
        
        const colWidth = 532 / headers.length;
        headers.forEach((header, index) => {
            doc.text(header, 40 + (colWidth * index) + 5, yPos + 3, { width: colWidth - 10 });
        });
        
        return yPos + 15;
    };
    
    // Table row styling
    const renderTableRow = (cells, yPos, index) => {
        const bgColor = index % 2 === 0 ? '#F8F9FA' : '#FFFFFF';
        doc.rect(40, yPos, 532, 18).fill(bgColor);
        
        doc.fontSize(9)
           .fillColor('#000000')
           .font('Helvetica');
        
        const colWidth = 532 / cells.length;
        cells.forEach((cell, cellIndex) => {
            doc.text(cell, 40 + (colWidth * cellIndex) + 5, yPos + 4, { width: colWidth - 10 });
        });
        
        return yPos + 18;
    };
    
    // =========================================================================
    // OIL (Lubricante) - Performance Table
    // =========================================================================
    if (data.type === 'OIL') {
        yPos = renderTableHeader(['Parámetro', 'Valor', 'Unidad'], yPos);
        
        const oilRows = [
            ['Eficiencia Beta Ratio', data.eficiencia_beta_display || 'N/A', ''],
            ['Ráfaga de Colapso', data.rafaga_colapso_psi || 'N/A', `PSI (${data.rafaga_colapso_bar || 'N/A'} Bar)`],
            ['Capacidad de Retención', data.dirt_capacity_grams || 'N/A', 'Gramos'],
            ['Flujo Nominal', data.rated_flow_lpm || 'N/A', `L/min (${data.rated_flow_gpm || 'N/A'} GPM)`],
            ['Válvula Bypass', data.bypass_valve_psi || 'N/A', `PSI (${data.bypass_valve_bar || 'N/A'} Bar)`]
        ];
        
        oilRows.forEach((row, index) => {
            yPos = renderTableRow(row, yPos, index);
        });
    }
    
    // =========================================================================
    // AIR (Aire) - Performance Table
    // =========================================================================
    else if (data.type === 'AIR') {
        yPos = renderTableHeader(['Parámetro', 'Valor', 'Unidad'], yPos);
        
        const airRows = [
            ['Caída de Presión Inicial (ΔP)', 'N/A', 'inH₂O'],
            ['Máxima Caída de Presión', 'N/A', 'inH₂O'],
            ['Área de Filtro', 'N/A', 'ft²'],
            ['Flujo Nominal', data.rated_flow_cfm || 'N/A', 'CFM'],
            ['Eficiencia ISO', data.iso_main_efficiency_percent ? `${data.iso_main_efficiency_percent}%` : 'N/A', '%']
        ];
        
        airRows.forEach((row, index) => {
            yPos = renderTableRow(row, yPos, index);
        });
    }
    
    // =========================================================================
    // FUEL (Combustible) - Performance Table
    // =========================================================================
    else if (data.type === 'FUEL') {
        yPos = renderTableHeader(['Parámetro', 'Valor', 'Unidad'], yPos);
        
        const fuelRows = [
            ['Eficiencia Separación de Agua', data.water_separation_efficiency_percent || 'N/A', '%'],
            ['Micras @ 99%', data.micron_rating || 'N/A', 'μm'],
            ['Estándar de Prueba', data.iso_test_method || 'N/A', ''],
            ['Flujo Nominal', 'N/A', 'GPH'],
            ['Beta Ratio', data.eficiencia_beta_display || 'N/A', '']
        ];
        
        fuelRows.forEach((row, index) => {
            yPos = renderTableRow(row, yPos, index);
        });
    }
    
    // =========================================================================
    // OTHER TYPES - Generic Performance Table
    // =========================================================================
    else {
        yPos = renderTableHeader(['Parámetro', 'Valor', 'Unidad'], yPos);
        
        const genericRows = [
            ['Tipo de Medio', data.media_type || 'N/A', ''],
            ['Estándar de Prueba', data.iso_test_method || 'N/A', ''],
            ['Eficiencia', data.iso_main_efficiency_percent ? `${data.iso_main_efficiency_percent}%` : 'N/A', '%'],
            ['Flujo Nominal', data.rated_flow_gpm || data.rated_flow_cfm || 'N/A', 'GPM/CFM'],
            ['Vida Útil', data.service_life_hours ? `${data.service_life_hours} horas` : 'N/A', '']
        ];
        
        genericRows.forEach((row, index) => {
            yPos = renderTableRow(row, yPos, index);
        });
    }
    
    return yPos;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    generateTechnicalDatasheet
};
