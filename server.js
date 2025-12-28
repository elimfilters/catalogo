// ELIMFILTERS v5.6 PRO - Production API Server
// Railway Deployment - MongoDB + Google Sheets + 50 Column Schema
// Integración completa con reglas de negocio y mapeo automático

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 1. CONFIGURACIÓN CORS
// ============================================
const corsOptions = {
  origin: [
    'https://elimfilters.com',
    'https://www.elimfilters.com',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Forzar HTTPS en producción
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// ============================================
// 2. CONEXIÓN A MONGODB
// ============================================
let mongoClient;
let db;
let productsCollection;

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function connectMongoDB() {
  try {
    if (!MONGO_URI) {
      console.warn('⚠️  MongoDB URI not configured');
      return false;
    }

    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    db = mongoClient.db('elimfilters');
    productsCollection = db.collection('products');
    
    console.log('✓ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    return false;
  }
}

// ============================================
// 3. CONEXIÓN A GOOGLE SHEETS
// ============================================
let sheetsClient;
let sheetsConnected = false;

async function connectGoogleSheets() {
  try {
    const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS;
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    if (!credentials || !spreadsheetId) {
      console.warn('⚠️  Google Sheets not configured');
      return false;
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(credentials),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    sheetsConnected = true;
    
    console.log('✓ Google Sheets connected successfully');
    return true;
  } catch (error) {
    console.error('✗ Google Sheets connection failed:', error.message);
    return false;
  }
}

// ============================================
// 4. MOTOR DE MARCAS (MAPEO AUTOMÁTICO)
// ============================================

// Detectar prefijo y aplicar tecnología
function applyTechnologyMapping(normsku) {
  const prefix = normsku.substring(0, 3).toUpperCase();
  
  const technologyMap = {
    'EA1': {
      technology_name: 'MACROCORE™',
      media_type: 'MACROCORE™ High-Capacity Air Media',
      technology_tier: 'PREMIUM',
      technology_scope: 'Heavy-Duty Air Filtration',
      technology_equivalents: 'Donaldson PowerCore™, Camfil Hi-Flo™'
    },
    'EA2': {
      technology_name: 'MACROCORE™',
      media_type: 'MACROCORE™ High-Capacity Air Media',
      technology_tier: 'PREMIUM',
      technology_scope: 'Heavy-Duty Air Filtration',
      technology_equivalents: 'Donaldson PowerCore™, Camfil Hi-Flo™'
    },
    'ET9': {
      technology_name: 'ELIMTEK™ WATERBLOC™',
      media_type: 'ELIMTEK™ WATERBLOC™ Synthetic Media',
      technology_tier: 'ADVANCED',
      technology_scope: 'Fuel-Water Separation',
      technology_equivalents: 'Baldwin Fuel Manager™, Racor Aquabloc™'
    },
    'EL': {
      technology_name: 'ELIMTEK™',
      media_type: 'ELIMTEK™ Liquid Synthetic Media',
      technology_tier: 'STANDARD',
      technology_scope: 'Hydraulic & Lube Filtration',
      technology_equivalents: 'Pall HC™, Parker Velcon™'
    },
    'EF': {
      technology_name: 'ELIMTEK™',
      media_type: 'ELIMTEK™ Liquid Synthetic Media',
      technology_tier: 'STANDARD',
      technology_scope: 'Fuel Filtration',
      technology_equivalents: 'Fleetguard StrataPore™, Mann+Hummel™'
    },
    'EH': {
      technology_name: 'ELIMTEK™',
      media_type: 'ELIMTEK™ Liquid Synthetic Media',
      technology_tier: 'STANDARD',
      technology_scope: 'Hydraulic Filtration',
      technology_equivalents: 'Hydac BetaDFB™, Filtrec D™'
    },
    'EW': {
      technology_name: 'ELIMTEK™',
      media_type: 'ELIMTEK™ Liquid Synthetic Media',
      technology_tier: 'STANDARD',
      technology_scope: 'Water Filtration',
      technology_equivalents: 'Pentair Pentek™, 3M Aqua-Pure™'
    },
    'EC1': {
      technology_name: 'MICROKAPPA™',
      media_type: 'MICROKAPPA™ Multi-layer Activated Carbon',
      technology_tier: 'SPECIALTY',
      technology_scope: 'Cabin Air & Odor Control',
      technology_equivalents: 'Mann CUK™, Bosch ActivCarbon™'
    }
  };

  // Buscar por prefijo completo (EA1, EA2, ET9)
  if (technologyMap[prefix]) {
    return technologyMap[prefix];
  }

  // Buscar por prefijo de 2 caracteres (EL, EF, EH, EW)
  const prefix2 = normsku.substring(0, 2).toUpperCase();
  if (technologyMap[prefix2]) {
    return technologyMap[prefix2];
  }

  // Default fallback
  return {
    technology_name: 'ELIMTEK™',
    media_type: 'ELIMTEK™ Standard Media',
    technology_tier: 'STANDARD',
    technology_scope: 'General Filtration',
    technology_equivalents: 'N/A'
  };
}

// ============================================
// 5. BLINDAJE DE MARCA (BRAND PROTECTION)
// ============================================

// Lista de marcas competidoras a eliminar
const COMPETITOR_BRANDS = [
  'Donaldson', 'Baldwin', 'Fleetguard', 'Wix', 'Mann', 'Bosch', 
  'Fram', 'Purolator', 'AC Delco', 'Mahle', 'Hengst', 'Parker',
  'Pall', 'Hydac', 'Filtrec', 'Camfil', 'Racor', 'Stanadyne',
  'Cummins', 'Caterpillar', 'John Deere', 'Volvo', 'DAF'
];

function applyBrandShield(text) {
  if (!text) return 'N/A';
  
  let shielded = text;
  
  // Reemplazar menciones de competidores
  COMPETITOR_BRANDS.forEach(brand => {
    const regex = new RegExp(`\\b${brand}\\b`, 'gi');
    shielded = shielded.replace(regex, 'OEM');
  });

  // Reemplazar patrones genéricos
  shielded = shielded
    .replace(/\b(Original Equipment|OE|Genuine)\b/gi, 'OEM')
    .replace(/\b(Aftermarket|Replacement)\b/gi, 'Compatible');

  return shielded;
}

// ============================================
// 6. NORMALIZACIÓN EA2 (4 DÍGITOS)
// ============================================

function normalizeEA2(oemCode) {
  // Ejemplo: G082504 -> EA21575
  // Esta función debe implementar tu lógica específica de conversión
  if (!oemCode) return null;
  
  // Placeholder: implementar lógica real según tu tabla de conversión
  // Por ahora devuelve el código tal cual
  return oemCode;
}

// ============================================
// 7. GENERADOR DEL OBJETO DE 50 COLUMNAS
// ============================================

function generateMaster50(rawData, originalQuery) {
  // Obtener normsku (puede venir de BD o generarse)
  const normsku = rawData.normsku || rawData['2_normsku'] || rawData.partNumber || 'UNKNOWN';
  
  // Aplicar mapeo de tecnología según prefijo
  const techMapping = applyTechnologyMapping(normsku);
  
  // Construir objeto de 50 columnas
  const master50 = {
    // Columnas 1-11: Identificación y Clasificación
    '1_query': originalQuery,
    '2_normsku': normsku,
    '3_duty_type': rawData['3_duty_type'] || rawData.duty_type || 'HD',
    '4_type': normsku.substring(0, 2).toUpperCase(),
    '5_subtype': rawData['5_subtype'] || rawData.subtype || 'Filter Element',
    '6_description': applyBrandShield(rawData['6_description'] || rawData.description || 'ELIMFILTERS Replacement Filter'),
    '7_oem_codes': rawData['7_oem_codes'] || rawData.oem_codes || 'N/A',
    '8_cross_reference': rawData['8_cross_reference'] || rawData.cross_reference || 'N/A',
    '9_media_type': techMapping.media_type,
    '10_equipment_applications': rawData['10_equipment_applications'] || rawData.equipment_applications || 'N/A',
    '11_engine_applications': rawData['11_engine_applications'] || rawData.engine_applications || 'N/A',

    // Columnas 12-29: Especificaciones Técnicas Físicas
    '12_height_mm': parseFloat(rawData['12_height_mm'] || rawData.height_mm || 0),
    '13_outer_diameter_mm': parseFloat(rawData['13_outer_diameter_mm'] || rawData.outer_diameter_mm || 0),
    '14_thread_size': rawData['14_thread_size'] || rawData.thread_size || 'N/A',
    '15_micron_rating': parseFloat(rawData['15_micron_rating'] || rawData.micron_rating || 0),
    '16_operating_temperature_min_c': parseFloat(rawData['16_operating_temperature_min_c'] || rawData.operating_temperature_min_c || -40),
    '17_operating_temperature_max_c': parseFloat(rawData['17_operating_temperature_max_c'] || rawData.operating_temperature_max_c || 125),
    '18_fluid_compatibility': rawData['18_fluid_compatibility'] || rawData.fluid_compatibility || 'N/A',
    '19_disposal_method': rawData['19_disposal_method'] || rawData.disposal_method || 'Industrial Waste',
    '20_gasket_od_mm': parseFloat(rawData['20_gasket_od_mm'] || rawData.gasket_od_mm || 0),
    '21_gasket_id_mm': parseFloat(rawData['21_gasket_id_mm'] || rawData.gasket_id_mm || 0),
    '22_bypass_valve_psi': parseFloat(rawData['22_bypass_valve_psi'] || rawData.bypass_valve_psi || 0),
    '23_beta_200': parseInt(rawData['23_beta_200'] || rawData.beta_200 || 0),
    '24_hydrostatic_burst_psi': parseFloat(rawData['24_hydrostatic_burst_psi'] || rawData.hydrostatic_burst_psi || 0),
    '25_dirt_capacity_grams': parseFloat(rawData['25_dirt_capacity_grams'] || rawData.dirt_capacity_grams || 0),
    '26_rated_flow_gpm': parseFloat(rawData['26_rated_flow_gpm'] || rawData.rated_flow_gpm || 0),
    '27_rated_flow_cfm': parseFloat(rawData['27_rated_flow_cfm'] || rawData.rated_flow_cfm || 0),
    '28_operating_pressure_min_psi': parseFloat(rawData['28_operating_pressure_min_psi'] || rawData.operating_pressure_min_psi || 0),
    '29_operating_pressure_max_psi': parseFloat(rawData['29_operating_pressure_max_psi'] || rawData.operating_pressure_max_psi || 0),

    // Columnas 30-44: Especificaciones Adicionales
    '30_weight_grams': parseFloat(rawData['30_weight_grams'] || rawData.weight_grams || 0),
    '31_panel_width_mm': parseFloat(rawData['31_panel_width_mm'] || rawData.panel_width_mm || 0),
    '32_panel_depth_mm': parseFloat(rawData['32_panel_depth_mm'] || rawData.panel_depth_mm || 0),
    '33_water_separation_efficiency_percent': parseFloat(rawData['33_water_separation_efficiency_percent'] || rawData.water_separation_efficiency_percent || 0),
    '34_drain_type': rawData['34_drain_type'] || rawData.drain_type || 'N/A',
    '35_inner_diameter_mm': parseFloat(rawData['35_inner_diameter_mm'] || rawData.inner_diameter_mm || 0),
    '36_pleat_count': parseInt(rawData['36_pleat_count'] || rawData.pleat_count || 0),
    '37_seal_material': rawData['37_seal_material'] || rawData.seal_material || 'N/A',
    '38_housing_material': rawData['38_housing_material'] || rawData.housing_material || 'N/A',
    '39_iso_main_efficiency_percent': parseFloat(rawData['39_iso_main_efficiency_percent'] || rawData.iso_main_efficiency_percent || 0),
    '40_iso_test_method': rawData['40_iso_test_method'] || rawData.iso_test_method || 'ISO 4548-12',
    '41_manufacturing_standards': rawData['41_manufacturing_standards'] || rawData.manufacturing_standards || 'IATF 16949, ISO 9001',
    '42_certification_standards': rawData['42_certification_standards'] || rawData.certification_standards || 'ELIMFILTERS Certified',
    '43_service_life_hours': parseFloat(rawData['43_service_life_hours'] || rawData.service_life_hours || 0),
    '44_change_interval_km': parseFloat(rawData['44_change_interval_km'] || rawData.change_interval_km || 0),

    // Columnas 45-50: Tecnología Aplicada (AUTO-GENERADAS)
    '45_tecnologia_aplicada': applyBrandShield(techMapping.technology_scope),
    '46_technology_name': techMapping.technology_name,
    '47_technology_tier': techMapping.technology_tier,
    '48_technology_scope': techMapping.technology_scope,
    '49_technology_equivalents': techMapping.technology_equivalents,
    '50_technology_oem_detected': detectOEMTechnology(rawData['7_oem_codes'] || rawData.oem_codes)
  };

  return master50;
}

// Detectar tecnología OEM basada en códigos
function detectOEMTechnology(oemCodes) {
  if (!oemCodes || oemCodes === 'N/A') return 'N/A';
  
  const oemPatterns = {
    'P': 'Donaldson PowerCore™',
    'G0': 'Donaldson PowerCore™',
    'LF': 'Fleetguard StrataPore™',
    'FS': 'Fleetguard Fuel Pro™',
    'BF': 'Baldwin Fuel Manager™',
    'B7': 'Baldwin Premium™',
    'HF': 'Fleetguard Cellulose™'
  };

  for (const [pattern, tech] of Object.entries(oemPatterns)) {
    if (oemCodes.includes(pattern)) {
      return tech;
    }
  }

  return 'Standard OEM Technology';
}

// ============================================
// 8. BÚSQUEDA EN MONGODB
// ============================================

async function searchMongoDB(query, page = 1, limit = 50) {
  if (!productsCollection) return { results: [], total: 0 };

  try {
    const regex = new RegExp(query, 'i');
    const skip = (page - 1) * limit;

    const results = await productsCollection
      .find({
        $or: [
          { '2_normsku': regex },
          { '6_description': regex },
          { '7_oem_codes': regex },
          { '8_cross_reference': regex },
          { normsku: regex },
          { partNumber: regex },
          { description: regex }
        ]
      })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await productsCollection.countDocuments({
      $or: [
        { '2_normsku': regex },
        { '6_description': regex },
        { '7_oem_codes': regex },
        { '8_cross_reference': regex }
      ]
    });

    // Generar Master50 para cada resultado
    const master50Results = results.map(item => generateMaster50(item, query));

    return { results: master50Results, total };
  } catch (error) {
    console.error('MongoDB search error:', error);
    return { results: [], total: 0 };
  }
}

// ============================================
// 9. BÚSQUEDA EN GOOGLE SHEETS
// ============================================

async function searchGoogleSheets(query) {
  if (!sheetsConnected || !sheetsClient) return [];

  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    const range = 'Products!A:AX'; // 50 columnas (A-AX)

    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const queryLower = query.toLowerCase();
    const results = dataRows
      .filter(row => 
        row.some(cell => 
          cell && cell.toString().toLowerCase().includes(queryLower)
        )
      )
      .slice(0, 50)
      .map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return generateMaster50(obj, query);
      });

    return results;
  } catch (error) {
    console.error('Google Sheets search error:', error);
    return [];
  }
}

// ============================================
// 10. ENDPOINTS API
// ============================================

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    connections: {
      mongodb: productsCollection ? 'connected' : 'disconnected',
      sheets: sheetsConnected ? 'connected' : 'disconnected',
      gema: 'disabled'
    },
    version: '5.6-PRO',
    schema: 'Master50'
  });
});

