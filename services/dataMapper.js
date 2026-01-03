module.exports = {
    mapToRow: (aiData, query) => {
        // Creamos un array con el orden exacto de tus columnas (Master50)
        const row = new Array(56).fill(""); // 56 columnas según tu lista

        row[0] = query;                   // Input Code
        row[1] = aiData.sku;              // ELIMFILTERS SKU
        row[2] = aiData.description;      // Description
        row[3] = aiData.filterType;       // Filter Type
        row[4] = aiData.prefix;           // Prefix
        row[7] = aiData.tier;             // Tier System
        row[29] = aiData.mediaType;       // Media Type
        row[41] = aiData.tech;            // Filtration Technology
        row[44] = aiData.cross;           // Cross Reference Codes
        
        // El resto se llena con los datos técnicos que Groq extraiga
        return row;
    }
};
