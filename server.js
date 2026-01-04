require('dotenv').config(); 
const express = require('express');
const cors = require('cors');

const app = express();

// CRITICAL: CORS and body parsing MUST come BEFORE routes
const corsOptions = {
    origin: '*', // Permitir todos los orígenes temporalmente para debug
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));

// Body parsing - CRITICAL para recibir JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log middleware para debug
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    console.log('📦 Body:', req.body);
    console.log('📋 Headers:', req.headers);
    next();
});

/**
 * ENDPOINT PRINCIPAL
 */
app.post('/api/v1/search', async (req, res) => {
    try {
        console.log('🔍 POST /api/v1/search received');
        console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
        
        const { searchTerm, searchType } = req.body;

        console.log('🔎 searchTerm:', searchTerm);
        console.log('🔎 searchType:', searchType);

        if (!searchTerm || !searchType) {
            console.log('❌ Missing data - searchTerm:', searchTerm, 'searchType:', searchType);
            return res.status(400).json({ 
                success: false, 
                message: "Missing search data. Required: searchTerm and searchType",
                received: { searchTerm, searchType }
            });
        }

        console.log('✅ Data received correctly');

        // DATOS DE PRUEBA - Para verificar que todo funciona
        const mockData = {
            sku: `EL8-${searchTerm.toUpperCase()}`,
            filterType: "Heavy Duty Lube Filter - SISTEMGUARD™ EK5",
            description: `ELIMFILTERS premium filter for ${searchTerm}. German quality standards with SISTEMGUARD™ EK5 technology.`,
            imageUrl: "https://elimfilters.com/wp-content/uploads/2025/08/Screenshot-2025-08-20-204050.png",
            
            specifications: [
                { label: "SKU", value: `EL8-${searchTerm.toUpperCase()}` },
                { label: "Outside Diameter", value: "93.5 mm" },
                { label: "Height", value: "142 mm" },
                { label: "Thread Size", value: "M20 x 1.5" },
                { label: "Gasket OD", value: "71 mm" },
                { label: "Filter Type", value: "Spin-On" },
                { label: "Micron Rating", value: "25 microns" },
                { label: "Max Flow Rate", value: "45 L/min" },
                { label: "Burst Pressure", value: "250 PSI" },
                { label: "Technology", value: "SISTEMGUARD™ EK5" }
            ],
            
            equipment: [
                { equipment: "CAT 320D", engine: "C6.6 ACERT", year: "2008-2015", quantity: "1" },
                { equipment: "CAT 330D", engine: "C9 ACERT", year: "2007-2013", quantity: "1" },
                { equipment: "Volvo EC210", engine: "D6E", year: "2010-2018", quantity: "2" },
                { equipment: "Komatsu PC200", engine: "SAA6D107E", year: "2012-2020", quantity: "1" }
            ],
            
            oemCross: {
                "Caterpillar": ["1R-0750", "1R-1807", "1R-0739"],
                "Donaldson": ["P551329", "P550345", "P552100"],
                "Fleetguard": ["LF3000", "LF667", "LF9009"],
                "Baldwin": ["B7125", "B7335"],
                "MANN": ["W962", "W940/25"],
                "Wix": ["51348", "51515"]
            },
            
            crossReference: [
                "WIX 51348", "FRAM PH8170", "MANN W962", 
                "MAHLE OC47", "BOSCH 0451103274", "HENGST H200W",
                "PUROLATOR L30001", "AC DELCO PF52", "MOTORCRAFT FL1995"
            ],
            
            maintenanceKits: [
                { 
                    code: "EK5-320D", 
                    description: "Complete service kit for CAT 320D - includes oil filter, fuel filter, air filter, and cabin filter. 500hr service interval." 
                },
                { 
                    code: "EK5-VOLVO", 
                    description: "Volvo EC210 maintenance package - Complete filter set for 500hr service with SISTEMGUARD™ technology." 
                },
                { 
                    code: "EK5-UNIVERSAL", 
                    description: "Universal heavy duty maintenance kit - Compatible with most construction equipment." 
                }
            ]
        };

        console.log('📤 Sending mock data...');
        
        res.json({
            success: true,
            data: mockData,
            searchInfo: {
                searchTerm,
                searchType,
                timestamp: new Date().toISOString()
            }
        });

        console.log('✅ Response sent successfully');

    } catch (error) {
        console.error("❌ Error in /api/v1/search:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error",
            error: error.message 
        });
    }
});

/**
 * ENDPOINT ALTERNATIVO - Para compatibilidad
 */
app.post('/api/search', async (req, res) => {
    console.log('🔍 POST /api/search - redirecting to v1');
    req.url = '/api/v1/search';
    return app._router.handle(req, res, () => {});
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * Root
 */
app.get('/', (req, res) => {
    res.json({ 
        message: 'ELIMFILTERS API v7.0',
        endpoints: [
            'POST /api/v1/search',
            'POST /api/search',
            'GET /health'
        ]
    });
});

// 404 handler
app.use((req, res) => {
    console.log('❌ 404 - Route not found:', req.method, req.path);
    res.status(404).json({ 
        error: 'Not Found',
        method: req.method,
        path: req.path
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ELIMFILTERS API Server ready on port ${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 CORS: Enabled for all origins (debug mode)`);
    console.log(`📋 Body Parser: JSON + URLEncoded enabled`);
});
