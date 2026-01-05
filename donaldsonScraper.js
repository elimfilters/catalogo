// 2. ESPECIFICACIONES - CON FILTRO ULTRA AGRESIVO
const invalidKeys = [
    'nombre', 'dirección', 'impresión', 'especificaciones',
    'cantidad', 'su precio', 'fecha', 'nombre del fabricante',
    'n° de pieza del fabricante', 'equipo', 'año',
    'name', 'address', 'print', 'specifications',
    'quantity', 'your price', 'date', 'manufacturer name',
    'manufacturer part number', 'equipment', 'year',
    'número', 'región', 'indique', 'entrante'
];

const invalidValues = [
    'dirección', 'especificaciones', 'su precio', 'cantidad entrante',
    'n° de pieza del fabricante', 'año', 'indique su región'
];

// Variable para contar specs válidas
let validSpecCount = 0;

$('table').each((i, table) => {
    // Ignorar tablas de navegación, formularios, cotización
    const tableText = $(table).text().toLowerCase();
    
    // Lista de palabras que indican que NO es tabla de specs
    const skipKeywords = [
        'cotización', 'su precio', 'cantidad', 'comprar',
        'carrito', 'agregar', 'solicitar', 'región',
        'dirección', 'entrante'
    ];
    
    // Si la tabla contiene alguna de estas palabras, skip
    if (skipKeywords.some(keyword => tableText.includes(keyword))) {
        return; // Skip esta tabla
    }
    
    // Solo procesar tablas que tengan características de specs técnicas
    const hasSpecKeywords = tableText.includes('diámetro') || 
                           tableText.includes('altura') || 
                           tableText.includes('rosca') ||
                           tableText.includes('thread') ||
                           tableText.includes('diameter') ||
                           tableText.includes('height') ||
                           tableText.includes('mm') ||
                           tableText.includes('inch');
    
    if (!hasSpecKeywords) {
        return; // Skip si no tiene keywords de specs técnicas
    }
    
    $(table).find('tr').each((j, el) => {
        const cells = $(el).find('td, th');
        if (cells.length >= 2) {
            let key = $(cells[0]).text().trim().replace(':', '');
            let value = $(cells[1]).text().trim();
            
            // Normalizar para comparación
            const keyLower = key.toLowerCase();
            const valueLower = value.toLowerCase();
            
            // Validaciones múltiples
            const isValidKey = key && 
                              key.length > 2 && 
                              key.length < 50 &&
                              !invalidKeys.includes(keyLower);
            
            const isValidValue = value && 
                                value.length > 0 && 
                                value.length < 100 &&
                                !invalidValues.some(inv => valueLower.includes(inv));
            
            const isDifferent = key !== value;
            
            const hasNumbers = /\d/.test(value); // Specs técnicas suelen tener números
            
            const notHeader = !keyLower.includes('nombre') && 
                             !keyLower.includes('fabricante') &&
                             !valueLower.includes('dirección') &&
                             !valueLower.includes('especificaciones');
            
            // Solo agregar si pasa TODAS las validaciones
            if (isValidKey && isValidValue && isDifferent && hasNumbers && notHeader) {
                result.specifications[key] = value;
                validSpecCount++;
            }
        }
    });
});

console.log(`   📊 Especificaciones válidas: ${validSpecCount}`);

// Si no encontramos specs válidas, buscar en otro formato
if (validSpecCount === 0) {
    console.log(`   ⚠️ No se encontraron especificaciones en tablas, buscando en otro formato...`);
    
    // Buscar en divs o listas con formato diferente
    $('.specification-item, .spec-row, .product-spec').each((i, el) => {
        const label = $(el).find('.label, .name, .key').text().trim();
        const value = $(el).find('.value, .data').text().trim();
        
        if (label && value && /\d/.test(value)) {
            result.specifications[label] = value;
            validSpecCount++;
        }
    });
    
    console.log(`   📊 Especificaciones encontradas en formato alternativo: ${validSpecCount}`);
}
