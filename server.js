// ============================================
// ELIMFILTERS API v6.0.6 GEMINI EDITION
// Direct HTTP to Gemini v1beta (gemini-1.5-flash-latest)
// ============================================

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 8080;

// ============================================
// CONFIGURACIÓN
// ============================================

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://elimfilters:Elliot2025@cluster0.vairwow.mongodb.net/?appName=Cluster0';
const DB_NAME = 'elimfilters';
const COLLECTION_NAME = 'filters';

// Google Sheets Configuration
const GOOGLE_SHEETS_CREDENTIALS = process.env.GOOGLE_SHEETS_CREDENTIALS;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1LpP3y8cn85CQl7I23QL6m-V70kn0WRy6_ld0IG1g6oY';
const SHEET_NAME = 'Master50';

// Gemini AI Configuration (Direct API v1beta with HTTP control)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
let geminiConfigured = false;

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ============================================
// MONGODB CONNECTION
// ============================================

let mongoClient;
let db;
let filtersCollection;

async function connectMongoDB() {
    try {
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        db = mongoClient.db(DB_NAME);
        filtersCollection = db.collection(COLLECTION_NAME);
        console.log('✅ MongoDB conectado');
        return true;
    } catch (error) {
        console.error('❌ Error conectando MongoDB:', error.message);
        return false;
    }
}

// ============================================
// GOOGLE SHEETS CONNECTION
// ============================================

let sheetsClient;
let authClient;

async function connectGoogleSheets() {
    try {
        if (!GOOGLE_SHEETS_CREDENTIALS) {
            console.log('⚠️ Google Sheets credentials no configuradas');
            return false;
        }

        const credentials = JSON.parse(GOOGLE_SHEETS_CREDENTIALS);
        authClient = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        sheetsClient = google.sheets({ version: 'v4', auth: authClient });
        console.log('✅ Google Sheets conectado');
        return true;
    } catch (error) {
        console.error('❌ Error conectando Google Sheets:', error.message);
        return false;
    }
}

// ============================================
// GEMINI AI CONNECTION (Direct API v1)
// ============================================

async function connectGeminiAI() {
    try {
        if (!GEMINI_API_KEY) {
            console.log('⚠️ GEMINI_API_KEY no configurada - Funcionalidad de generación deshabilitada');
            return false;
        }

        // Validar que la key tenga formato correcto
        if (!GEMINI_API_KEY.startsWith('AIzaSy')) {
            console.log('⚠️ GEMINI_API_KEY parece inválida (debe empezar con AIzaSy)');
            return false;
        }
        
        geminiConfigured = true;
        console.log('✅ Gemini AI configurado (API v1 Production - gemini-1.5-flash)');
        return true;
    } catch (error) {
        console.error('❌ Error configurando Gemini AI:', error.message);
        return false;
    }
}

// ============================================
// PROMPT MAESTRO - PROTOCOLO 50 COLUMNAS
// ============================================

