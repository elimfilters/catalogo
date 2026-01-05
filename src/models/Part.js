const mongoose = require('mongoose');

const PartSchema = new mongoose.Schema({
    // Identificación Básica
    sku: { type: String, required: true, unique: true },
    brand: { type: String, default: "ELIMFILTERS® Engineering Core" },
    tier: String, // ELITE, PERFORMANCE, STANDARD
    duty: String, // HD o LD
    cross_reference: { type: String, index: true },
    original_code: String,

    // Especificaciones Técnicas (La Lista Completa)
    technical_specs: {
        application: String, system: String, thread_size: String,
        height_mm: Number, height_inch: Number,
        outer_diameter_mm: Number, outer_diameter_inch: Number,
        inner_diameter_mm: Number,
        gasket_od_mm: Number, gasket_od_inch: Number,
        gasket_id_mm: Number, gasket_id_inch: Number,
        iso_test_method: String, micron_rating: Number,
        beta_ratio: String, nominal_efficiency: Number,
        rated_flow_lmin: Number, rated_flow_gpm: Number, rated_flow_cfm: Number,
        max_pressure_psi: Number, burst_pressure_psi: Number,
        collapse_pressure_psi: Number, bypass_valve_pressure_psi: Number,
        media_type: String, seal_material: String,
        housing_material: String, end_cap_material: String,
        anti_drainback_valve: String, dirt_holding_capacity_g: Number,
        service_life_hours: Number, change_interval_km: Number,
        operating_temp_min_c: Number, operating_temp_max_c: Number,
        fluid_compatibility: String, biodiesel_compatible: String,
        filtration_technology: String, special_features: String
    },
    date_created: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Part', PartSchema);
