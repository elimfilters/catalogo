const mongoose = require('mongoose');

const PartSchema = new mongoose.Schema({
    sku: String,
    tier: String,
    duty: String,
    microns: Number,
    cross_reference: { type: String, index: true },
    performance_claim: String,
    specifications: Array,
    date_created: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Part', PartSchema);
