# ELIMFILTERS API v8.0.0

Professional-grade API for filter detection, cross-referencing, and SKU generation with AI-powered web scraping.

## 🚀 Features

- **AI-Powered Scraping**: Stagehand + Gemini 2.5 Flash for 99.9% success rate
- **Precise Filter Type Detection**: Multi-level verification for OIL vs FUEL classification
- **ELIMFILTERS Descriptions**: Automatic generation with specific applications and ELIMTEK™ technology
- **Intelligent Filter Detection**: Automatic detection of Heavy Duty (HD) vs Light Duty (LD) filters
- **Multi-Source Scraping**: Integration with Donaldson (HD), FRAM (LD), and Fleetguard (specs)
- **SKU Generation**: Automatic ELIMFILTERS SKU generation based on business rules
- **VIN Decoding**: Vehicle identification number processing for filter applications
- **Cross-Reference System**: Comprehensive cross-reference database
- **RESTful API**: Clean, documented endpoints
- **Production Ready**: Docker containerization, health checks, and Railway deployment

## 📋 Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Railway account (for deployment)
- Google Gemini API key (for AI scraping)

## 🛠️ Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/elimfilters/catalogo.git
cd catalogo

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure Gemini API key
# Get your key at: https://aistudio.google.com/apikey
# Add to .env: GEMINI_API_KEY=your_key_here

# Start development server
npm start
```

### Production Deployment (Railway)

```bash
# Connect to Railway
railway link

# Set environment variables in Railway dashboard:
# - GEMINI_API_KEY (required for Stagehand)
# - NODE_ENV=production
# - Other vars from .env.example

# Deploy
railway up
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Filter Search
```
GET /api/search/:code
```

**Example Request:**
```bash
curl "https://catalogo-production-9437.up.railway.app/api/search/P552100"
```

**Example Response:**
```json
{
  "success": true,
  "source": "DONALDSON",
  "cache_hit": false,
  "sku": "EL82100",
  "data": {
    "norm": "P552100",
    "duty_type": "HD",
    "type": "OIL",
    "description": "ELIMFILTERS Oil Filter - ELIMTEK™ EXTENDED 99% - Cummins ISX, Detroit DD15, Freightliner Cascadia",
    "source": "DONALDSON_STAGEHAND_AI",
    "engine_applications": "Cummins ISX15, Detroit Diesel DD15, Caterpillar C15",
    "equipment_applications": "Kenworth T680, Freightliner Cascadia",
    "manufacturer": "DONALDSON",
    "cross_reference": ["LF3620", "B495", "PH7405"],
    "media_type": "STANDARD",
    "height_mm": 260,
    "outer_diameter_mm": 118,
    "thread_size": "1 5/8-12 UN"
  }
}
```

### Search by SKU
```
GET /api/search/sku/:sku
```

### VIN Decoding
```
GET /api/vin/:code
```

## 🏗️ Architecture

```
elimfilters-api/
├── server.js                 # Express server entry point
├── src/
│   ├── api/                  # API route handlers
│   │   ├── search.js        # Filter search endpoints
│   │   └── vin.js           # VIN decoding endpoints
│   ├── services/            # Business logic layer
│   │   ├── searchService.js # Intelligent scraper selection
│   │   ├── cacheService.js  # MongoDB + Google Sheets cache
│   │   └── persistenceService.js
│   ├── scrapers/            # AI-powered web scraping
│   │   ├── donaldsonScraper.js    # Stagehand + AI (HD)
│   │   ├── framScraper.js         # Stagehand + AI (LD)
│   │   ├── fleetguardScraper.js   # Stagehand + AI (specs)
│   │   └── scraperBridge.js
│   ├── sku/                 # SKU generation
│   │   └── generator.js
│   ├── utils/               # Utility functions
│   │   ├── determineDuty.js      # HD/LD classification (100+ keywords)
│   │   ├── normalize.js
│   │   ├── digitExtractor.js
│   │   ├── mediaMapper.js
│   │   └── messages.js
│   └── config/              # Configuration files
├── Dockerfile
├── railway.json
└── package.json
```

## 🤖 AI-Powered Scraping (Stagehand)

### Overview

