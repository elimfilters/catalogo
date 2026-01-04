require('dotenv').config(); 
const express = require('express');
const cors = require('cors');

const app = express();

// CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// DATA MAPPER INTEGRADO (v6.1)
// ============================================
const descriptions = {
  "brand_identity": "Elimfilters®",
  "performance_tiers": {
    "STANDARD": { "performance_claim": "reliable filtration for standard service intervals" },
    "PERFORMANCE": { "performance_claim": "enhanced filtration efficiency and high dirt-holding capacity" },
    "ELITE": { "performance_claim": "maximum synthetic protection for extreme service conditions" }
  },
  "definitions": {
    "EL8": { "name": "full-flow lube", "tech": "SYNTRAX™", "benefit": "superior engine protection and consistent oil flow under high-pressure" },
    "EA1": { "name": "primary air", "tech": "NANOFORCE™", "benefit": "longer service life and optimum performance when the job demands it" },
    "EF9": { "name": "secondary high-efficiency fuel", "tech": "SYNTEPORE™", "benefit": "protecting sensitive high-pressure common rail (HPCR) systems" },
    "ES9": { "name": "fuel/water separator", "tech": "AQUASEP™", "benefit": "effective water removal and particulate filtration to prevent corrosion" },
    "ET9": { "name": "turbine series replacement", "tech": "AQUAGUARD®", "benefit": "active water repulsion and reliable protection for critical turbines" },
    "EC1": { "name": "advanced cabin air", "tech": "BIOGUARD™", "benefit": "maintaining a clean environment by capturing allergens and odors" },
    "EH6": { "name": "high-pressure hydraulic", "tech": "CINTEK™", "benefit": "maintaining fluid cleanliness in precision hydraulic circuits" },
    "EW7": { "name": "thermal-protection coolant", "tech": "THERM™", "benefit": "balancing coolant chemistry and preventing liner pitting" },
    "EM9": { "name": "mariner pro™ series", "tech": "MARINER PRO™", "benefit": "corrosion resistance and reliability in saltwater environments" },
    "ED4": { "name": "pneumatic air brake dryer", "tech": "BRAKEGUARD™", "benefit": "removing moisture to ensure the safety of braking systems" },
    "EK5": { "name": "Heavy-Duty Master Service Kit", "tech": "SISTEMGUARD™", "benefit": "all-in-one comprehensive protection for heavy machinery" },
    "EK3": { "name": "Light-Duty Service Kit", "tech": "SISTEMGUARD™", "benefit": "optimized maintenance package for passenger and light truck vehicles" }
  },
  "physical_form_logic": {
    "spin-on": "spin-on filter",
    "cartridge": "cartridge filtration element",
    "radial": "radial seal element",
    "kit": "complete service package"
  }
};

function mapToHorizontalRow(aiData, query) {
    const row = new Array(56).fill(""); 
    row[0] = query; 

    let prefix = aiData.prefix;
    const isKit = (aiData.search_type === 'vin' || aiData.search_type === 'equipment');
    
    if (isKit) {
        prefix = (aiData.duty === 'HD') ? 'EK5' : 'EK3';
    }

    const base = aiData.base_numeric_code;
    const config = descriptions.definitions[prefix] || { tech: "STANDARD", benefit: "protection" };
    
    // Determinar forma física
    let form = descriptions.physical_form_logic["spin-on"];
    if (isKit) form = descriptions.physical_form_logic.kit;
    else if (aiData.is_cartridge) form = descriptions.physical_form_logic.cartridge;
    else if (prefix === 'EA1') form = descriptions.physical_form_logic.radial;

    // Distribución en la fila (Trilogía: Std, Perf, Elite)
    const tiers = [
        { tier: 'STANDARD', sfx: '9000', idxSKU: 6, idxDesc: 9 },
        { tier: 'PERFORMANCE', sfx: '0949', idxSKU: 16, idxDesc: 19 },
        { tier: 'ELITE', sfx: '7900', idxSKU: 26, idxDesc: 29 }
    ];
    
    tiers.forEach(t => {
        row[t.idxSKU] = `${prefix}${base}${t.sfx}`;
        const claim = descriptions.performance_tiers[t.tier].performance_claim;
        row[t.idxDesc] = `Elimfilters® ${prefix}${base}${t.sfx} ${t.tier} (${config.tech}) ${form} is designed to ${claim}. ${config.tech} offers unique features that provide significant benefits for ${config.benefit}.`;
    });

    row[39] = aiData.iso_norm || "ISO 9001:2015";
    row[52] = config.tech; 
    row[55] = aiData.duty; 

    return row;
}

