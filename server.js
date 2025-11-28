// =============================================
//  ELIMFILTERS API SERVER - v5.0.0
//  Production-Ready Architecture
// =============================================

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Route imports
const detectRoute = require('./src/api/detect');
const vinRoute = require('./src/api/vin');

// =============================================
//  APP CONFIGURATION
// =============================================
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Request logging
app.use((req, res, next) => {
    console.log(`➡️  ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// =============================================
//  API ROUTES
// =============================================
app.use('/api/detect', detectRoute);
app.use('/api/vin', vinRoute);

// =============================================
//  ROOT ENDPOINT
// =============================================
app.get('/', (req, res) => {
    res.json({
        status: "online",
        version: "5.0.0",
        service: "ELIMFILTERS API",
        endpoints: {
            filter_detection: "/api/detect/:code",
            search: "/api/detect/search?q=",
            vin_decode: "/api/vin/:code"
        },
        documentation: "https://docs.elimfilters.com"
    });
});

// =============================================
//  HEALTH CHECK - Required by Railway
// =============================================
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        version: '5.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// =============================================
//  ERROR HANDLING
// =============================================
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// =============================================
//  START SERVER
// =============================================
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   🚀 ELIMFILTERS API v5.0.0               ║
║   📡 Running on port ${PORT}                  ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'}         ║
╚════════════════════════════════════════════╝
    `);
});

module.exports = app;