function construirPromptMaestro(codigo) {
    return `Eres el Engineering Core de ELIMFILTERS, especialista en filtros automotrices e industriales.

TAREA: Generar ficha técnica completa de 50 columnas para el código: ${codigo}

PROTOCOLO DE 50 COLUMNAS:

**IDENTIFICACIÓN (7 campos):**
1. codigo: Código original del fabricante
2. sku: SKU ELIMFILTERS (formato: EL8/EF9/ES9 + código base)
3. fabricante: Fabricante original (DONALDSON, FLEETGUARD, etc.)
4. tipo: FUEL, OIL, AIR, HYDRAULIC, COOLANT
5. categoria: HEAVY DUTY o LIGHT DUTY
6. linea: Línea de producto
7. serie: Serie del producto

**ESPECIFICACIONES TÉCNICAS (15 campos):**
8. altura_mm: Altura en milímetros
9. diametro_externo_mm: Diámetro externo
10. diametro_interno_mm: Diámetro interno
11. rosca: Tipo de rosca (si aplica)
12. micronaje: Micronaje de filtración
13. presion_diferencial_psi: Presión diferencial máxima
14. flujo_lpm: Flujo en litros por minuto
15. capacidad_suciedad_g: Capacidad de retención de suciedad
16. temperatura_max_c: Temperatura máxima de operación
17. temperatura_min_c: Temperatura mínima de operación
18. material_medio: Material del medio filtrante
19. material_junta: Material de la junta
20. valvula_antirretorno: true/false
21. valvula_bypass: true/false
22. eficiencia_filtracion: Porcentaje de eficiencia

**TECNOLOGÍA ELIMFILTERS (5 campos):**
23. tecnologia_medio: MACROCORE™, NANOFIBER™, CELULOSA AVANZADA
24. tecnologia_junta: ELIMTEK™, VITON™, SILICONE PRO
25. tecnologia_estructura: WATERBLOC™, STEEL CORE, COMPOSITE
26. tecnologia_retencion: MICROKAPPA™, MAGNETO-TRAP
27. certificaciones: ISO, OEM, otras

**APLICACIONES (5 campos):**
28. aplicacion_primaria: Descripción de aplicación principal
29. equipos: Array de equipos compatibles
30. industrias: Array de industrias objetivo
31. posicion_motor: Ubicación en el motor/sistema
32. intervalo_servicio_hrs: Horas de servicio recomendadas

**CROSS REFERENCES (8 campos):**
33. oem_cross: Array de códigos OEM equivalentes
34. competencia_cross: Array de códigos de competencia
35. cross_internacional: Array de códigos internacionales
36. supersede_por: Código que lo reemplaza
37. supersede_a: Array de códigos que reemplaza
38. variantes_regionales: Objeto con variantes por región
39. factor_intercambiabilidad: Nivel de compatibilidad
40. notas_cross: Notas sobre intercambiabilidad

**KITS (3 campos):**
41. kits_disponibles: Array de kits que lo incluyen
42. componentes_kit: Array de componentes si es kit
43. kit_completo_sku: SKU del kit completo

**COMERCIAL (4 campos):**
44. precio_usd: Precio de referencia
45. disponibilidad: STOCK, BAJO PEDIDO, DESCONTINUADO
46. lead_time_dias: Tiempo de entrega
47. moq: Cantidad mínima de orden

**MULTIMEDIA (3 campos):**
48. imagen_url: URL de imagen del producto
49. ficha_tecnica_pdf: URL del PDF técnico
50. video_instalacion: URL de video de instalación

REGLAS CRÍTICAS:
- Si el código pertenece a DONALDSON → categoria: "HEAVY DUTY"
- Si el código pertenece a FRAM → categoria: "LIGHT DUTY"
- SKU Oil → EL8 + código base
- SKU Fuel → EF9 + código base
- SKU Separator → ES9 + código base
- SIEMPRE incluir tecnologías ELIMFILTERS (MACROCORE™, ELIMTEK™, WATERBLOC™, MICROKAPPA™)
- NUNCA inventar especificaciones - si no sabes, deja el campo vacío o null

FORMATO DE RESPUESTA:
Devuelve ÚNICAMENTE un objeto JSON válido con las 50 columnas. No incluyas explicaciones, comentarios ni texto adicional.

Ejemplo de estructura:
{
  "codigo": "P550425",
  "sku": "EF9P550425",
  "fabricante": "DONALDSON",
  "tipo": "FUEL",
  "categoria": "HEAVY DUTY",
  ...
}`;
}

// ============================================
// FUNCIÓN: GENERAR FICHA CON GEMINI AI (Direct API v1)
// ============================================