// API Info
app.get('/api', (req, res) => {
  res.json({
    success: true,
    version: '5.6-PRO',
    schema: 'Master 50 Columns (A:AX)',
    message: 'ELIMFILTERS API - 50 Column Schema with Auto-Mapping',
    endpoints: {
      health: 'GET /health',
      search_get: 'GET /api/search?q={query}',
      search_post: 'POST /api/search {query, page, limit}',
      autocomplete: 'GET /api/autocomplete?q={query}',
      part_details: 'GET /api/part/{partNumber}'
    },
    technology_mapping: {
      'EA1/EA2': 'MACROCORE™',
      'ET9': 'ELIMTEK™ WATERBLOC™',
      'EL/EF/EH/EW': 'ELIMTEK™',
      'EC1': 'MICROKAPPA™'
    }
  });
});

// Endpoint de búsqueda GET
app.get('/api/search', async (req, res) => {
  try {
    const { q, query, page = 1, limit = 50 } = req.query;
    const searchQuery = q || query;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" or "query" is required',
        example: '/api/search?q=EA21234'
      });
    }

    // Buscar en MongoDB primero
    const mongoResults = await searchMongoDB(searchQuery, parseInt(page), parseInt(limit));
    
    // Si MongoDB no tiene resultados, buscar en Google Sheets
    let sheetsResults = [];
    if (mongoResults.results.length === 0 && sheetsConnected) {
      sheetsResults = await searchGoogleSheets(searchQuery);
    }

    const allResults = [...mongoResults.results, ...sheetsResults];

    res.json({
      success: true,
      query: searchQuery,
      timestamp: new Date().toISOString(),
      source: mongoResults.results.length > 0 ? 'mongodb' : 'sheets',
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: mongoResults.total || sheetsResults.length
      },
      schema: 'Master50',
      results: allResults
    });

  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Search failed'
    });
  }
});

