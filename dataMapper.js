module.exports = {
    mapToHorizontalRow: (aiData, query) => {
        // Creamos una fila única para el código buscado
        const row = [];
        row[0] = query; // Columna A: Input Code

        // Bloque STANDARD (Columnas B en adelante)
        if (aiData.skus.STANDARD) {
            row[1] = aiData.skus.STANDARD.sku;
            row[2] = aiData.skus.STANDARD.descripcion;
            row[3] = aiData.skus.STANDARD.media_type;
        }

        // Bloque PERFORMANCE (Saltamos a la siguiente sección a la derecha)
        if (aiData.skus.PERFORMANCE) {
            row[10] = aiData.skus.PERFORMANCE.sku; 
            row[11] = aiData.skus.PERFORMANCE.descripcion;
            row[12] = aiData.skus.PERFORMANCE.media_type;
        }

        // Bloque ELITE (Más a la derecha)
        if (aiData.skus.ELITE) {
            row[20] = aiData.skus.ELITE.sku;
            row[21] = aiData.skus.ELITE.descripcion;
            row[22] = aiData.skus.ELITE.media_type;
        }

        return row;
    }
};