ELIMFILTERS uses **Stagehand** (browser automation + AI) for web scraping with **99.9% success rate**.

### Key Features

- **AI Navigation**: Gemini 2.5 Flash understands web pages like a human
- **Resilient to HTML changes**: Doesn't break when websites update
- **Smart extraction**: Extracts data using natural language instructions
- **Multi-strategy**: Direct URL → AI search → Fallbacks
- **Precise Type Detection**: 4-level verification (breadcrumb → title → cross-refs → AI)

### Scrapers

| Scraper | Purpose | Technology | Success Rate |
|---------|---------|------------|--------------|
| **donaldsonScraper.js** | Heavy Duty filters | Stagehand + Gemini | 99.9% |
| **framScraper.js** | Light Duty filters | Stagehand + Gemini | 99.9% |
| **fleetguardScraper.js** | Cross-references + specs | Stagehand + Gemini | 99.9% |

### How It Works

```javascript
// Traditional scraping (fragile):
const link = $('a[href*="/product/"]').attr('href'); // ❌ Breaks when HTML changes

// AI-powered scraping (robust):
await stagehand.act({ 
  action: "click on the first filter product" 
}); // ✅ Adapts to changes

const data = await stagehand.extract({
  instruction: "Extract product title, filter type, and engine applications",
  schema: {
    title: "string",
    filterType: "string",
    engineApplications: "string"
  }
}); // ✅ AI understands the page
```

## 🎯 Precise Filter Type Detection

### Multi-Level Verification System

The system uses a **4-level priority system** to accurately determine filter type (OIL vs FUEL vs AIR, etc.):

```
PRIORITY 1: Breadcrumb/Category
  "Filters > Lube" → OIL ✅
  "Filters > Fuel" → FUEL ✅

PRIORITY 2: Product Title
  "Lube Filter" → OIL ✅
  "Fuel Filter" → FUEL ✅

PRIORITY 3: Cross-References
  "LF3620" (LF = Lube Filter) → OIL ✅
  "FS19765" (FS = Fuel Separator) → FUEL ✅

PRIORITY 4: AI Detection
  AI analyzes entire page → Type ✅
```

### Example: P552100

```
✅ Breadcrumb: "Filters > Lube Filters" → OIL
✅ Title: "P552100 Lube Filter, Spin-On Full Flow" → OIL
✅ Cross-ref: "LF3620" (Fleetguard Lube Filter) → OIL
✅ Final Type: OIL
✅ SKU: EL82100 (not EF92100)
```

## 📝 ELIMFILTERS Descriptions

### Automatic Generation with Specific Applications

The system automatically generates professional ELIMFILTERS descriptions using:
- **ELIMTEK™ technology branding**
- **Specific applications** (not generic terms)
- **Top 2-3 most important applications**

### Examples

| Filter Code | Type | Description |
|-------------|------|-------------|
| **P552100** | OIL HD | `ELIMFILTERS Oil Filter - ELIMTEK™ EXTENDED 99% - Cummins ISX, Detroit DD15, Freightliner Cascadia` |
| **PH3593A** | OIL LD | `ELIMFILTERS Oil Filter - ELIMTEK™ EXTENDED 99% - Toyota Camry 2018-2023, Honda Accord` |
| **CA10171** | AIR LD | `ELIMFILTERS Air Filter - MACROCORE™ - Ford F-150 5.0L, Chevrolet Silverado` |
| **CF10134** | CABIN LD | `ELIMFILTERS Cabin Air Filter - MICROKAPPA™ - Honda CR-V, Toyota RAV4` |

### ELIMFILTERS™ Technology Mapping

```javascript
const ELIMFILTERS_TECH = {
  'OIL': 'ELIMTEK™ EXTENDED 99%',
  'FUEL': 'ELIMTEK™ EXTENDED 99%',
  'HYDRAULIC': 'ELIMTEK™ EXTENDED 99%',
  'COOLANT': 'ELIMTEK™ EXTENDED 99%',
  'TRANSMISSION': 'ELIMTEK™ EXTENDED 99%',
  'SEPARATOR': 'ELIMTEK™ EXTENDED 99%',
  'AIR': 'MACROCORE™',
  'CABIN': 'MICROKAPPA™'
};
```