// Endpoint de búsqueda POST
app.post('/api/search', async (req, res) => {
  try {
    const { query, page = 1, limit = 50 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const mongoResults = await searchMongoDB(query, parseInt(page), parseInt(limit));
    
    let sheetsResults = [];
    if (mongoResults.results.length === 0 && sheetsConnected) {
      sheetsResults = await searchGoogleSheets(query);
    }

    const allResults = [...mongoResults.results, ...sheetsResults];

    res.json({
      success: true,
      query,
      timestamp: new Date().toISOString(),
      source: mongoResults.results.length > 0 ? 'mongodb' : 'sheets',
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: mongoResults.total || sheetsResults.length
      },
      schema: 'Master50',
      results: allResults
    });

  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Autocomplete
app.get('/api/autocomplete', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    if (!productsCollection) {
      return res.json({ success: true, suggestions: [] });
    }

    const regex = new RegExp(`^${q}`, 'i');
    const results = await productsCollection
      .find({
        $or: [
          { '2_normsku': regex },
          { normsku: regex },
          { partNumber: regex }
        ]
      })
      .limit(10)
      .project({ '2_normsku': 1, '6_description': 1, normsku: 1, description: 1 })
      .toArray();

    const suggestions = results.map(r => ({
      value: r['2_normsku'] || r.normsku || r.partNumber,
      label: `${r['2_normsku'] || r.normsku} - ${r['6_description'] || r.description || 'Filter'}`
    }));

    res.json({ success: true, suggestions });

  } catch (error) {
    console.error('Autocomplete Error:', error);
    res.json({ success: true, suggestions: [] });
  }
});

// Detalles de Part Number (devuelve Master50 completo)
app.get('/api/part/:partNumber', async (req, res) => {
  try {
    const { partNumber } = req.params;

    if (!partNumber) {
      return res.status(400).json({
        success: false,
        error: 'Part number is required'
      });
    }

    if (!productsCollection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }

    const result = await productsCollection.findOne({ 
      $or: [
        { '2_normsku': new RegExp(`^${partNumber}$`, 'i') },
        { normsku: new RegExp(`^${partNumber}$`, 'i') },
        { partNumber: new RegExp(`^${partNumber}$`, 'i') }
      ]
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Part number not found',
        partNumber
      });
    }

    const master50 = generateMaster50(result, partNumber);

    res.json({
      success: true,
      partNumber,
      schema: 'Master50',
      data: master50
    });

  } catch (error) {
    console.error('Part Details Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch part details'
    });
  }
});

// ============================================
// 11. ERROR HANDLERS
// ============================================
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available: ['/health', '/api', '/api/search', '/api/autocomplete', '/api/part/:partNumber']
  });
});

// ============================================
// 12. INICIO DEL SERVIDOR
// ============================================
async function startServer() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  ELIMFILTERS v5.6 PRO API Server              ║');
  console.log('║  Master 50 Schema + Auto-Mapping Technology   ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');

  await connectMongoDB();
  await connectGoogleSheets();

  app.listen(PORT, () => {
    console.log('');
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`✓ Schema: Master 50 Columns (A:AX)`);
    console.log(`✓ MongoDB: ${productsCollection ? 'Connected' : 'Disconnected'}`);
    console.log(`✓ Sheets: ${sheetsConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`✓ Technology Mapping: ACTIVE`);
    console.log(`✓ Brand Shield: ENABLED`);
    console.log(`✓ Public URL: https://elimfilters-backend-v5-production.up.railway.app`);
    console.log('');
    console.log('════════════════════════════════════════════════');
  });
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received: closing connections...');
  if (mongoClient) await mongoClient.close();
  process.exit(0);
});
