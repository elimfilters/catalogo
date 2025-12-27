ELIMFILTERS API v8.0.0 - ARCHITECTURE
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT REQUESTS                          │
│  (WordPress Plugin, Web Apps, Mobile Apps, External Systems)   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP/HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXPRESS SERVER (server.js)                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Middleware Stack:                                        │ │
│  │  • CORS                                                   │ │
│  │  • Body Parser (JSON/URLencoded)                         │ │
│  │  • Morgan Logger                                         │ │
│  │  • Request Logging                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │  /health │  │   /api   │  │    /     │
    │          │  │ /search  │  │  (root)  │
    └──────────┘  └────┬─────┘  └──────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
   ┌──────────┐              ┌──────────┐
   │  search  │              │   vin    │
   │  router  │              │  router  │
   └────┬─────┘              └────┬─────┘
        │                         │
        │                         │
        ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  searchService.js (ORQUESTADOR PRINCIPAL)                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  FLUJO UNIFICADO:                                    │ │ │
│  │  │  1. Búsqueda en Caché (Sheets + MongoDB)            │ │ │
│  │  │  2. Normalización del Código                        │ │ │
│  │  │  3. Identificación Duty (HD/LD) - DINÁMICA          │ │ │
│  │  │  4. Scraping Simultáneo (Donaldson + FRAM)          │ │ │
│  │  │  5. Fallback Global (Fabricantes Worldwide)         │ │ │
│  │  │  6. Detección Tipo Filtro (Multilenguaje)           │ │ │
│  │  │  7. Extracción Completa de Especificaciones         │ │ │
│  │  │  8. Mapeo Tecnología ELIMFILTERS ✨                 │ │ │
│  │  │  9. Generación SKU                                  │ │ │
│  │  │  10. Persistencia Dual (Sheets + MongoDB)           │ │ │
│  │  │  11. Respuesta Enriquecida                          │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  vinService.js                                            │ │
│  │  └─ VIN Decoding & Vehicle Information                   │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Cache     │  │  Scraper    │  │     SKU     │
│   Layer     │  │   System    │  │  Generator  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       │                │                │
       │                ▼                │
       │         ┌──────────────┐        │
       │         │  Technology  │        │
       │         │   Mapper     │        │
       │         │ ✨ELIMFILTERS│        │
       │         └──────┬───────┘        │
       │                │                │
┌──────┴──────┐         │         ┌──────┴──────────┐
│             │         │         │                  │
▼             ▼         ▼         ▼                  ▼
┌────────┐ ┌────────┐ ┌───────┐ ┌──────┐  ┌───────────────┐
│ Sheets │ │MongoDB │ │  HD   │ │  LD  │  │ Type Detector │
│ Cache  │ │ Cache  │ │(DON)  │ │(FRAM)│  │(Multilenguaje)│
└────────┘ └────────┘ └───┬───┘ └───┬──┘  └───────────────┘
                          │         │
                          │         │
                          ▼         ▼
                    ┌─────────────────────┐
                    │  Global Scrapers    │
                    │  ┌───────────────┐  │
                    │  │ WIX           │  │
                    │  │ BALDWIN       │  │
                    │  │ FLEETGUARD    │  │
                    │  │ MANN          │  │
                    │  │ MAHLE         │  │
                    │  │ PARKER/RACOR  │  │
                    │  │ PALL          │  │
                    │  │ HYDAC         │  │
                    │  │ + 50+ más     │  │
                    │  └───────────────┘  │
                    └─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Google Sheets Master (70+ columnas)                      │ │
│  │  • SKU, query, norm, duty_type, type, subtype            │ │
│  │  • oem_codes, cross_reference                            │ │
│  │  • Dimensiones físicas (height, diameter, thread)        │ │
│  │  • Especificaciones filtración (micron, beta, ISO)       │ │
│  │  • Condiciones operativas (temp, presión)                │ │
│  │  • Especificaciones por tipo (oil, fuel, air, etc)       │ │
│  │  • Materiales y construcción                             │ │
│  │  • Estándares y certificaciones                          │ │
│  │  • Tecnología ELIMFILTERS (mapeada) ✨                   │ │
│  │  • Metadata completa                                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  MongoDB Atlas                                            │ │
│  │  • Queries rápidas                                        │ │
│  │  • Indexación por: sku, code_client, oem_codes           │ │
│  │  • Búsqueda full-text en cross_references                │ │
│  │  • Agregaciones por tipo/fabricante                      │ │
│  │  • Tecnología ELIMFILTERS indexada ✨                    │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘


