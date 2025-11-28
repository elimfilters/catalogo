// ============================================================================
// A39 — VIN SERVICE ELIMFILTERS™
// Decodificación VIN → Vehículo → Familias → OEM Codes → SKU Oficial
// Cumple con A4–A38. No inventa SKUs. Respeta equivalentes requeridos.
// ============================================================================

const seedVIN = require("../config/seedVIN.json");
const brandSeed = require("../config/brandSeed.json");

const { detectFamily } = require("./familyDetector");
const { determineDutyLevel } = require("./dutyDetector");
const { generateSKU } = require("./skuGenerator");
const catalogValidator = require("./catalogValidator");

// ============================================================================
// 1. VALIDACIÓN FORMATO VIN
// ============================================================================
function isValidVIN(vin) {
    return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
}

// ============================================================================
// 2. DECODIFICADOR VIN (WMI + SEED INTERNO)
// ============================================================================
function decodeVIN(vin) {
    const prefix = vin.substring(0, 3).toUpperCase();

    const match = seedVIN.find(v => v.wmi.includes(prefix));
    if (!match) return null;

    return {
        brand: match.brand,
        model: match.model,
        engine: match.engine,
        years: match.years,
        fuel: match.fuel,
        type: match.type || "VEHICLE"
    };
}

// ============================================================================
// 3. MAPEAR MARCA → FAMILIAS → OEM Codes
// ============================================================================
function mapVINtoFilters(vehicle) {
    if (!vehicle || !vehicle.brand) return [];

    const brand = vehicle.brand.toUpperCase();
    if (!brandSeed[brand]) return [];

    return brandSeed[brand]; // { family, example_oem }
}

// ============================================================================
// 4. PROCESAR VIN COMPLETO
// ============================================================================
async function processVIN(vin) {
    const response = {
        vin,
        status: null,
        vehicle: null,
        filters: [],
        errors: []
    };

    // 4.1 VIN inválido
    if (!isValidVIN(vin)) {
        response.status = "INVALID_VIN";
        response.errors.push("VIN format is incorrect.");
        return response;
    }

    // 4.2 Decodificar VIN
    const vehicle = decodeVIN(vin);
    if (!vehicle) {
        response.status = "VIN_NOT_FOUND";
        response.errors.push("VIN not present in ELIMFILTERS database.");
        return response;
    }
    response.vehicle = vehicle;

    // 4.3 Obtener familias Teóricas (Oil, Fuel, Air, Cabin…)
    const fam = mapVINtoFilters(vehicle);
    if (fam.length === 0) {
        response.status = "NO_FILTERS_MAPPED";
        response.errors.push("Brand has no filter mapping.");
        return response;
    }

    // 4.4 Procesar cada familia y generar SKU
    const processed = [];

    for (const f of fam) {

        // Determinar duty según OEM base
        const duty = determineDutyLevel(f.example_oem);

        // Generar SKU ELIMFILTERS™ real (usa reglas A4–A16)
        const sku = generateSKU(f.family, duty, f.example_oem);

        const product = {
            query_norm: f.example_oem,
            sku,
            filter_type: f.family,
            duty,
            oem_code: f.example_oem
        };

        // 4.5 Validar catálogo (A38)
        const validation = catalogValidator.validateProduct(product);
        if (!validation.valid) {
            response.errors.push({
                sku,
                validation
            });
            continue;
        }

        processed.push(product);
    }

    response.status = processed.length ? "OK" : "NO_VALID_SKU";
    response.filters = processed;

    return response;
}

module.exports = {
    processVIN,
    isValidVIN
};