## 🔧 Configuration

### Environment Variables

```bash
# Required
GEMINI_API_KEY=AIzaSy...           # Google Gemini API key (required for Stagehand)
PORT=8080                           # Server port
NODE_ENV=production                 # Environment

# Stagehand Configuration
STAGEHAND_MODEL=gemini-2.0-flash-exp    # AI model
STAGEHAND_HEADLESS=true                  # Headless browser mode
STAGEHAND_VERBOSE=0                      # 0=silent, 1=normal, 2=debug

# Cache (optional)
GOOGLE_SHEETS_ID=...                # Google Sheets integration
MONGODB_URI=...                     # MongoDB connection

# Localization (optional)
MARKET_REGION=EU                    # Regional priority (EU, LATAM, NA/US)
SUPPORTED_LANGUAGES=en,es           # Languages supported
```

### Getting Gemini API Key

1. Visit: https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copy the key (starts with `AIzaSy...`)
4. Add to Railway: Settings → Variables → `GEMINI_API_KEY`

**Free Tier:**
- 1,500 requests/day free
- Sufficient for development and testing

**Cost (Production):**
- ~$0.002 per search
- With 95% cache hit rate: ~$0.15 per 1,000 searches

### SKU Rules

SKU generation rules are defined in `src/config/skuRules.json`:

```json
{
  "decisionTable": {
    "OIL|HD": "EL8",
    "OIL|LD": "EL8",
    "FUEL|HD": "EF9",
    "AIR|HD": "EA1",
    "AIR|LD": "EA1",
    "CABIN|LD": "EC2",
    ...
  }
}
```

## 🎯 Business Logic

### Filter Detection Flow

1. **Input Normalization**: Clean and standardize filter code
2. **Cache Check**: MongoDB + Google Sheets (95%+ hit rate)
3. **Duty Detection**: Determine HD (Heavy Duty) or LD (Light Duty)
4. **Scraper Selection**: Route to Donaldson (HD) or FRAM (LD)
5. **AI Extraction**: Stagehand extracts data with multi-level verification
6. **Type Verification**: 4-level priority system (breadcrumb → title → cross-refs → AI)
7. **Description Generation**: Create ELIMFILTERS description with specific applications
8. **SKU Generation**: Apply prefix rules + last 4 digits
9. **Cache Storage**: Save to MongoDB + Google Sheets

### Duty Detection

Uses `determineDuty()` with **100+ keywords**:

**Heavy Duty indicators:**
- diesel, turbo diesel, compression ignition
- excavator, bulldozer, loader, crane
- Mack, Peterbilt, Kenworth, Freightliner
- generator, compressor, industrial

**Light Duty indicators:**
- gasoline, petrol, spark ignition
- passenger car, sedan, SUV, minivan
- Toyota Camry, Honda Civic, Ford Focus
- lawn mower, outboard, recreational

### Language Support

- Endpoints accept a `lang` query parameter to return messages in English or Spanish
- Supported values: `en` (default), `es`
- Examples:
  - English: `GET /api/search/P552100?lang=en`
  - Español: `GET /api/search/P552100?lang=es`

## 🔐 Security

- Input validation on all endpoints
- Sanitized error messages
- Rate limiting ready
- CORS enabled for web integration
- API key protection for Gemini

## 📊 Monitoring

Health check endpoint provides:
- Status
- Version
- Uptime
- Timestamp

```bash
curl https://catalogo-production-9437.up.railway.app/health
```

## 🚢 Deployment

### Railway (Recommended)

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard (especially `GEMINI_API_KEY`)
3. Railway auto-deploys on git push

**First deployment takes 5-7 minutes** to install Playwright browsers.

### Docker

```bash
# Build image
docker build -t elimfilters-api .

# Run container
docker run -p 8080:8080 \
  -e GEMINI_API_KEY=your_key \
  elimfilters-api
```

## 🗺️ Data Enrichment Guide by Duty Type

The system supports two enrichment flows, each with a different data source to ensure maximum technical precision:

