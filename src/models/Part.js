const mongoose = require('mongoose');

/**
 * ELIMFILTERS® Engineering Core - Part Schema
 * v9.7 - Technical Specs & Trilogy Ready
 */
const PartSchema = new mongoose.Schema({
    sku: { type: String, required: true, unique: true }, // Ej: EL87405
    brand: { type: String, default: "ELIMFILTERS® Engineering Core" },
    tier: { type: String, enum: ['ELITE', 'PERFORMANCE', 'STANDARD'] }, //
    duty: { type: String, enum: ['HD', 'LD'] }, // Determinado por Groq
    microns: Number, // Física del filtro
    media: String,   // Dato extraído por el Scraper
    performance_claim: String, // Justificación técnica
    cross_reference: { type: String, index: true }, // El código buscado (1R1808)
    original_code: String, // El código hallado (DBL7405)
    date_created: { type: Date, default: Date.now }
});

// Índice para que la búsqueda por código original sea instantánea
PartSchema.index({ cross_reference: 1 });

module.exports = mongoose.model('Part', PartSchema);