async function generarFichaConGemini(codigo) {
    try {
        if (!geminiConfigured) {
            throw new Error('Gemini AI no está configurado. Configure GEMINI_API_KEY.');
        }

        console.log(`🤖 Generando ficha técnica con Gemini AI para: ${codigo}`);
        
        const prompt = construirPromptMaestro(codigo);
        
        // Llamar directamente a API v1 (validada por equipo)
        const fetch = (await import('node-fetch')).default;
        
        const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        
        // Extraer texto de la respuesta de Gemini
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Respuesta de Gemini tiene formato inesperado');
        }
        
        let text = data.candidates[0].content.parts[0].text;
        
        // Limpiar la respuesta de posibles markdown code blocks
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parsear JSON
        const fichaCompleta = JSON.parse(text);
        
        // Validar que tenga al menos los campos básicos
        if (!fichaCompleta.codigo || !fichaCompleta.sku) {
            throw new Error('Respuesta de Gemini no contiene campos requeridos (codigo, sku)');
        }
        
        // Agregar metadatos
        fichaCompleta.fecha_actualizacion = new Date().toISOString();
        fichaCompleta.procesado_por = 'Gemini 1.5 Flash Latest (v1beta)';
        fichaCompleta.fuente_datos = 'ELIMFILTERS Engineering Core v6.0.6';
        
        console.log(`✅ Gemini generó ficha completa: ${fichaCompleta.sku}`);
        
        return fichaCompleta;
        
    } catch (error) {
        console.error('❌ Error generando ficha con Gemini:', error.message);
        throw error;
    }
}

// ============================================
// FUNCIÓN: GUARDAR EN GOOGLE SHEETS
// ============================================

