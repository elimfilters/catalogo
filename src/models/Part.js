const mongoose = require('mongoose');

const PartSchema = new mongoose.Schema({
    sku: { type: String, required: true, unique: true },
    tier: { type: String, enum: ['ELITE', 'PERFORMANCE', 'STANDARD'] },
    duty: { type: String, enum: ['HD', 'LD'] },
    microns: Number,
    performance_claim: String,
    cross_reference: { type: String, index: true }, // El código buscado originalmente (ej. 1R1808)
    original_code: String, // El código de Donaldson/FRAM (ej. DBL7405)
    specifications: [
        { label: String, value: String }
    ],
    date_created: { type: Date, default: Date.now }
});

// Índice para que la búsqueda por código de competencia sea veloz
PartSchema.index({ cross_reference: 1 });

module.exports = mongoose.model('Part', PartSchema);
