// server.js - Railway Backend ELIMFILTERS v5.5
// Integración: WordPress → Railway → GEMA → MongoDB → Google Sheets

const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const { google } = require('googleapis');
const axios = require('axios');

const app = express();

// ===== CONFIGURACIÓN =====
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'production';

// GEMA Configuration
const GEMA_URL = 'https://gema-production.up.railway.app/api/query';
const GEMA_TOKEN = process.env.GEMA_BEARER_TOKEN; // ⚠️ CONFIGURAR EN RAILWAY

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI; // ⚠️ AÑADIR PASSWORD REAL
const MONGODB_DATABASE = 'elimfilters';
const MONGODB_COLLECTION = 'filters';

// Google Sheets Configuration
const GOOGLE_SHEET_ID = '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS ||'{}');

// ===== CORS CONFIGURATION =====
app.use(cors({
    origin: ['https://elimfilters.com', 'https://www.elimfilters.com'],
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ===== DATABASE CONNECTIONS =====
let mongoClient;
let mongoDb;
let sheetsClient;

// Initialize MongoDB
async function initMongoDB() {
    try {
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        mongoDb = mongoClient.db(MONGODB_DATABASE);
        console.log('✅ MongoDB conectado');
    } catch (error) {
        console.error('❌ Error conectando MongoDB:', error.message);
        throw error;
    }
}

// Initialize Google Sheets
async function initGoogleSheets() {
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: GOOGLE_CREDENTIALS,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        sheetsClient = google.sheets({ version: 'v4', auth });
        console.log('✅ Google Sheets conectado');
    } catch (error) {
        console.error('❌ Error conectando Google Sheets:', error.message);
        throw error;
    }
}

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        connections: {
            mongodb: mongoDb ? 'connected' : 'disconnected',
            sheets: sheetsClient ? 'connected' : 'disconnected',
            gema: GEMA_TOKEN ? 'configured' : 'missing_token'
        }
    });
});

// ===== MAIN SEARCH ENDPOINT =====
app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                message: 'Query parameter is required'
            });
        }

        console.log(`🔍 Búsqueda recibida: ${query}`);

        // PASO 1: Buscar en cache local (MongoDB)
        const cachedResult = await buscarEnCache(query);
        
        if (cachedResult) {
            console.log(`✅ CACHE HIT - SKU encontrado: ${cachedResult.sku}`);
            return res.json(cachedResult);
        }

        console.log('⏳ CACHE MISS - Consultando GEMA...');

        // PASO 2: Consultar GEMA
        const gemaData = await consultarGEMA(query);

        if (!gemaData) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                message: `No se encontró filtro para el código: ${query}`
            });
        }

        // GEMA ya devuelve todo procesado (SKU, ELIMTEK™, etc)
        console.log(`🏷️ SKU recibido de GEMA: ${gemaData.sku}`);

        // PASO 3: Preparar datos para persistencia
        const elimData = {
            ...gemaData,
            inputCode: query,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // PASO 4: Guardar en MongoDB
        await guardarEnMongoDB(elimData);
        console.log('✅ Guardado en MongoDB');

        // PASO 5: Guardar en Google Sheets
        await guardarEnSheets(elimData);
        console.log('✅ Guardado en Google Sheets');

        // PASO 6: Retornar a WordPress (sin inputCode/timestamps internos)
        const { inputCode, createdAt, updatedAt, ...responseData } = elimData;
        return res.json(gemaData);

    } catch (error) {
        console.error('❌ Error en /api/search:', error);
        return res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: error.message
        });
    }
});

// ===== FUNCIÓN: BUSCAR EN CACHE (MongoDB) =====
async function buscarEnCache(query) {
    try {
        const collection = mongoDb.collection(MONGODB_COLLECTION);
        const normalizedQuery = query.toUpperCase().trim();

        // Buscar por SKU directo
        let result = await collection.findOne({ sku: normalizedQuery });
        if (result) return formatearRespuesta(result);

        // Buscar por código de entrada
        result = await collection.findOne({ inputCode: normalizedQuery });
        if (result) return formatearRespuesta(result);

        // Buscar en cross-reference
        result = await collection.findOne({ 
            crossReference: normalizedQuery 
        });
        if (result) return formatearRespuesta(result);

        // Buscar en OEM cross
        const results = await collection.find({
            'oemCross': { $exists: true }
        }).toArray();
        
        for (const doc of results) {
            for (const [manufacturer, codes] of Object.entries(doc.oemCross || {})) {
                if (codes.includes(normalizedQuery)) {
                    return formatearRespuesta(doc);
                }
            }
        }

        return null;

    } catch (error) {
        console.error('Error buscando en cache:', error);
        return null;
    }
}