DATA FLOW EXAMPLE - BÚSQUEDA CON MAPEO DE TECNOLOGÍA:
═══════════════════════════════════════════════════════════════

1. REQUEST
   GET /api/search/P552100
   
2. CACHÉ CHECK (PRIORIDAD MÁXIMA)
   ┌─ Google Sheets: Buscar "P552100" en columnas:
   │  • sku, query, norm, oem_codes, cross_reference
   └─ MongoDB: Buscar en índices
   
   SI ENCONTRADO → RETORNAR INMEDIATAMENTE ✅
   SI NO ENCONTRADO → Continuar ⬇️

3. NORMALIZACIÓN
   "P552100" → "P552100" (ya limpio)
   Validación: ✅ Caracteres permitidos
   
4. IDENTIFICACIÓN DUTY (DINÁMICA)
   ┌─ MÉTODO 1: Scraping Simultáneo
   │  • Donaldson: ¿Lo fabrica? → SÍ ✅ → duty = "HD"
   │  • FRAM: ¿Lo fabrica? → No
   │
   └─ RESULTADO: duty = "HD", source = "DONALDSON"

5. SCRAPING DONALDSON (COMPLETO)
   URL: https://shop.donaldson.com/store/es-us/search?text=P552100
   
   a) Extracción Product Link:
      /store/es-us/product/P552100/20823
   
   b) Scraping Página Producto:
      URL: https://shop.donaldson.com/store/es-us/product/P552100/20823
      
   c) Extracción COMPLETA (70+ campos):
      ┌─ IDENTIFICACIÓN:
      │  • codigo_donaldson: "P552100"
      │  • breadcrumb: "Moteur et véhicule > Huile > Filtres"
      │  • titulo: "FILTRE À HUILE, À VISSER DÉBIT MAXIMUM"
      │  • categoria: "Engine & Hydraulic"
      │
      ├─ TIPO DE FILTRO (MULTILENGUAJE):
      │  • Breadcrumb contiene "Huile" → type = "OIL" ✅
      │  • subtype: "SPIN-ON" (detectado en descripción)
      │
      ├─ DIMENSIONES:
      │  • height_mm: 118.11 (convertido de 4.65 in)
      │  • outer_diameter_mm: 92.96 (convertido de 3.66 in)
      │  • inner_diameter_mm: 62.0
      │  • thread_size: "1-12 UNF"
      │
      ├─ ESPECIFICACIONES FILTRACIÓN:
      │  • micron_rating: "25"
      │  • beta_200: "200"
      │  • iso_main_efficiency_percent: 99.5
      │  • media_type_original: "Synteq™ XP" ← DETECTADO
      │
      ├─ ESPECIFICACIONES OIL:
      │  • bypass_valve_psi: 12
      │  • hydrostatic_burst_psi: 350
      │  • dirt_capacity_grams: 45
      │
      ├─ CONDICIONES OPERATIVAS:
      │  • operating_temperature_min_c: -40
      │  • operating_temperature_max_c: 120
      │  • operating_pressure_max_psi: 150
      │
      ├─ MATERIALES:
      │  • seal_material: "NITRILE"
      │  • housing_material: "STEEL"
      │  • gasket_od_mm: 95.5
      │  • gasket_id_mm: 88.0
      │
      ├─ CROSS REFERENCES (TODOS):
      │  • CATERPILLAR: 1R-0750
      │  • FLEETGUARD: LF3000
      │  • BALDWIN: B7141
      │  • WIX: 51515
      │  • LUBERFINER: LFP2100
      │
      ├─ APLICACIONES:
      │  • CAT 3306 (1990-2000)
      │  • CAT 3406E (1995-2005)
      │  • VOLVO D13
      │
      └─ ESTÁNDARES:
         • manufacturing_standards: "ISO_9001|SAE"
         • certification_standards: "CE|ISO_9001"
         • service_life_hours: 2000
         • change_interval_km: 50000

