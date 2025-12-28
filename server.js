// ELIMFILTERS v5.5 - Production API Server
// Railway Deployment Configuration
// Integración con GEMA v8.7 + WordPress Plugin

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 1. CONFIGURACIÓN CORS (REQUERIMIENTO #2)
// ============================================
const corsOptions = {
  origin: [
    'https://elimfilters.com',
    'https://www.elimfilters.com',
    'http://localhost:3000' // Para pruebas locales
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Middleware para forzar HTTPS (REQUERIMIENTO #3)
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// ============================================
// 2. CONFIGURACIÓN GEMA API v8.7
// ============================================
const GEMA_CONFIG = {
  baseURL: process.env.GEMA_API_URL || 'https://api.gema.example.com/v8.7',
  token: process.env.GEMA_API_TOKEN || 'ELIM-GEMA-CORE-2025-V87-SECURE',
  timeout: parseInt(process.env.GEMA_TIMEOUT) || 15000
};

const gemaClient = axios.create({
  baseURL: GEMA_CONFIG.baseURL,
  timeout: GEMA_CONFIG.timeout,
  headers: {
    'Authorization': `Bearer ${GEMA_CONFIG.token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// ============================================
// 3. MAPEO DE DATOS (REQUERIMIENTO #4)
// ============================================
function mapGemaToElimfilters(gemaData) {
  if (!gemaData || !gemaData.results) {
    return {
      equipment: [],
      oemCross: [],
      crossReference: [],
      kits: []
    };
  }

  const mapped = {
    equipment: [],
    oemCross: [],
    crossReference: [],
    kits: []
  };

  gemaData.results.forEach(item => {
    // Equipment Data
    if (item.type === 'equipment' || item.category === 'equipment') {
      mapped.equipment.push({
        id: item.id || item.equipment_id,
        partNumber: item.part_number || item.partNumber,
        description: item.description,
        mediaType: applyBranding(item.media_type || item.mediaType),
        specifications: item.specifications || {},
        images: item.images || [],
        stock: item.stock_status || 'Available',
        price: item.price || null
      });
    }

    // OEM Cross Reference
    if (item.type === 'oem_cross' || item.oem_references) {
      mapped.oemCross.push({
        id: item.id,
        elimPartNumber: item.elim_part || item.elimPartNumber,
        oemPartNumber: item.oem_part || item.oemPartNumber,
        manufacturer: item.manufacturer || item.oem_manufacturer,
        mediaType: applyBranding(item.media_type || item.mediaType),
        interchangeable: item.interchangeable !== false
      });
    }

    // Cross Reference (Competidores)
    if (item.type === 'cross_reference' || item.competitor_references) {
      mapped.crossReference.push({
        id: item.id,
        elimPartNumber: item.elim_part || item.elimPartNumber,
        competitorPart: item.competitor_part || item.competitorPartNumber,
        competitorBrand: item.competitor_brand || item.competitorBrand,
        mediaType: applyBranding(item.media_type || item.mediaType),
        notes: item.notes || ''
      });
    }

    // Kits
    if (item.type === 'kit' || item.is_kit) {
      mapped.kits.push({
        id: item.id,
        kitNumber: item.kit_number || item.kitNumber,
        kitName: item.kit_name || item.name,
        components: item.components || item.parts || [],
        mediaType: applyBranding(item.media_type || item.mediaType),
        totalPrice: item.total_price || item.price,
        description: item.description || ''
      });
    }
  });

  return mapped;
}

// Aplicar branding ELIMTEK™ (REQUERIMIENTO #4 - Branding)
function applyBranding(mediaType) {
  if (!mediaType) return 'ELIMTEK™ Standard';
  
  const brandingMap = {
    'multicore': 'ELIMTEK™ MultiCore',
    'standard': 'ELIMTEK™ Standard',
    'premium': 'ELIMTEK™ Premium',
    'industrial': 'ELIMTEK™ Industrial',
    'hd': 'ELIMTEK™ Heavy Duty',
    'heavyduty': 'ELIMTEK™ Heavy Duty'
  };

  const normalized = mediaType.toLowerCase().replace(/\s+/g, '');
  return brandingMap[normalized] || `ELIMTEK™ ${mediaType}`;
}

// ============================================
// 4. ENDPOINTS API
// ============================================

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    version: '5.5',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// API Info endpoint (para documentación rápida)
app.get('/api', (req, res) => {
  res.json({
    success: true,
    version: '5.5',
    endpoints: {
      health: {
        method: 'GET',
        path: '/health',
        description: 'Health check endpoint'
      },
      search_post: {
        method: 'POST',
        path: '/api/search',
        description: 'Search catalog (requires JSON body with "query" field)',
        example: {
          query: 'filter',
          filters: {},
          page: 1,
          limit: 50
        }
      },
      search_get: {
        method: 'GET',
        path: '/api/search?q={query}',
        description: 'Search catalog via GET (for testing)',
        example: '/api/search?q=filter&page=1&limit=10'
      },
      autocomplete: {
        method: 'GET',
        path: '/api/autocomplete?q={query}',
        description: 'Get autocomplete suggestions',
        example: '/api/autocomplete?q=filt'
      },
      part_details: {
        method: 'GET',
        path: '/api/part/{partNumber}',
        description: 'Get details for specific part number',
        example: '/api/part/EF-12345'
      }
    },
    documentation: 'https://elimfilters.com/api-docs'
  });
});

// Endpoint principal de búsqueda (REQUERIMIENTO #1)
// Soporta tanto POST como GET
app.post('/api/search', async (req, res) => {
  try {
    const { query, filters, page = 1, limit = 50 } = req.body;

    // Validación de entrada
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required',
        code: 'INVALID_QUERY'
      });
    }

    // Llamada a GEMA API
    const gemaResponse = await gemaClient.post('/search', {
      search_term: query,
      filters: filters || {},
      pagination: {
        page: parseInt(page),
        per_page: parseInt(limit)
      }
    });

    // Mapeo de datos
    const mappedData = mapGemaToElimfilters(gemaResponse.data);

    // Respuesta exitosa
    res.json({
      success: true,
      query: query,
      timestamp: new Date().toISOString(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: gemaResponse.data.total || 0
      },
      data: mappedData
    });

  } catch (error) {
    console.error('Search Error:', error.message);
    
    // Manejo de errores de GEMA API
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: 'GEMA API Error',
        message: error.response.data?.message || 'External API error',
        code: 'GEMA_API_ERROR'
      });
    }

    // Error de timeout
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        error: 'Request timeout',
        message: 'GEMA API did not respond in time',
        code: 'TIMEOUT'
      });
    }

    // Error genérico
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET version del endpoint de búsqueda (para testing fácil)
app.get('/api/search', async (req, res) => {
  try {
    const { q, query, page = 1, limit = 50 } = req.query;
    const searchQuery = q || query;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" or "query" is required',
        code: 'INVALID_QUERY',
        example: '/api/search?q=filter'
      });
    }

    // Llamada a GEMA API
    const gemaResponse = await gemaClient.post('/search', {
      search_term: searchQuery,
      filters: {},
      pagination: {
        page: parseInt(page),
        per_page: parseInt(limit)
      }
    });

    // Mapeo de datos
    const mappedData = mapGemaToElimfilters(gemaResponse.data);

    // Respuesta exitosa
    res.json({
      success: true,
      query: searchQuery,
      timestamp: new Date().toISOString(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: gemaResponse.data.total || 0
      },
      data: mappedData
    });

  } catch (error) {
    console.error('Search Error:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: 'GEMA API Error',
        message: error.response.data?.message || 'External API error',
        code: 'GEMA_API_ERROR'
      });
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        error: 'Request timeout',
        message: 'GEMA API did not respond in time',
        code: 'TIMEOUT'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Endpoint de detalles por Part Number
app.get('/api/part/:partNumber', async (req, res) => {
  try {
    const { partNumber } = req.params;

    if (!partNumber || partNumber.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Part number is required',
        code: 'INVALID_PART_NUMBER',
        example: '/api/part/EF-12345'
      });
    }

    // Llamada a GEMA API para obtener detalles del part number
    const gemaResponse = await gemaClient.get(`/parts/${partNumber}`);
    const mappedData = mapGemaToElimfilters({ results: [gemaResponse.data] });

    res.json({
      success: true,
      partNumber: partNumber,
      data: mappedData
    });

  } catch (error) {
    console.error('Part Details Error:', error.message);
    
    // Si el part number no existe en GEMA
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Part number not found',
        partNumber: req.params.partNumber,
        code: 'PART_NOT_FOUND',
        message: 'This part number does not exist in the catalog'
      });
    }

    // Otros errores
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch part details',
      partNumber: req.params.partNumber,
      code: 'PART_FETCH_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// Endpoint de autocomplete
app.get('/api/autocomplete', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const gemaResponse = await gemaClient.get('/autocomplete', {
      params: { query: q, limit: 10 }
    });

    res.json({
      success: true,
      suggestions: gemaResponse.data.suggestions || []
    });

  } catch (error) {
    console.error('Autocomplete Error:', error.message);
    res.json({ success: true, suggestions: [] });
  }
});

// ============================================
// 5. MANEJO DE ERRORES GLOBAL
// ============================================
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'UNHANDLED_ERROR'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// ============================================
// 6. INICIO DEL SERVIDOR
// ============================================
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  ELIMFILTERS v5.5 API Server               ║');
  console.log('║  Railway Production Deployment             ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`✓ CORS enabled for elimfilters.com`);
  console.log(`✓ GEMA API v8.7 integration active`);
  console.log(`✓ Public endpoint: https://elimfilters-backend-v5-production.up.railway.app`);
  console.log('');
  console.log('═══════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});
