const PREFIXES = {
    "Lube": "EL8", "Air": "EA1", "AirHousing": "EA2", "Fuel": "EF9",
    "Separator": "ES9", "Turbine": "ET9", "Cabin": "EC1",
    "Hydraulic": "EH6", "Coolant": "EW7", "Mariner": "EM9", "Brake": "ED4"
};

function buildDynamicSKU(type, competitorCode, microns) {
    const prefix = PREFIXES[type] || "EL8";
    // Extraer exactamente los últimos 4 números del código Donaldson/FRAM
    const lastFour = competitorCode.toString().replace(/[^0-9]/g, '').slice(-4);
    
    let sku = `${prefix}${lastFour}`;

    // Lógica ET9 S/T/P basada en micras (Regla mandatoria)
    if (prefix === "ET9") {
        if (microns <= 2) sku += "S";
        else if (microns <= 10) sku += "T";
        else sku += "P";
    }
    return sku;
}
