/**
 * ELIMFILTERS® Engineering Core - Master SheetsWriter
 * v10.6 - Dual Tab Routing & Extended Mapping
 */

const { google } = require('googleapis');
require('dotenv').config();

// Configuración de Autenticación Profesional
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

/**
 * Escribe datos en la hoja de cálculo correspondiente.
 * @param {Array} data - Lista de objetos (Filtros individuales o Kits)
 * @param {String} mode - 'SINGLE' para MASTER_UNIFIED_V5 | 'KIT' para MASTER_KITS_V1
 */
async function writeToSheet(data, mode = 'SINGLE') {
    try {
        const isKit = (mode === 'KIT');
        const tabName = isKit ? 'MASTER_KITS_V1' : 'MASTER_UNIFIED_V5';
        const range = `${tabName}!A2`;

        const rows = data.map(item => {
            if (isKit) {
                // --- MAPEO DE 20 COLUMNAS: MASTER_KITS_V1 (A-T) ---
                return [
                    item.kit_sku || "",              // A: kit_sku
                    item.kit_type || "Maintenance",  // B: kit_type
                    item.kit_series || "",           // C: kit_series (EK5/EK3)
                    item.kit_description_en || "",   // D: kit_description_en
                    item.filters_included || "",     // E: filters_included
                    item.equipment_app || "",        // F: equipment_applications
                    item.engine_app || "",           // G: engine_applications
                    item.industry || "Heavy Duty",   // H: industry_segment
                    item.warranty || "12",           // I: warranty_months
                    item.km_interval || "25000",     // J: change_interval_km
                    item.hrs_interval || "500",      // K: change_interval_hours
                    item.norm || "ISO 9001",         // L: norm
                    item.sku_base || "",             // M: sku_base
                    item.oem_reference || "",        // N: oem_kit_reference
                    item.image_url || "",            // O: product_image_url
                    item.pdf_url || "",              // P: url_technical_sheet_pdf
                    item.stock_status || "In Stock", // Q: stock_status
                    item.audit_status || "pending",  // R: audit_status
                    new Date().toISOString(),        // S: created_at
                    "ELIMFILTERS_AI_CORE"            // T: created_by
                ];
            } else {
                // --- MAPEO DE 59 COLUMNAS: MASTER_UNIFIED_V5 (A-BG) ---
                const s = item.specs || item.technical_specs || {};
                
                // Determinación automática de banderas (Flags)
                const isEM9 = item.sku && item.sku.includes("EM9") ? "Yes" : "No";
                const isET9 = item.sku && item.sku.includes("ET9") ? "Yes" : "No";

                return [
                    item.input_code || item.cross_reference || "", // A: Input Code
                    item.sku || "",                               // B: ELIMFILTERS SKU
                    item.claim || item.performance_claim || "",   // C: Description
                    item.type || item.filter_type || "",          // D: Filter Type
                    item.prefix || "",                            // E: Prefix
                    item.duty || "",                              // F: Duty
                    s.ApplicationTier || "",                      // G: ApplicationTier
                    s.System || "",                               // H: System
                    s.ThreadSize || "",                           // I: Thread Size
                    s.Height_mm || 0,                             // J: Height (mm)
                    s.Height_inch || 0,                           // K: Height (inch)
                    s.OuterDiameter_mm || 0,                      // L: Outer Diameter (mm)
                    s.OuterDiameter_inch || 0,                    // M: Outer Diameter (inch)
                    s.InnerDiameter_mm || 0,                      // N: Inner Diameter (mm)
                    s.GasketOD_mm || 0,                           // O: Gasket OD (mm)
                    s.GasketOD_inch || 0,                         // P: Gasket OD (inch)
                    s.GasketID_mm || 0,                           // Q: Gasket ID (mm)
                    s.GasketID_inch || 0,                         // R: Gasket ID (inch)
                    s.ISOTestMethod || "",                        // S: ISO Test Method
                    s.MicronRating || 0,                          // T: Micron Rating
                    s.BetaRatio || "",                            // U: Beta Ratio
                    s.NominalEfficiency || 0,                     // V: Nominal Efficiency (%)
                    s.RatedFlow_Lmin || 0,                        // W: Rated Flow (L/min)
                    s.RatedFlow_GPM || 0,                         // X: Rated Flow (GPM)
                    s.RatedFlow_CFM || 0,                         // Y: Rated Flow (CFM)
                    s.MaxPressure_PSI || 0,                       // Z: Max Pressure (PSI)
                    s.BurstPressure_PSI || 0,                     // AA: Burst Pressure (PSI)
                    s.CollapsePressure_PSI || 0,                  // AB: Collapse Pressure (PSI)
                    s.BypassValvePressure_PSI || 0,               // AC: Bypass Valve Pressure (PSI)
                    s.MediaType || "",                            // AD: Media Type
                    s.SealMaterial || "",                         // AE: Seal Material
                    s.HousingMaterial || "",                      // AF: Housing Material
                    s.EndCapMaterial || "",                       // AG: End Cap Material
                    s.AntiDrainbackValve || "",                   // AH: Anti-Drainback Valve
                    s.DirtHoldingCapacity_g || 0,                 // AI: Dirt Holding Capacity (g)
                    s.ServiceLife_hours || 0,                     // AJ: Service Life (hours)
                    s.ChangeInterval_km || 0,                     // AK: Change Interval (km)
                    s.OperatingTempMin_C || 0,                    // AL: Operating Temp Min (°C)
                    s.OperatingTempMax_C || 0,                    // AM: Operating Temp Max (°C)
                    s.FluidCompatibility || "",                   // AN: Fluid Compatibility
                    s.BiodieselCompatible || "",                  // AO: Biodiesel Compatible
                    s.FiltrationTechnology || "",                 // AP: Filtration Technology
                    s.SpecialFeatures || "",                      // AQ: Special Features
                    item.original_code || "",                     // AR: OEM Codes
                    item.cross_reference || "",                   // AS: Cross Reference Codes
                    item.equipment_app || "",                     // AT: Equipment Applications
                    item.engine_app || "",                        // AU: Engine Applications
                    item.year || "",                              // AV: Equipment Year
                    item.qty || 1,                                // AW: Qty Required
                    isEM9,                                        // AX: EM9 Flag
                    isET9,                                        // AY: ET9 Flag
                    "Standard",                                   // AZ: Special Conditions
                    "In Stock",                                   // BA: Stock Status
                    "12 Months",                                  // BB: Warranty
                    0.0,                                          // BC: Operating Cost ($/hour)
                    "",                                           // BD: Technical Sheet URL
                    "pending_audit",                              // BE: audit_status
                    "",                                           // BF: url_technical_sheet_pdf
                    0                                             // BG: audit_status_38_0
                ];
            }
        });

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: rows },
        });

        console.log(`✅ [SHEETS] Sincronización exitosa en ${tabName}`);
    } catch (error) {
        console.error("❌ [SHEETS ERROR]:", error.message);
    }
}

module.exports = { writeToSheet };