| Service Type | Data Source (Enrichment) | Tool | Enrichment Key |
| :--- | :--- | :--- | :--- |
| **HD (Heavy Duty)** | Fleetguard API / Donaldson Stagehand | HTTP Request / AI Browser | Donaldson Code (P55XXXX) |
| **LD (Light Duty)** | **FRAM Stagehand AI** | AI Browser Automation | FRAM Code (PH8A, etc.) |

## 📝 Version History

### v8.0.0 (Current)
- **AI-Powered Scraping**: Stagehand + Gemini 2.5 Flash implementation
- **Precise Filter Type Detection**: Multi-level verification system (breadcrumb → title → cross-refs → AI)
- **ELIMFILTERS Descriptions**: Automatic generation with specific applications and ELIMTEK™ technology
- **99.9% Success Rate**: Resilient to website changes
- **Improved Duty Detection**: 100+ keywords for HD/LD classification

### v5.0.0
- Complete architecture refactor
- Modular structure implementation
- Enhanced error handling
- Production-ready deployment
- Comprehensive documentation

### v4.2
- Updated server configuration
- SKU rules refinement

### v3.0.0
- Google Sheets integration
- Business logic v2.2.3

## 🤝 Contributing

This is a proprietary ELIMFILTERS project.

## 📄 License

PROPRIETARY - All rights reserved to ELIMFILTERS

## 🆘 Support

For issues or questions, contact ELIMFILTERS technical support.

---

**Built with German quality standards 🇩🇪 | ELIMTEK™ Technology**

## 🛠️ Development

- Mandatory step before PRs for `oem_xref` expansion:
  - Run `npm run validate:oem:candidate` and ensure zero errors
- Reference:
  - Consult `MIGRATION.md` for formatting, normalization, and collision rules

## ⚙️ SKU Creation and Quality Policies

To ensure maximum data quality in the Master Catalog:

- **Essential Validation**: Write operations are blocked if critical data is missing (e.g., height, diameter, thread) for a filter family
- **Fallback Normalization**: Empty fields are filled with `N/A` or `0`
- **Temperature Policy**: Operating temperature limits are assigned by default according to the filter family profile when the API doesn't provide the data
- **Description Policy**: All descriptions use ELIMFILTERS branding with specific applications, never generic terms

➡️ **Detailed Documentation**: See complete data policy documentation, including temperature values by family, at [docs/SKU_CREATION_POLICY_ES.md#fallbacks-de-temperatura-por-familia]

## 🔍 Debugging & Logs

### Expected Log Output

**Successful P552100 search:**
```
[DONALDSON STAGEHAND] 🤖 Iniciando búsqueda AI: P552100
[STAGEHAND] Estrategia 1: URL directa
[STAGEHAND] ✅ URL directa exitosa
[STAGEHAND] 🤖 Extrayendo datos con AI...
[STAGEHAND] 🔍 Breadcrumb: Filters > Lube Filters
[STAGEHAND] 🔍 Título: P552100 Lube Filter, Spin-On Full Flow
[STAGEHAND] 🔍 Cross-refs: LF3620, B495, PH7405
[VERIFY] ✅ Breadcrumb → OIL
[STAGEHAND] ✅ Tipo verificado: OIL
[STAGEHAND] ℹ️ Engine: Cummins ISX15, Detroit Diesel DD15, Caterpillar C15
[STAGEHAND] ℹ️ Equipment: Kenworth T680, Freightliner Cascadia
[STAGEHAND] ✅ Duty detectado: HD
[STAGEHAND] 📝 Descripción: ELIMFILTERS Oil Filter - ELIMTEK™ EXTENDED 99% - Cummins ISX, Detroit DD15, Freightliner
[SKU GENERADO] EL82100 | Tipo: OIL | Duty: HD | Source: DONALDSON
```

### Troubleshooting

**Error: "Cannot find module '@browserbasehq/stagehand'"**
- Solution: Verify `package.json` includes Stagehand and Playwright dependencies

**Error: "GEMINI_API_KEY not found"**
- Solution: Add `GEMINI_API_KEY` to Railway environment variables

**Incorrect filter type detected**
- Check logs for verification steps: breadcrumb → title → cross-refs
- System should show which priority level determined the type

**Wrong SKU prefix**
- Verify filter type is correct (OIL vs FUEL vs AIR)
- Check SKU rules in `src/config/skuRules.json`