6. ✨ MAPEO DE TECNOLOGÍA ELIMFILTERS
   
   Tecnología detectada: "Synteq™ XP"
   Tipo: "OIL"
   Duty: "HD"
   
   ┌─ Technology Mapper:
   │  mapToElimfiltersTechnology("Synteq™ XP", "OIL", "HD")
   │
   └─ Resultado del mapeo:
      {
        tecnologia_aplicada: "ELIMTEK™ MultiCore",
        technology_name: "ELIMTEK™ MultiCore – Oil / Fuel / Hydraulic (HD)",
        technology_tier: "ULTRA_PREMIUM",
        technology_scope: "OIL|HD|SYNTHETIC|EXTREME_PERFORMANCE",
        technology_equivalents: "DONALDSON_SYNTEQ_XP",
        technology_oem_detected: "Synteq™ XP"
      }

7. GENERACIÓN SKU
   ┌─ Inputs:
   │  • type: "OIL"
   │  • duty: "HD"
   │  • codigo_donaldson: "P552100"
   │
   ├─ Lookup en skuRules.json:
   │  • key = "OIL|HD"
   │  • prefix = "EL8" ✅
   │
   ├─ Extracción últimos 4:
   │  • "P552100" → limpiar → "P552100"
   │  • últimos 4 → "2100"
   │
   └─ SKU Final:
      • "EL8" + "2100" = "EL82100" ✅

8. PERSISTENCIA DUAL
   
   a) Google Sheets (MASTER_UNIFIED_V5):
      Fila nueva con 70+ columnas:
      A: EL82100
      B: P552100
      C: P552100
      D: (vacío - código FRAM)
      E: OIL
      F: HD
      G: DONALDSON
      H: FILTRE À HUILE, À VISSER DÉBIT MAXIMUM
      I: Moteur et véhicule > Huile > Filtres
      ... (dimensiones, especificaciones)
      AT: ELIMTEK™ MultiCore ✨
      AU: ELIMTEK™ MultiCore – Oil / Fuel / Hydraulic (HD) ✨
      AV: ULTRA_PREMIUM ✨
      AW: OIL|HD|SYNTHETIC|EXTREME_PERFORMANCE ✨
      AX: DONALDSON_SYNTEQ_XP ✨
      AY: Synteq™ XP ✨
      ... (resto de columnas)
      
   b) MongoDB (filters collection):
      {
        "_id": ObjectId("..."),
        "sku": "EL82100",
        "query": "P552100",
        "norm": "P552100",
        "duty_type": "HD",
        "type": "OIL",
        "subtype": "SPIN-ON",
        "description": "FILTRE À HUILE...",
        "oem_codes": "CAT:1R-0750|MACK:25160566",
        "cross_reference": [...],
        "specifications": {...},
        "technology": {
          "tecnologia_aplicada": "ELIMTEK™ MultiCore",
          "technology_name": "ELIMTEK™ MultiCore – Oil / Fuel / Hydraulic (HD)",
          "technology_tier": "ULTRA_PREMIUM",
          "technology_scope": "OIL|HD|SYNTHETIC|EXTREME_PERFORMANCE",
          "technology_equivalents": "DONALDSON_SYNTEQ_XP",
          "technology_oem_detected": "Synteq™ XP"
        },
        "indexed_at": ISODate("2025-12-26T00:00:00Z")
      }

9. RESPONSE (COMPLETA CON TECNOLOGÍA ELIMFILTERS)
   {
     "success": true,
     "source": "DONALDSON",
     "sku": "EL82100",
     "data": {
       "sku": "EL82100",
       "query": "P552100",
       "norm": "P552100",
       "duty_type": "HD",
       "type": "OIL",
       "subtype": "SPIN-ON",
       "description": "FILTRE À HUILE, À VISSER DÉBIT MAXIMUM",
       "oem_codes": "CAT:1R-0750|MACK:25160566",
       "cross_reference": [...],
       "height_mm": 118.11,
       "outer_diameter_mm": 92.96,
       "micron_rating": "25",
       "beta_200": "200",
       "bypass_valve_psi": 12,
       "hydrostatic_burst_psi": 350,
       
       // ✨ TECNOLOGÍA ELIMFILTERS MAPEADA
       "tecnologia_aplicada": "ELIMTEK™ MultiCore",
       "technology_name": "ELIMTEK™ MultiCore – Oil / Fuel / Hydraulic (HD)",
       "technology_tier": "ULTRA_PREMIUM",
       "technology_scope": "OIL|HD|SYNTHETIC|EXTREME_PERFORMANCE",
       "technology_equivalents": "DONALDSON_SYNTEQ_XP",
       "technology_oem_detected": "Synteq™ XP",
       
       "product_url": "https://shop.donaldson.com/...",
       "imagen_url": "https://assets.donaldson.com/...",
       "timestamp": "2025-12-26T00:00:00Z"
     }
   }


