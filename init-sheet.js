const { google } = require('googleapis');

async function initSheet() {
  const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  
  const headers = [
    '1_query', '2_normsku', '3_duty_type', '4_type', '5_subtype',
    '6_description', '7_oem_codes', '8_cross_reference_codes', '9_price_usd',
    '10_equipment_applications', '11_engine_applications', '12_industry_segments',
    '13_media_type', '14_thread_size', '15_height_mm', '16_outer_diameter_mm',
    '17_inner_diameter_mm', '18_gasket_od_mm', '19_gasket_id_mm',
    '20_gasket_thickness_mm', '21_panel_length_mm', '22_panel_width_mm',
    '23_panel_depth_mm', '24_drain_type', '25_micron_rating', '26_beta_ratio',
    '27_iso_test_method', '28_rated_flow_gpm', '29_rated_flow_cfm',
    '30_max_pressure_psi', '31_burst_pressure_psi', '32_collapse_pressure_psi',
    '33_operating_temp_min_c', '34_operating_temp_max_c', '35_fluid_compatibility',
    '36_seal_material', '37_housing_material', '38_end_cap_material',
    '39_weight_grams', '40_service_life_hours', '41_change_interval_km',
    '42_warranty_months', '43_certifications', '44_stock_status',
    '45_tecnologia_aplicada', '46_technology_tier', '47_technology_scope',
    '48_manufacturer_detected', '49_oem_brand_detected', '50_technology_oem_detected',
    '51_kit_components'
  ];
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'MASTER_UNIFIED_V5!A1:AY1',
    valueInputOption: 'RAW',
    requestBody: { values: [headers] }
  });
  
  console.log('✅ Headers created in MASTER_UNIFIED_V5');
}

initSheet().catch(console.error);