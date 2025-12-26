// ============================================================================
// ELIMFILTERS API v8.0.0 - SERVER
// Production URL: catalogo-production-9437.up.railway.app
// Integration: https://elimfilters.com/part-search/
// ============================================================================

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 8080;

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet());
app.use(compression());

app.use(cors({
  origin: [
    'https://elimfilters.com',
    'https://www.elimfilters.com',
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests', message: 'Please try again later' }
});
app.use('/api/', limiter);

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    version: '8.0.0',
    timestamp: new Date().toISOString(),
    server: 'catalogo-production-9437.up.railway.app'
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'ELIMFILTERS API',
    version: '8.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      search: '/api/search/:codigo',
      searchPost: 'POST /api/search'
    }
  });
});

let searchRoutes;
try {
  searchRoutes = require('./src/routes/search');
  app.use('/api/search', searchRoutes);
  console.log('✅ Search routes loaded');
} catch (error) {
  console.error('⚠️ Search routes not available:', error.message);
  try {
    const detectRoutes = require('./src/api/detect');
    app.use('/api/search', detectRoutes);
    console.log('✅ Using detect routes as fallback');
  } catch (fallbackError) {
    console.error('❌ No search routes available');
  }
}

try {
  const vinRoutes = require('./src/api/vin');
  app.use('/api/vin', vinRoutes);
  console.log('✅ VIN routes loaded');
} catch (error) {
  console.log('ℹ️ VIN routes not available');
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Global error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'INTERNAL_ERROR',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   ELIMFILTERS API v8.0.0 - PRODUCTION    ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🌐 URL: catalogo-production-9437.up.railway.app`);
  console.log(`🔗 WordPress: elimfilters.com/part-search/`);
  console.log(`📊 Env: ${process.env.NODE_ENV || 'development'}`);
  console.log('✅ Ready');
  console.log('');
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

module.exports = app;