FOLDER STRUCTURE v8.0.0:
═══════════════════════════════════════════════════════════════

elimfilters-api/
│
├── 📄 Entry Point
│   └── server.js                          # Express app initialization
│
├── 📁 src/
│   │
│   ├── 📁 api/                            # REST API Layer
│   │   ├── search.js                     # Filter search routes (v8.0.0)
│   │   └── vin.js                        # VIN decoding routes
│   │
│   ├── 📁 services/                       # Business Logic Layer
│   │   ├── searchService.js              # Main search orchestrator (v8.0.0)
│   │   ├── cacheService.js               # Caché unificado (Sheets + MongoDB)
│   │   ├── scraperOrchestrator.js        # Coordinador de scrapers
│   │   ├── persistenceService.js         # Persistencia dual
│   │   └── vinService.js                 # VIN processing
│   │
│   ├── 📁 scrapers/                       # Data Acquisition Layer
│   │   ├── donaldsonScraper.js           # Donaldson HD (multilenguaje)
│   │   ├── framScraper.js                # FRAM LD
│   │   ├── globalScrapers/               # Scrapers globales
│   │   │   ├── wixScraper.js            # WIX
│   │   │   ├── baldwinScraper.js        # BALDWIN
│   │   │   ├── fleetguardScraper.js     # FLEETGUARD
│   │   │   ├── mannScraper.js           # MANN
│   │   │   ├── mahleScraper.js          # MAHLE
│   │   │   ├── parkerRacorScraper.js    # PARKER/RACOR
│   │   │   ├── pallScraper.js           # PALL
│   │   │   ├── hydacScraper.js          # HYDAC
│   │   │   └── genericScraper.js        # Scraper adaptativo
│   │   └── scraperRegistry.js            # Registro de fabricantes
│   │
│   ├── 📁 detection/                      # Detection Systems
│   │   ├── typeDetector.js               # Detección tipo multilenguaje
│   │   ├── dutyDetector.js               # Detección HD/LD dinámica
│   │   └── subtypeDetector.js            # Detección subtipo
│   │
│   ├── 📁 extraction/                     # Data Extraction
│   │   ├── specExtractor.js              # Extractor especificaciones
│   │   ├── dimensionsExtractor.js        # Extractor dimensiones
│   │   ├── materialsExtractor.js         # Extractor materiales
│   │   ├── crossRefExtractor.js          # Extractor cross-references
│   │   ├── applicationsExtractor.js      # Extractor aplicaciones
│   │   └── technologyExtractor.js        # Extractor tecnología original
│   │
│   ├── 📁 sku/                            # SKU Generation
│   │   └── generator.js                  # SKU rules & generation (v8.0.0)
│   │
│   ├── 📁 utils/                          # Utility Functions
│   │   ├── normalize.js                  # Text normalization
│   │   ├── digitExtractor.js             # Digit extraction
│   │   ├── unitConverter.js              # Conversión unidades
│   │   ├── languageDetector.js           # Detección idioma
│   │   ├── technologyMapper.js           # ✨ Mapeo tecnologías ELIMFILTERS
│   │   └── messages.js                   # Response messages
│   │
│   ├── 📁 config/                         # Configuration
│   │   ├── skuRules.json                 # SKU prefix rules (v8.0.0)
│   │   ├── manufacturers.json            # Fabricantes globales
│   │   ├── typeKeywords.json             # Keywords multilenguaje
│   │   └── technologyMap.json            # ✨ Mapeo completo de tecnologías
│   │
│   └── 📁 database/                       # Database Layer
│       ├── sheetsClient.js               # Google Sheets client
│       └── mongoClient.js                # MongoDB client
│
├── 📁 docs/                               # Documentation
│   ├── SKU_CREATION_POLICY_MASTER_ES.md # Política v8.0.0
│   ├── ARCHITECTURE.md                   # Este archivo
│   ├── TECHNOLOGY_MAPPING.md             # ✨ Documentación tecnologías
│   ├── API_REFERENCE.md                  # API endpoints
│   └── DEPLOYMENT.md                     # Deployment guide
│
├── 📄 Deployment
│   ├── Dockerfile                        # Container definition
│   ├── railway.json                      # Railway config
│   ├── .env.example                      # Environment template
│   └── .gitignore                        # Git ignore rules
│
├── 📄 Dependencies
│   └── package.json                      # NPM dependencies
│
└── 📄 Tests
    ├── test/                             # Unit tests
    │   └── technologyMapper.test.js      # ✨ Tests de mapeo
    └── integration/                      # Integration tests