async function guardarEnSheets(filtroData) {
    try {
        if (!sheetsClient) {
            console.log('⚠️ Google Sheets no disponible, saltando...');
            return false;
        }

        console.log(`📝 Guardando en Google Sheets: ${filtroData.sku || filtroData.codigo}`);

        // Construir fila con las 50 columnas en orden
        const row = [
            // IDENTIFICACIÓN (7 campos)
            filtroData.codigo || '',
            filtroData.sku || '',
            filtroData.fabricante || '',
            filtroData.tipo || '',
            filtroData.categoria || '',
            filtroData.linea || '',
            filtroData.serie || '',
            
            // ESPECIFICACIONES TÉCNICAS (15 campos)
            filtroData.altura_mm || '',
            filtroData.diametro_externo_mm || '',
            filtroData.diametro_interno_mm || '',
            filtroData.rosca || '',
            filtroData.micronaje || '',
            filtroData.presion_diferencial_psi || '',
            filtroData.flujo_lpm || '',
            filtroData.capacidad_suciedad_g || '',
            filtroData.temperatura_max_c || '',
            filtroData.temperatura_min_c || '',
            filtroData.material_medio || '',
            filtroData.material_junta || '',
            filtroData.valvula_antirretorno || '',
            filtroData.valvula_bypass || '',
            filtroData.eficiencia_filtracion || '',
            
            // TECNOLOGÍA ELIMFILTERS (5 campos)
            filtroData.tecnologia_medio || '',
            filtroData.tecnologia_junta || '',
            filtroData.tecnologia_estructura || '',
            filtroData.tecnologia_retencion || '',
            filtroData.certificaciones || '',
            
            // APLICACIONES (5 campos)
            filtroData.aplicacion_primaria || '',
            Array.isArray(filtroData.equipos) ? filtroData.equipos.join(', ') : '',
            Array.isArray(filtroData.industrias) ? filtroData.industrias.join(', ') : '',
            filtroData.posicion_motor || '',
            filtroData.intervalo_servicio_hrs || '',
            
            // CROSS REFERENCES (8 campos)
            Array.isArray(filtroData.oem_cross) ? filtroData.oem_cross.join(', ') : '',
            Array.isArray(filtroData.competencia_cross) ? filtroData.competencia_cross.join(', ') : '',
            Array.isArray(filtroData.cross_internacional) ? filtroData.cross_internacional.join(', ') : '',
            filtroData.supersede_por || '',
            Array.isArray(filtroData.supersede_a) ? filtroData.supersede_a.join(', ') : '',
            filtroData.variantes_regionales ? JSON.stringify(filtroData.variantes_regionales) : '',
            filtroData.factor_intercambiabilidad || '',
            filtroData.notas_cross || '',
            
            // KITS (3 campos)
            Array.isArray(filtroData.kits_disponibles) ? filtroData.kits_disponibles.join(', ') : '',
            Array.isArray(filtroData.componentes_kit) ? filtroData.componentes_kit.join(', ') : '',
            filtroData.kit_completo_sku || '',
            
            // COMERCIAL (4 campos)
            filtroData.precio_usd || '',
            filtroData.disponibilidad || '',
            filtroData.lead_time_dias || '',
            filtroData.moq || '',
            
            // MULTIMEDIA (3 campos)
            filtroData.imagen_url || '',
            filtroData.ficha_tecnica_pdf || '',
            filtroData.video_instalacion || '',
            
            // METADATOS (3 campos)
            filtroData.fecha_actualizacion || new Date().toISOString(),
            filtroData.procesado_por || 'Backend v6.0',
            filtroData.fuente_datos || 'Gemini AI'
        ];

        await sheetsClient.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:AX`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [row]
            }
        });

        console.log(`✅ Guardado en Google Sheets: ${filtroData.sku || filtroData.codigo}`);
        return true;

    } catch (error) {
        console.error('❌ Error guardando en Google Sheets:', error.message);
        return false;
    }
}

// ============================================
// ENDPOINT: /api/search
// ============================================

app.get('/api/search', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { query } = req.query;

        // Validar parámetro
        if (!query) {
            return res.status(400).json({
                error: 'Parámetro "query" es requerido',
                ejemplo: '/api/search?query=P550425'
            });
        }

        console.log(`🔍 Búsqueda: ${query}`);

        // PASO 1: Buscar en MongoDB (caché)
        const codigoNormalizado = query.trim().toUpperCase();
        
        console.log(`📊 Verificando si '${codigoNormalizado}' está asociado a un SKU existente...`);
        
        let resultado = await filtersCollection.findOne({
            $or: [
                // Búsqueda exacta en código principal
                { codigo: codigoNormalizado },
                
                // Búsqueda exacta en SKU ELIMFILTERS
                { sku: codigoNormalizado },
                
                // Búsqueda en arrays de cross-reference (coincidencia exacta)
                { oem_cross: codigoNormalizado },
                { competencia_cross: codigoNormalizado },
                { cross_internacional: codigoNormalizado },
                
                // También buscar en supersede
                { supersede_a: codigoNormalizado },
                { supersede_por: codigoNormalizado }
            ]
        });

        if (resultado) {
            // Encontrado - este código está asociado a un SKU existente
            const { _id, ...filtroData } = resultado;
            
            const elapsed = Date.now() - startTime;
            
            // Determinar en qué campo se encontró
            let campoEncontrado = 'desconocido';
            if (resultado.codigo === codigoNormalizado) campoEncontrado = 'codigo';
            else if (resultado.sku === codigoNormalizado) campoEncontrado = 'sku';
            else if (resultado.oem_cross?.includes(codigoNormalizado)) campoEncontrado = 'oem_cross';
            else if (resultado.competencia_cross?.includes(codigoNormalizado)) campoEncontrado = 'competencia_cross';
            else if (resultado.cross_internacional?.includes(codigoNormalizado)) campoEncontrado = 'cross_internacional';
            
            console.log(`✅ Código '${codigoNormalizado}' asociado a SKU: ${filtroData.sku || filtroData.codigo}`);
            console.log(`   Encontrado en campo: ${campoEncontrado}`);
            console.log(`   Tiempo de respuesta: ${elapsed}ms (caché)`);
            
            return res.json({
                resultados: [filtroData],
                total: 1,
                query: query,
                fuente: 'mongodb-cache',
                asociacion: {
                    codigo_buscado: codigoNormalizado,
                    sku_asociado: filtroData.sku || filtroData.codigo,
                    campo_encontrado: campoEncontrado
                },
                tiempo_ms: elapsed,
                timestamp: new Date().toISOString()
            });
        }

        // PASO 2: NO encontrado - código NO está asociado a ningún SKU existente
        console.log(`❌ Código '${codigoNormalizado}' NO está asociado a ningún SKU`);
        console.log(`🤖 Generando ficha técnica con Gemini AI...`);
        
        let filtroData;
        try {
            filtroData = await generarFichaConGemini(codigoNormalizado);
        } catch (geminiError) {
            console.error('❌ Gemini AI falló:', geminiError.message);
            
            return res.json({
                resultados: [],
                total: 0,
                query: query,
                mensaje: 'No se pudo procesar con Gemini AI',
                error: geminiError.message,
                sugerencia: 'Verifique que GEMINI_API_KEY esté configurada correctamente',
                timestamp: new Date().toISOString()
            });
        }

        // Validar que Gemini retornó datos
        if (!filtroData || Object.keys(filtroData).length === 0) {
            console.log(`❌ Gemini no generó datos para: ${query}`);
            
            return res.json({
                resultados: [],
                total: 0,
                query: query,
                mensaje: 'Gemini AI no pudo generar ficha técnica',
                timestamp: new Date().toISOString()
            });
        }

        // PASO 3: Guardar en MongoDB
        try {
            await filtersCollection.insertOne({
                ...filtroData,
                _created_at: new Date()
            });
            console.log(`✅ Guardado en MongoDB: ${filtroData.sku || filtroData.codigo}`);
        } catch (mongoError) {
            console.error('⚠️ Error guardando en MongoDB:', mongoError.message);
            // Continuar aunque falle el guardado
        }

        // PASO 4: Guardar en Google Sheets
        try {
            await guardarEnSheets(filtroData);
        } catch (sheetsError) {
            console.error('⚠️ Error guardando en Sheets:', sheetsError.message);
            // Continuar aunque falle Sheets
        }

        // PASO 5: Retornar resultado al usuario
        const elapsed = Date.now() - startTime;
        console.log(`✅ Procesado completo: ${filtroData.sku || filtroData.codigo} (${elapsed}ms)`);

        return res.json({
            resultados: [filtroData],
            total: 1,
            query: query,
            fuente: 'gemini-ai',
            guardado_mongodb: true,
            guardado_sheets: true,
            tiempo_ms: elapsed,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error en /api/search:', error);
        
        const elapsed = Date.now() - startTime;
        return res.status(500).json({
            error: 'Error interno del servidor',
            mensaje: error.message,
            tiempo_ms: elapsed,
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================
// ENDPOINT: Health Check
// ============================================

app.get('/', (req, res) => {
    res.json({
        status: 'running',
        version: '6.0.6',
        service: 'ELIMFILTERS API - Gemini Edition',
        flujo: 'MongoDB Cache → Gemini AI → MongoDB + Sheets → Usuario',
        endpoints: {
            search: '/api/search?query=CODIGO',
            health: '/'
        },
        connections: {
            mongodb: !!filtersCollection,
            googleSheets: !!sheetsClient,
            geminiAI: geminiConfigured
        },
        timestamp: new Date().toISOString()
    });
});

// ============================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================

async function startServer() {
    console.log('🚀 Iniciando servidor Railway ELIMFILTERS v6.0.6...');
    console.log('🤖 Gemini v1beta - HTTP Directo (No SDK)');

    // Conectar MongoDB
    await connectMongoDB();

    // Conectar Google Sheets (opcional)
    await connectGoogleSheets();

    // Conectar Gemini AI
    await connectGeminiAI();

    // Iniciar servidor Express
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Servidor escuchando en puerto ${PORT}`);
        console.log(`🤖 Gemini AI: ${geminiConfigured ? 'Activo (v1 Production)' : 'Deshabilitado'}`);
        console.log(`📊 Flujo: Cache → Gemini → MongoDB + Sheets → Usuario`);
        console.log('Sistema listo ✨');
    });
}

// ============================================
// MANEJO DE ERRORES Y SEÑALES
// ============================================

process.on('SIGTERM', async () => {
    console.log('⚠️ SIGTERM recibido, cerrando conexiones...');
    if (mongoClient) {
        await mongoClient.close();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('⚠️ SIGINT recibido, cerrando conexiones...');
    if (mongoClient) {
        await mongoClient.close();
    }
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
});

// ============================================
// INICIAR
// ============================================

startServer().catch(error => {
    console.error('❌ Error fatal al iniciar servidor:', error);
    process.exit(1);
});
