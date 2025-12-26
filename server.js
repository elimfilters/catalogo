'use strict';

/* =============================================================================
   ELIMFILTERS API — SERVER
   Versión: 5.0.2
   Node.js: 20.x
   Puerto: 8080 (FIJO)
============================================================================= */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// =============================================================================
//  VALIDACIÓN DE ENTORNO (FAIL FAST)
// =============================================================================

if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64) {
  console.error('❌ Missing ENV: GOOGLE_SERVICE_ACCOUNT_KEY_BASE64');
  process.exit(1);
}

// =============================================================================
//  GOOGLE SERVICE ACCOUNT (SEGURO + BLINDADO)
// =============================================================================

let googleServiceAccount;

try {
  const decoded = Buffer
    .from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64, 'base64')
    .toString('utf-8');

  googleServiceAccount = JSON.parse(decoded);

  if (
    !googleServiceAccount.client_email ||
    !googleServiceAccount.private_key
  ) {
    throw new Error('Invalid Google Service Account structure');
  }

  console.log('✅ Google Sheets API inicializada correctamente');
  console.log('Client email:', googleServiceAccount.client_email);
  console.log('Private key presente:', true);

} catch (err) {
  console.error('❌ Error loading Google Service Account:', err.message);
  process.exit(1);
}

// =============================================================================
//  APP INIT
// =============================================================================

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// =============================================================================
//  HEALTH CHECK
// =============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'ELIMFILTERS API',
    version: '5.0.2',
    environment: process.env.NODE_ENV || 'production',
    googleSheets: 'ENABLED'
  });
});

// =============================================================================
//  ROUTES (ACTIVA LAS QUE YA TENGAS)
// =============================================================================

// Ejemplos:
// const searchRoutes = require('./routes/search');
// app.use('/search', searchRoutes);

// const processRoutes = require('./routes/process');
// app.use('/api/process', processRoutes);

// const exportRoutes = require('./routes/export');
// app.use('/api/export/sheets', exportRoutes);

// =============================================================================
//  404 FALLBACK
// =============================================================================

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// =============================================================================
//  START SERVER (PORT 8080 FIJO)
// =============================================================================

const PORT = 8080;

app.listen(PORT, () => {
  console.log('────────────────────────────────────────────────────────');
  console.log('🚀 ELIMFILTERS API v5.0.2');
  console.log(`📡 Running on port ${PORT}`);
  console.log(`🌎 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log('📍 Health: http://localhost:8080/health');
  console.log('────────────────────────────────────────────────────────');
});