// ===== FUNCIÓN: CONSULTAR GEMA =====
async function consultarGEMA(query) {
    try {
        if (!GEMA_TOKEN) {
            console.error('⚠️ GEMA_BEARER_TOKEN no configurado');
            return null;
        }

        const response = await axios.post(
            GEMA_URL,
            {
                searchTerm: query,
                searchType: 'part-number'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GEMA_TOKEN}`
                },
                timeout: 10000
            }
        );

        // GEMA devuelve: { status: "success", data: {...} }
        if (response.data.status !== 'success' || !response.data.data) {
            console.log('❌ GEMA no encontró el código o respuesta inválida');
            return null;
        }

        // Validar que es filtro de motor
        if (!esFiltroDMotor(response.data.data)) {
            console.log('❌ Código no es filtro de motor');
            return null;
        }

        // Retornar el objeto data que contiene toda la info
        return response.data.data;

    } catch (error) {
        if (error.response) {
            console.error('Error GEMA:', error.response.status, error.response.data);
        } else {
            console.error('Error consultando GEMA:', error.message);
        }
        return null;
    }
}

// ===== FUNCIÓN: VALIDAR FILTRO DE MOTOR =====
function esFiltroDMotor(gemaData) {
    const tiposValidos = [
        'Oil', 'Fuel', 'Air', 'Cabin', 'Hydraulic',
        'Separator', 'Turbine', 'Coolant', 'Air Dryer',
        'Air Housing', 'Marine'
    ];

    const tipo = gemaData.filterType || gemaData.type || '';
    return tiposValidos.some(t => tipo.toLowerCase().includes(t.toLowerCase()));
}

// ===== FUNCIÓN: GENERAR SKU =====
function generarSKU(gemaData) {
    const filterType = gemaData.filterType || gemaData.type || '';
    const category = gemaData.category || '';
    const manufacturerCode = gemaData.manufacturerCode || gemaData.partNumber || '';

    const prefijo = determinarPrefijo(filterType, category);
    const digitos = extraer4Digitos(manufacturerCode);

    return `${prefijo}${digitos}`;
}

// ===== FUNCIÓN: DETERMINAR PREFIJO =====
function determinarPrefijo(filterType, category) {
    const tipo = filterType.toLowerCase();
    const isHD = category === 'HD' || category === 'Heavy Duty';

    if (tipo.includes('oil') || tipo.includes('lube')) return 'EL8';
    if (tipo.includes('fuel')) return 'EF9';
    if (tipo.includes('air') && !tipo.includes('housing')) return 'EA1';
    if (tipo.includes('cabin')) return 'EC1';
    if (tipo.includes('hydraulic')) return 'EH6';
    if (tipo.includes('separator')) return 'ES9';
    if (tipo.includes('turbine')) return 'ET9';
    if (tipo.includes('coolant')) return 'EW7';
    if (tipo.includes('dryer')) return 'ED4';
    if (tipo.includes('housing')) return 'EA2';
    if (tipo.includes('marine')) return 'EM9';
    if (tipo.includes('kit')) return isHD ? 'EK5' : 'EK3';

    return 'EL8'; // Default
}

// ===== FUNCIÓN: EXTRAER 4 DÍGITOS =====
function extraer4Digitos(codigo) {
    const numeros = codigo.replace(/[^0-9]/g, '');
    
    if (numeros.length === 0) return '0000';
    if (numeros.length >= 4) return numeros.slice(-4);
    
    return numeros.padStart(4, '0');
}

// ===== FUNCIÓN: TRANSFORMAR A ELIMFILTERS =====
function transformarAELIMFILTERS(gemaData, sku, inputCode) {
    const mediaType = gemaData.mediaType || 'Standard';
    const elimMediaType = mediaType.includes('ELIMTEK') 
        ? mediaType 
        : 'ELIMTEK™ MultiCore';

    const filterType = gemaData.filterType || 'Filter';
    const description = `ELIMFILTERS ${sku} ${filterType.toLowerCase()} meets or exceeds OE performance requirements and the new challenges of modern engine technology.`;

    return {
        sku: sku,
        inputCode: inputCode,
        filterType: gemaData.filterType,
        description: description,
        specifications: transformarSpecifications(gemaData.specifications, elimMediaType),
        equipment: gemaData.equipment || [],
        oemCross: gemaData.oemCross || {},
        crossReference: gemaData.crossReference || [],
        maintenanceKits: generarKits(sku, gemaData),
        createdAt: new Date().toISOString()
    };
}

// ===== FUNCIÓN: TRANSFORMAR SPECIFICATIONS =====
function transformarSpecifications(specs, elimMediaType) {
    if (!specs || !Array.isArray(specs)) return [];

    const transformed = specs.map(spec => ({
        label: spec.label,
        value: spec.value
    }));

    const mediaIndex = transformed.findIndex(s => 
        s.label.toLowerCase().includes('media')
    );

    if (mediaIndex >= 0) {
        transformed[mediaIndex].value = elimMediaType;
    } else {
        transformed.push({
            label: 'Media Type',
            value: elimMediaType
        });
    }

    return transformed;
}

// ===== FUNCIÓN: GENERAR KITS =====
function generarKits(sku, gemaData) {
    if (sku.startsWith('EL8')) {
        const kitNumber = sku.replace('EL8', 'EK5');
        return [{
            code: kitNumber,
            description: 'Heavy Duty complete maintenance kit - Oil filter + Air filter + Fuel filter'
        }];
    }
    return gemaData.maintenanceKits || [];
}

// ===== FUNCIÓN: GUARDAR EN MONGODB =====
async function guardarEnMongoDB(elimData) {
    try {
        const collection = mongoDb.collection(MONGODB_COLLECTION);
        
        await collection.insertOne({
            sku: elimData.sku,
            inputCode: elimData.inputCode,
            filterType: elimData.filterType,
            description: elimData.description,
            specifications: elimData.specifications || [],
            equipment: elimData.equipment || [],
            oemCross: elimData.oemCross || {},
            crossReference: elimData.crossReference || [],
            maintenanceKits: elimData.maintenanceKits || [],
            createdAt: elimData.createdAt,
            updatedAt: elimData.updatedAt
        });
        
        return true;
    } catch (error) {
        console.error('Error guardando en MongoDB:', error);
        throw error;
    }
}

// ===== FUNCIÓN: GUARDAR EN GOOGLE SHEETS =====
async function guardarEnSheets(elimData) {
    try {
        const values = [[
            elimData.sku,
            elimData.inputCode,
            elimData.filterType,
            elimData.description,
            JSON.stringify(elimData.specifications),
            JSON.stringify(elimData.equipment),
            JSON.stringify(elimData.oemCross),
            JSON.stringify(elimData.crossReference),
            elimData.createdAt
        ]];

        await sheetsClient.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'SKUs!A:I',
            valueInputOption: 'RAW',
            resource: { values }
        });

        return true;
    } catch (error) {
        console.error('Error guardando en Google Sheets:', error);
        throw error;
    }
}

// ===== FUNCIÓN: FORMATEAR RESPUESTA =====
function formatearRespuesta(documento) {
    return {
        sku: documento.sku,
        filterType: documento.filterType,
        description: documento.description,
        specifications: documento.specifications || [],
        equipment: documento.equipment || [],
        oemCross: documento.oemCross || {},
        crossReference: documento.crossReference || [],
        maintenanceKits: documento.maintenanceKits || []
    };
}

// ===== INICIALIZACIÓN =====
async function start() {
    try {
        console.log('🚀 Iniciando servidor Railway ELIMFILTERS...');
        
        if (!MONGODB_URI) throw new Error('MONGODB_URI no configurado');
        if (!GEMA_TOKEN) console.warn('⚠️ GEMA_BEARER_TOKEN no configurado');
        if (!GOOGLE_CREDENTIALS.type) throw new Error('GOOGLE_SHEETS_CREDENTIALS no configurado');

        await initMongoDB();
        await initGoogleSheets();

        app.listen(PORT, () => {
            console.log(`✅ Servidor escuchando en puerto ${PORT}`);
            console.log(`📡 GEMA: ${GEMA_URL}`);
            console.log('Sistema listo ✨');
        });

    } catch (error) {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    }
}

process.on('SIGTERM', async () => {
    if (mongoClient) await mongoClient.close();
    process.exit(0);
});

start();