TECHNOLOGY STACK v8.0.0:
═══════════════════════════════════════════════════════════════

Backend Framework:  Express.js 4.18.2
Runtime:            Node.js 20+
HTTP Client:        Axios 1.6.8
HTML Parser:        Cheerio 1.0.0-rc.12
Logger:             Morgan 1.10.0
Cache:              Node-Cache 5.1.2

Database:
- Google Sheets:    googleapis 128.0.0 (Master visual)
- MongoDB Atlas:    mongoose 8.3.1 (Queries rápidas)

Deployment:
- Containerization: Docker (Alpine Linux)
- PaaS:            Railway
- CI/CD:           GitHub (via Railway auto-deploy)
- URL:             catalogo-production-7cef.up.railway.app


✨ TECHNOLOGY MAPPING SYSTEM v8.0.0:
═══════════════════════════════════════════════════════════════

MAPEO DE TECNOLOGÍAS: FABRICANTES → ELIMFILTERS

┌─────────────────────────────────────────────────────────────┐
│  TECNOLOGÍA DETECTADA (Scraping)                            │
│  ↓                                                           │
│  "Synteq™ XP" (Donaldson)                                   │
│  "Ultra-Web®" (Donaldson)                                   │
│  "StrataPore®" (Fleetguard)                                 │
│  "Titanium®" (FRAM)                                         │
│  "500FG" (Racor)                                            │
│  etc...                                                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│         TECHNOLOGY MAPPER (technologyMapper.js)             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  1. Normalización de tecnología detectada             │ │
│  │  2. Búsqueda en TECHNOLOGY_MAP                        │ │
│  │  3. Búsqueda por palabras clave (si no hay match)     │ │
│  │  4. Tecnología por defecto (family + duty)            │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  TECNOLOGÍA ELIMFILTERS (Mapeada)                           │
│  ↓                                                           │
│  {                                                           │
│    tecnologia_aplicada: "ELIMTEK™ MultiCore",              │
│    technology_name: "ELIMTEK™ MultiCore – Oil/Fuel/Hydr..", │
│    technology_tier: "ULTRA_PREMIUM",                        │
│    technology_scope: "OIL|HD|SYNTHETIC|EXTREME_PERF",      │
│    technology_equivalents: "DONALDSON_SYNTEQ_XP",          │
│    technology_oem_detected: "Synteq™ XP"                   │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘


TECNOLOGÍAS ELIMFILTERS - CATÁLOGO COMPLETO:
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  LIGHT DUTY (LD) - 7 TECNOLOGÍAS                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AIR FILTERS:                                                │
│  • MACROCORE™ Plus         → Medio sintético regular        │
│  • MACROCORE™ Ultra        → Nanofibra ultra-eficiencia     │
│                                                              │
│  OIL FILTERS:                                                │
│  • ELIMTEK™ MultiCore      → Sintético multicapa premium    │
│  • ELIMTEK™ Blend          → Híbrido celulosa + sintético   │
│                                                              │
│  CABIN FILTERS:                                              │
│  • MICROKAPPA™ MultiCore   → Carbón activado + multicapa    │
│  • MICROKAPPA™ Plus        → Electrostático avanzado        │
│                                                              │
│  FUEL FILTERS:                                               │
│  • ELIMTEK™ Thermo         → Protección inyección           │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  HEAVY DUTY (HD) - 9 TECNOLOGÍAS                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  OIL / FUEL / HYDRAULIC:                                     │
│  • ELIMTEK™ MultiCore      → Densidad graduada Beta alta    │
│  • ELIMTEK™ Blend          → Mixto celulosa + sintético     │
│                                                              │
│  HYDRAULIC SYSTEMS:                                          │
│  • HydroFlow™ 5000         → Microfibra vidrio ISO estricto │
│                                                              │
│  FUEL WATER SEPARATION:                                      │
│  • AquaCore™ Pro           → Coalescente HPCR avanzado      │
│                                                              │
│  ENGINE AIR:                                                 │
│  • MACROCORE™ NanoMax      → Nanofibra mínima restricción   │
│  • MACROCORE™              → Robusto alta capacidad         │
│                                                              │
│  CABIN AIR:                                                  │
│  • MICROKAPPA™             → Carbón activado maquinaria HD  │
│                                                              │
│  AIR BRAKE SYSTEMS:                                          │
│  • AeroDry™ Max            → Desecante con prefiltración    │
│                                                              │
│  COOLANT FILTERS:                                            │
│  • ThermoRelease™          → Liberación DCA controlada      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  MARINO - 4 TECNOLOGÍAS                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  • AQUACORE™ Marine 1000   → Primary Coalescing Stage       │
│  • AQUACORE™ Marine 2000   → Ultra-Separator Secondary      │
│  • AQUACORE™ Marine 3000   → Cartridge Marine Series        │
│  • AQUACORE™ Marine 4000   → High Flow Water Block          │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TURBINAS - 1 TECNOLOGÍA                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  • HYDROFLOW™ TurboMax     → Industrial/Marine Turbine      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CARCASAS / HOUSINGS - 3 TECNOLOGÍAS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  • TURBINE X500            → Assembly Replacement 500FG     │
│  • TURBINE X900            → Assembly Replacement 900FG     │
│  • TURBINE X1000           → High-Capacity Assembly 1000FG  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

TOTAL: 24 TECNOLOGÍAS PROPIAS ELIMFILTERS


MAPEO DE EQUIVALENCIAS - EJEMPLOS:
═══════════════════════════════════════════════════════════════

DONALDSON → ELIMFILTERS:
┌──────────────────────┬────────────────────────────────────┐
│ Donaldson            │ ELIMFILTERS                        │
├──────────────────────┼────────────────────────────────────┤
│ Synteq™              │ ELIMTEK™ MultiCore                 │
│ Synteq™ XP           │ ELIMTEK™ MultiCore (ULTRA_PREMIUM) │
│ Ultra-Web®           │ MACROCORE™ NanoMax                 │
│ PowerCore®           │ MACROCORE™                         │
│ Blue®                │ ELIMTEK™ Blend                     │
│ Twist&Drain®         │ AquaCore™ Pro                      │
│ P-Series Dryers      │ AeroDry™ Max                       │
│ DBF Series (DCA)     │ ThermoRelease™                     │
└──────────────────────┴────────────────────────────────────┘

FLEETGUARD → ELIMFILTERS:
┌──────────────────────┬────────────────────────────────────┐
│ Fleetguard           │ ELIMFILTERS                        │
├──────────────────────┼────────────────────────────────────┤
│ StrataPore®          │ ELIMTEK™ MultiCore                 │
│ NanoNet®             │ MACROCORE™ NanoMax                 │
│ MicroGlass           │ HydroFlow™ 5000                    │
│ Direct Flow™         │ MACROCORE™                         │
│ FleetCool® (DCA)     │ ThermoRelease™                     │
└──────────────────────┴────────────────────────────────────┘

FRAM → ELIMFILTERS:
┌──────────────────────┬────────────────────────────────────┐
│ FRAM                 │ ELIMFILTERS                        │
├──────────────────────┼────────────────────────────────────┤
│ Synthetic Endurance™ │ ELIMTEK™ MultiCore                 │
│ Titanium™ (Oil)      │ ELIMTEK™ MultiCore                 │
│ Titanium® (Air)      │ MACROCORE™ Ultra                   │
│ Force™               │ ELIMTEK™ Blend                     │
│ Extra Guard®         │ ELIMTEK™ Blend / MACROCORE™ Plus   │
│ Fresh Breeze®        │ MICROKAPPA™ MultiCore              │
│ TrueAir™             │ MICROKAPPA™ Plus                   │
└──────────────────────┴────────────────────────────────────┘

RACOR/PARKER → ELIMFILTERS:
┌──────────────────────┬────────────────────────────────────┐
│ Racor/Parker         │ ELIMFILTERS                        │
├──────────────────────┼────────────────────────────────────┤
│ 500FG                │ AQUACORE™ Marine 1000              │
│ 900FG                │ AQUACORE™ Marine 1000              │
│ 1000FG               │ AQUACORE™ Marine 1000              │
│ S3201/S3209 (HPCR)   │ AQUACORE™ Marine 2000              │
│ Turbine Cartridges   │ AQUACORE™ Marine 3000              │
│ Turbine High Flow    │ AQUACORE™ Marine 4000              │
│ Turbine Industrial   │ HYDROFLOW™ TurboMax                │
└──────────────────────┴────────────────────────────────────┘


INTEGRATION EXAMPLE - MAPEO EN SCRAPER:
═══════════════════════════════════════════════════════════════
```javascript
// src/scrapers/donaldsonScraper.js

const { mapToElimfiltersTechnology } = require('../utils/technologyMapper');

async function scrapearDonaldson(codigoEntrada) {
  // 1. Scraping normal
  const $ = cheerio.load(productResponse.data);
  
  // 2. Extraer tecnología original Donaldson
  const tecOriginal = extraerTecnologiaOriginal($);
  // Ejemplo: "Synteq™ XP", "Ultra-Web®", "Blue®"
  
  // 3. Determinar tipo y duty
  const tipo = detectarTipoFiltroDonaldson($);  // "OIL"
  const duty = 'HD';
  
  // 4. ✨ MAPEAR A TECNOLOGÍA ELIMFILTERS
  const techData = mapToElimfiltersTechnology(tecOriginal, tipo, duty);
  
  // 5. Retornar con tecnología mapeada
  return {
    encontrado: true,
    datos: {
      code_donaldson: "P552100",
      type: tipo,
      duty: duty,
      
      // ✨ CAMPOS DE TECNOLOGÍA ELIMFILTERS
      tecnologia_aplicada: techData.tecnologia_aplicada,
      technology_name: techData.technology_name,
      technology_tier: techData.technology_tier,
      technology_scope: techData.technology_scope,
      technology_equivalents: techData.technology_equivalents,
      technology_oem_detected: techData.technology_oem_detected,
      
      // ... resto de campos
    }
  };
}
```

RESULTADO DEL MAPEO:
```javascript
// INPUT (desde Donaldson):
{
  media_type_detected: "Synteq™ XP",
  type: "OIL",
  duty: "HD"
}

// OUTPUT (mapeado ELIMFILTERS):
{
  tecnologia_aplicada: "ELIMTEK™ MultiCore",
  technology_name: "ELIMTEK™ MultiCore – Oil / Fuel / Hydraulic (HD)",
  technology_tier: "ULTRA_PREMIUM",
  technology_scope: "OIL|HD|SYNTHETIC|EXTREME_PERFORMANCE",
  technology_equivalents: "DONALDSON_SYNTEQ_XP",
  technology_oem_detected: "Synteq™ XP"
}
```


API ENDPOINTS v8.0.0:
═══════════════════════════════════════════════════════════════

GET /health
- Health check del servicio
- Response: { "status": "OK", "timestamp": "..." }

GET /api/search/:codigo
- Búsqueda global de filtro con tecnología ELIMFILTERS mapeada
- Params: codigo (cualquier código de filtro)
- Response: Objeto completo con 70+ campos + tecnología ELIMFILTERS

POST /api/search
- Búsqueda con parámetros adicionales
- Body: { "codigo": "...", "forceRefresh": true/false }
- Response: Objeto completo con tecnología ELIMFILTERS

GET /api/vin/:vin
- Decodificación de VIN
- Params: vin (17 caracteres)
- Response: Información del vehículo


RESPONSE EXAMPLE CON TECNOLOGÍA ELIMFILTERS:
═══════════════════════════════════════════════════════════════
```json
{
  "success": true,
  "source": "DONALDSON",
  "sku": "EL82100",
  "data": {
    "sku": "EL82100",
    "query": "P552100",
    "norm": "P552100",
    "duty_type": "HD",
    "type": "OIL",
    "subtype": "SPIN-ON",
    "description": "FILTRE À HUILE, À VISSER DÉBIT MAXIMUM",
    
    "oem_codes": "CAT:1R-0750|MACK:25160566",
    "cross_reference": [
      {"manufacturer": "CATERPILLAR", "part_number": "1R-0750"},
      {"manufacturer": "FLEETGUARD", "part_number": "LF3000"},
      {"manufacturer": "BALDWIN", "part_number": "B7141"},
      {"manufacturer": "WIX", "part_number": "51515"}
    ],
    
    "height_mm": 118.11,
    "outer_diameter_mm": 92.96,
    "inner_diameter_mm": 62.0,
    "thread_size": "1-12 UNF",
    
    "micron_rating": "25",
    "beta_200": "200",
    "iso_main_efficiency_percent": 99.5,
    
    "bypass_valve_psi": 12,
    "hydrostatic_burst_psi": 350,
    "dirt_capacity_grams": 45,
    
    "operating_temperature_min_c": -40,
    "operating_temperature_max_c": 120,
    
    "seal_material": "NITRILE",
    "housing_material": "STEEL",
    
    "✨ TECNOLOGÍA ELIMFILTERS": {
      "tecnologia_aplicada": "ELIMTEK™ MultiCore",
      "technology_name": "ELIMTEK™ MultiCore – Oil / Fuel / Hydraulic (HD)",
      "technology_tier": "ULTRA_PREMIUM",
      "technology_scope": "OIL|HD|SYNTHETIC|EXTREME_PERFORMANCE",
      "technology_equivalents": "DONALDSON_SYNTEQ_XP",
      "technology_oem_detected": "Synteq™ XP"
    },
    
    "product_url": "https://shop.donaldson.com/...",
    "imagen_url": "https://assets.donaldson.com/...",
    "timestamp": "2025-12-26T00:00:00Z"
  }
}
```


CHANGELOG v8.0.0 - MAPEO DE TECNOLOGÍAS:
═══════════════════════════════════════════════════════════════

NUEVAS CARACTERÍSTICAS:
✅ Sistema de mapeo automático de tecnologías
✅ 24 tecnologías propias ELIMFILTERS definidas
✅ Mapeo completo de equivalencias:
   • Donaldson (8 tecnologías)
   • Fleetguard (5 tecnologías)
   • FRAM (7 tecnologías)
   • Racor/Parker (7 tecnologías)
✅ Detección por palabras clave cuando no hay match directo
✅ Tecnologías por defecto según family + duty
✅ Persistencia de tecnología original + mapeada
✅ 6 campos nuevos de tecnología en Google Sheets
✅ Indexación de tecnología en MongoDB

MÓDULOS NUEVOS:
✅ src/utils/technologyMapper.js
✅ src/config/technologyMap.json
✅ src/extraction/technologyExtractor.js
✅ test/technologyMapper.test.js

DOCUMENTACIÓN NUEVA:
✅ docs/TECHNOLOGY_MAPPING.md
✅ Sección completa en ARCHITECTURE.md

COMPATIBILIDAD:
✅ Sin breaking changes en SKU generation
✅ Compatible con v5.2.x (confianza descendente)
✅ Backward compatible con datos sin tecnología


SCALABILITY & PERFORMANCE v8.0.0:
═══════════════════════════════════════════════════════════════

ARQUITECTURA ACTUAL:
✅ Stateless API (escala horizontalmente)
✅ Caché dual (Sheets + MongoDB)
✅ Scraping paralelo (Promise.all)
✅ Sistema de fallback global
✅ Mapeo de tecnología en memoria (O(1))
✅ Persistencia dual automática

TIEMPOS DE RESPUESTA:
- Caché hit (Sheets): < 200ms
- Caché hit (MongoDB): < 50ms
- Scraping Donaldson: 1-3s
- Scraping FRAM: 1-2s
- Scraping global: 2-4s
- Mapeo tecnología: < 5ms ✨
- Persistencia dual: 300-800ms

TOTAL (cache miss): 2-5s
TOTAL (cache hit): < 200ms


DEPLOYMENT TARGETS v8.0.0:
═══════════════════════════════════════════════════════════════

✅ Railway (PRODUCCIÓN ACTUAL)
   • URL: catalogo-production-7cef.up.railway.app
   • Auto-deploy on git push
   • Environment variables
   • Built-in health checks
   • Logs & metrics

✅ Docker / Docker Compose
   • Portable containers
   • Local development
   • Self-hosted options

✅ Cloud Providers
   • AWS (ECS, Elastic Beanstalk)
   • Google Cloud (Cloud Run)
   • Azure (Container Apps)
   • DigitalOcean (App Platform)

FIN DE ARCHITECTURE v8.0.0 CON SISTEMA DE MAPEO DE TECNOLOGÍAS ELIMFILTERS ✨