console.log('🔧 ELIMFILTERS API v7.1 - Initializing...');

// ============================================
// ENDPOINT PRINCIPAL
// ============================================
app.post('/api/v1/search', (req, res) => {
    console.log('📥 POST /api/v1/search received');
    console.log('📦 Body:', JSON.stringify(req.body));
    
    const { searchTerm, searchType } = req.body;
    
    if (!searchTerm || !searchType) {
        console.log('❌ Missing data - searchTerm:', searchTerm, 'searchType:', searchType);
        return res.status(400).json({
            success: false,
            message: 'Missing searchTerm or searchType',
            received: { searchTerm, searchType }
        });
    }
    
    console.log('✅ Valid request:', searchTerm, searchType);
    
    // Configuración AI
    const aiData = {
        search_type: searchType,
        base_numeric_code: "8000",
        is_cartridge: false,
        duty: "HD",
        iso_norm: "ISO 9001:2015",
        prefix: "EL8"
    };
    
    console.log('🤖 AI Data:', aiData);
    
    // Generar array de 56 columnas
    const resultRow = mapToHorizontalRow(aiData, searchTerm);
    
    console.log('📊 Generated SKUs:');
    console.log('  STANDARD:', resultRow[6]);
    console.log('  PERFORMANCE:', resultRow[16]);
    console.log('  ELITE:', resultRow[26]);
    
    // Convertir array a formato para el plugin
    const isKit = (searchType === 'vin' || searchType === 'equipment');
    const mainSKU = resultRow[16]; // PERFORMANCE tier por defecto
    const mainDesc = resultRow[19];
    
    const responseData = {
        sku: mainSKU,
        filterType: isKit ? descriptions.definitions[aiData.duty === 'HD' ? 'EK5' : 'EK3'].name : descriptions.definitions.EL8.name,
        description: mainDesc,
        imageUrl: "https://elimfilters.com/wp-content/uploads/2025/08/Screenshot-2025-08-20-204050.png",
        
        specifications: [
            { label: "SKU (STANDARD)", value: resultRow[6] },
            { label: "SKU (PERFORMANCE)", value: resultRow[16] },
            { label: "SKU (ELITE)", value: resultRow[26] },
            { label: "Technology", value: resultRow[52] },
            { label: "Duty", value: resultRow[55] },
            { label: "ISO Norm", value: resultRow[39] },
            { label: "Search Term", value: resultRow[0] }
        ],
        
        equipment: [
            { equipment: "CAT 320D", engine: "C6.6 ACERT", year: "2008-2015", quantity: "1" },
            { equipment: "CAT 330D", engine: "C9 ACERT", year: "2007-2013", quantity: "1" },
            { equipment: "Volvo EC210", engine: "D6E", year: "2010-2018", quantity: "2" }
        ],
        
        oemCross: {
            "Caterpillar": ["1R-0750", "1R-1807"],
            "Donaldson": ["P551329"],
            "Fleetguard": ["LF3000"]
        },
        
        crossReference: ["WIX 51348", "FRAM PH8170", "MANN W962"],
        
        maintenanceKits: isKit ? [
            { code: resultRow[6], description: resultRow[9] },
            { code: resultRow[16], description: resultRow[19] },
            { code: resultRow[26], description: resultRow[29] }
        ] : []
    };
    
    console.log('📤 Sending response with SKU:', mainSKU);
    
    res.json({
        success: true,
        data: responseData
    });
});

// ============================================
// ENDPOINT ALTERNATIVO
// ============================================
app.post('/api/search', (req, res) => {
    console.log('📥 /api/search - Redirecting to v1');
    req.url = '/api/v1/search';
    app._router.handle(req, res);
});

// ============================================
// HEALTH & ROOT
// ============================================
app.get('/health', (req, res) => {
    res.json({ status: 'OK', version: '7.1' });
});

app.get('/', (req, res) => {
    res.json({ 
        message: 'ELIMFILTERS API v7.1 - DataMapper Integrated',
        endpoints: ['/api/v1/search', '/api/search', '/health']
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('🚀 ELIMFILTERS API Server ready on port ' + PORT);
    console.log('✅ DataMapper v6.1 integrated');
    console.log('📡 Endpoints active: /api/v1/search, /api/search');
});
