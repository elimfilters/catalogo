/**
 * ELIMFILTERS® Engineering Core - Master Writer
 * - MASTER_KITS_V1: 20 Columnas (A-T)
 * - MASTER_UNIFIED_V5: 59 Columnas (A-BG)
 */

const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

async function writeToSheet(data, mode = 'SINGLE') {
    try {
        const isKit = (mode === 'KIT');
        const tabName = isKit ? 'MASTER_KITS_V1' : 'MASTER_UNIFIED_V5';
        const range = `${tabName}!A2`;

        const rows = data.map(item => {
            if (isKit) {
                // ESTRUCTURA DE 20 COLUMNAS PARA KITS (A-T)
                return [
                    item.kit_sku,              // A: kit_sku
                    item.kit_type,             // B: kit_type
                    item.kit_series,           // C: kit_series
                    item.kit_description_en,   // D: kit_description_en
                    item.filters_included,     // E: filters_included
                    item.equipment_app,        // F: equipment_applications
                    item.engine_app,           // G: engine_applications
                    item.industry,             // H: industry_segment
                    item.warranty,             // I: warranty_months
                    item.km_interval,          // J: change_interval_km
                    item.hrs_interval,         // K: change_interval_hours
                    item.norm,                 // L: norm
                    item.sku_base,             // M: sku_base
                    item.oem_reference,        // N: oem_kit_reference
                    item.image_url,            // O: product_image_url
                    item.pdf_url,              // P: url_technical_sheet_pdf
                    item.stock_status,         // Q: stock_status
                    item.audit_status,         // R: audit_status
                    new Date().toISOString(),  // S: created_at
                    "ELIMFILTERS_AI_CORE"      // T: created_by
                ];
            } else {
                // ESTRUCTURA DE 59 COLUMNAS PARA FILTROS (A-BG)
                const s = item.specs || {};
                return [
                    item.cross_reference,      // A: Input Code
                    item.sku,                  // B: ELIMFILTERS SKU
                    item.claim || "",          // C: Description
                    item.type || "",           // D: Filter Type
                    item.prefix || "",         // E: Prefix
                    item.duty || "",           // F: Duty
                    s.ApplicationTier || "",   // G: ApplicationTier
                    s.System || "",            // H: System
                    s.ThreadSize || "",        // I: Thread Size
                    s.Height_mm || 0,          // J: Height (mm)
                    s.Height_inch || 0,        // K: Height (inch)
                    s.OuterDiameter_mm || 0,   // L: Outer Diameter (mm)
                    s.OuterDiameter_inch || 0, // M: Outer Diameter (inch)
                    s.InnerDiameter_mm || 0,   // N: Inner Diameter (mm)
                    s.GasketOD_mm || 0,        // O: Gasket OD (mm)
                    s.GasketOD_inch || 0,      // P: Gasket OD (inch)
                    s.GasketID_mm || 0,        // Q: Gasket ID (mm)
                    s.GasketID_inch || 0,      // R: Gasket ID (inch)
                    s.ISOTestMethod || "",     // S: ISO Test Method
                    s.MicronRating || 0,       // T: Micron Rating
                    s.BetaRatio || "",         // U: Beta Ratio
                    s.NominalEfficiency || 0,  // V: Nominal Efficiency (%)
                    s.RatedFlow_Lmin || 0,     // W: Rated Flow (L/min)
                    s.RatedFlow_GPM || 0,      // X: Rated Flow (GPM)
                    s.RatedFlow_CFM || 0,      // Y: Rated Flow (CFM)
                    s.MaxPressure_PSI || 0,    // Z: Max Pressure (PSI)
                    s.BurstPressure_PSI || 0,  // AA: Burst Pressure (PSI)
                    s.CollapsePressure_PSI || 0, // AB: Collapse Pressure (PSI)
                    s.BypassValvePressure_PSI || 0, // AC: Bypass Valve Pressure (PSI)
                    s.MediaType || "",         // AD: Media Type
                    s.SealMaterial || "",      // AE: Seal Material
                    s.HousingMaterial || "",   // AF: Housing Material
                    s.EndCapMaterial || "",    // AG: End Cap Material
                    s.AntiDrainbackValve || "",// AH: Anti-Drainback Valve
                    s.DirtHoldingCapacity_g || 0, // AI: Dirt Holding Capacity (g)
                    s.ServiceLife_hours || 0,  // AJ: Service Life (hours)
                    s.ChangeInterval_km || 0,  // AK: Change Interval (km)
                    s.OperatingTempMin_C || 0, // AL: Operating Temp Min (°C)
                    s.OperatingTempMax_C || 0, // AM: Operating Temp Max (°C)
                    s.FluidCompatibility || "",// AN: Fluid Compatibility
                    s.BiodieselCompatible || "",// AO: Biodiesel Compatible
                    s.FiltrationTechnology || "",// AP: Filtration Technology
                    s.SpecialFeatures || "",   // AQ: Special Features
                    item.original_code || "",  // AR: OEM Codes
                    item.cross_reference || "",// AS: Cross Reference Codes
                    item.equipment_app || "",  // AT: Equipment Applications
                    item.engine_app || "",     // AU: Engine Applications
                    item.year || "",           // AV: Equipment Year
                    item.qty || 1,             // AW: Qty Required
                    item.em9 || "No",          // AX: EM9 Flag
                    item.et9 || "No",          // AY: ET9 Flag
                    "Standard",                // AZ: Special Conditions
                    "In Stock",                // BA: Stock Status
                    "12 Months",               // BB: Warranty
                    0.0,                       // BC: Operating Cost ($/hour)
                    "",                        // BD: Technical Sheet URL
                    "pending_audit",           // BE: audit_status
                    "",                        // BF: url_technical_sheet_pdf
                    0                          // BG: audit_status_38_0
                ];
            }
        });

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: rows },
        });

        console.log(`✅ [SHEETS] Datos sincronizados en ${tabName}`);
    } catch (error) {
        console.error("❌ [SHEETS ERROR]:", error);
    }
}

module.exports = { writeToSheet };
