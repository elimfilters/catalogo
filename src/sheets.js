const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = '1S2hu2r0EzilEq_lQpXW2aNsd0lf_EQNbLa_eQxg-LXo';
const SHEET_NAME = 'MASTER_UNIFIED_V5';

let auth = null;

async function initializeAuth() {
  if (auth) return auth;

  try {
    const credentialsStr = process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\\\n/g, '\n');
    const credentials = JSON.parse(credentialsStr);
    
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });

    console.log('✅ Google Sheets auth initialized');
    return auth;
  } catch (error) {
    console.error('❌ Error initializing Google Sheets auth:', error.message);
    throw error;
  }
}

async function appendToSheet(values) {
  try {
    const authClient = await initializeAuth();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME + '!A:AV',
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error appending to sheet:', error.message);
    throw error;
  }
}

async function writeToGoogleSheets(products) {
  try {
    if (!products || products.length === 0) {
      console.log('⚠️ No products to write');
      return { success: true, rowsWritten: 0 };
    }

    console.log('Escribiendo ' + products.length + ' productos a Google Sheets...');

    const rows = products.map(product => [
      product.query || '',
      product.normsku || '',
      product.duty_type || '',
      product.type || '',
      product.subtype || '',
      product.description || '',
      product.oem_codes || '',
      product.cross_reference || '',
      product.media_type || '',
      product.equipment_applications || '',
      product.engine_applications || '',
      product.height_mm || '',
      product.outer_diameter_mm || '',
      product.thread_size || '',
      product.micron_rating || '',
      product.operating_temperature_min_c || '',
      product.operating_temperature_max_c || '',
      product.fluid_compatibility || '',
      product.disposal_method || '',
      product.gasket_od_mm || '',
      product.gasket_id_mm || '',
      product.bypass_valve_psi || '',
      product.beta_200 || '',
      product.hydrostatic_burst_psi || '',
      product.dirt_capacity_grams || '',
      product.rated_flow_gpm || '',
      product.rated_flow_cfm || '',
      product.operating_pressure_min_psi || '',
      product.operating_pressure_max_psi || '',
      product.weight_grams || '',
      product.panel_width_mm || '',
      product.panel_depth_mm || '',
      product.water_separation_efficiency_percent || '',
      product.drain_type || '',
      product.inner_diameter_mm || '',
      product.pleat_count || '',
      product.seal_material || '',
      product.housing_material || '',
      product.iso_main_efficiency_percent || '',
      product.iso_test_method || '',
      product.manufacturing_standards || '',
      product.certification_standards || '',
      product.service_life_hours || '',
      product.change_interval_km || '',
      product.tecnologia_aplicada || '',
      product.technology_name || '',
      product.technology_tier || '',
      product.technology_scope || '',
      product.technology_equivalents || '',
      product.technology_oem_detected || ''
    ]);

    await appendToSheet(rows);
    console.log('Exportados ' + rows.length + ' productos exitosamente a ' + SHEET_NAME);
    
    return { success: true, rowsWritten: rows.length };
  } catch (error) {
    console.error('❌ Error writing to Google Sheets:', error.message);
    throw error;
  }
}

module.exports = {
  initializeAuth,
  appendToSheet,
  writeToGoogleSheets
};
