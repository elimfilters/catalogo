const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 8080;

// Trust proxy - CRITICAL for Railway
app.set('trust proxy', true);

// Security
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
  console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + req.path);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    version: '8.0.0',
    timestamp: new Date().toISOString(),
    server: 'catalogo-production-9437.up.railway.app'
  });
});

// Root
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

// API Routes
let searchRoutes;
try {
  searchRoutes = require('./src/routes/search');
  app.use('/api/search', searchRoutes);
  console.log('SEARCH ROUTES LOADED');
} catch (error) {
  console.error('SEARCH ROUTES ERROR:', error.message);
  try {
    const detectRoutes = require('./src/api/detect');
    app.use('/api/search', detectRoutes);
    console.log('USING DETECT FALLBACK');
  } catch (fallbackError) {
    console.error('NO SEARCH ROUTES AVAILABLE');
  }
}

try {
  const vinRoutes = require('./src/api/vin');
  app.use('/api/vin', vinRoutes);
  console.log('VIN ROUTES LOADED');
} catch (error) {
  console.log('VIN ROUTES NOT AVAILABLE');
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'Route ' + req.method + ' ' + req.path + ' not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'INTERNAL_ERROR',
    message: err.message || 'Internal server error'
  });
});

// Server start
app.listen(PORT, () => {
  console.log('');
  console.log('ELIMFILTERS API v8.0.0 - PRODUCTION');
  console.log('Port: ' + PORT);
  console.log('URL: catalogo-production-9437.up.railway.app');
  console.log('WordPress: elimfilters.com/part-search/');
  console.log('Env: ' + (process.env.NODE_ENV || 'development'));
  console.log('Ready');
  console.log('');
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

module.exports = app;
