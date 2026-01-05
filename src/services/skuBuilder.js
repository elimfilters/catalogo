const PREFIX_MAP = {
    "Lube": "EL8", "Air": "EA1", "AirHousing": "EA2", "Fuel": "EF9",
    "Separator": "ES9", "Turbine": "ET9", "Cabin": "EC1",
    "Hydraulic": "EH6", "Coolant": "EW7", "Mariner": "EM9", "Brake": "ED4"
};

const HD_ONLY = ["EH6", "EW7", "ED4", "ES9", "EA2"];

function buildDynamicSKU(application, competitorCode, microns) {
    const prefix = PREFIX_MAP[application] || "EL8";
    
    // Ignora prefijos de otras marcas, solo toma los 4 números identificadores
    const id = competitorCode.toString().replace(/[^0-9]/g, '').slice(-4);
    let sku = `${prefix}${id}`;

    // Lógica ET9 basada en física (micrones), no en códigos OEM
    if (prefix === "ET9") {
        if (microns <= 2) sku += "S";      // 2 micrones
        else if (microns <= 10) sku += "T"; // 10 micrones
        else if (microns >= 30) sku += "P"; // 30 micrones
    }

    return sku;
}

module.exports = { buildDynamicSKU, HD_ONLY };
