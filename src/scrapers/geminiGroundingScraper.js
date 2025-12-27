// ============================================================================
// GEMINI 2.0 FLASH + GOOGLE SEARCH GROUNDING - TIER GRATUITO
// Optimizado para límites gratuitos de Google AI Studio
// ============================================================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { determineDuty } = require('../utils/determineDuty');

// ============================================================================
// CONFIGURACIÓN - TIER GRATUITO GEMINI 2.0 FLASH
// ============================================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Rate limiting simple
let requestCount = 0;
let lastMinute = Date.now();

async function rateLimitCheck() {
  const now = Date.now();
  if (now - lastMinute > 60000) {
    requestCount = 0;
    lastMinute = now;
  }
  
  if (requestCount >= 14) {
    const waitTime = 60000 - (now - lastMinute);
    console.log(`[RATE LIMIT] ⏳ Esperando ${Math.ceil(waitTime/1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    requestCount = 0;
    lastMinute = Date.now();
  }
  
  requestCount++;
}

const ELIMFILTERS_TECH = {
  'OIL': 'ELIMTEK™ EXTENDED 99%',
  'FUEL': 'ELIMTEK™ EXTENDED 99%',
  'HYDRAULIC': 'ELIMTEK™ EXTENDED 99%',
  'COOLANT': 'ELIMTEK™ EXTENDED 99%',
  'SEPARATOR': 'ELIMTEK™ EXTENDED 99%',
  'AIR': 'MACROCORE™',
  'CABIN': 'MICROKAPPA™',
  'MARINE': 'ELIMTEK™ EXTENDED 99%',
  'TURBINE': 'ELIMTEK™ EXTENDED 99%',
  'AIR_HOUSING': 'MACROCORE™',
  'KIT': 'ELIMTEK™ MAINTENANCE KIT'
};

// ============================================================================
// SCRAPER CON GEMINI 2.0 FLASH + GOOGLE SEARCH GROUNDING
// ============================================================================
async function scrapeWithGemini(codigo, manufacturer) {
  const normalized = String(codigo).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  console.log(`[GEMINI GROUNDING] 🔍 Buscando: ${normalized} en ${manufacturer}`);
  
  try {
    await rateLimitCheck();
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      tools: [{
        googleSearch: {}
      }]
    });
    
    const sites = {
      'DONALDSON': 'shop.donaldson.com',
      'FRAM': 'www.fram.com',
      'FLEETGUARD': 'www.fleetguard.com'
    };
    
    const site = sites[manufacturer] || 'shop.donaldson.com';
    
    const prompt = `Search "${normalized}" on ${site}. Extract filter data.

FILTER TYPE RULES:
1. Breadcrumb "Lube"/"Oil" → OIL
2. Breadcrumb "Fuel" → FUEL  
3. Title "Lube Filter"/"Oil Filter" → OIL
4. Cross-ref starts "LF" → OIL
5. Cross-ref starts "FS"/"FF" → FUEL

Return JSON (no markdown):
{
  "found": true/false,
  "url": "product page URL",
  "part": "part number",
  "breadcrumb": "category path",
  "title": "product title",
  "type": "OIL/FUEL/AIR/CABIN/HYDRAULIC/SEPARATOR",
  "xref": "cross-references comma-separated",
  "engines": "engine models",
  "equipment": "vehicles/equipment",
  "height": "value with unit",
  "od": "outer diameter",
  "thread": "thread size",
  "micron": "micron rating",
  "media": "media type"
}`;

    console.log(`[GEMINI] 🤖 Ejecutando búsqueda...`);
    
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const elapsed = Date.now() - startTime;
    
    console.log(`[GEMINI] ⏱️ Tiempo respuesta: ${elapsed}ms`);
    
    const response = await result.response;
    const responseText = response.text();
    
    const tokenCount = Math.ceil(responseText.length / 4);
    console.log(`[GEMINI] 📊 Tokens aprox: ${tokenCount}`);
    
    const cleanJson = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const data = JSON.parse(cleanJson);
    
    if (!data.found) {
      console.log(`[GEMINI] ❌ No encontrado: ${normalized}`);
      return { encontrado: false, razon: 'No encontrado' };
    }
    
    console.log(`[GEMINI] ✅ ${data.part} - ${data.type}`);
    console.log(`[GEMINI] 🔗 ${data.url}`);
    
    const verifiedType = verifyFilterType(
      data.breadcrumb,
      data.title,
      data.xref,
      data.type
    );
    
    const allText = `${data.title} ${data.breadcrumb} ${data.engines} ${data.equipment}`;
    const detectedDuty = determineDuty(
      data.engines || '',
      data.equipment || '',
      allText.toLowerCase()
    );
    
    const finalDuty = manufacturer === 'FRAM' ? 'LD' : detectedDuty;
    
    const description = generateELIMFILTERSDescription(
      verifiedType,
      finalDuty,
      data.engines,
      data.equipment
    );
    
    const datos = {
      query: codigo,
      norm: data.part || normalized,
      duty_type: finalDuty,
      type: verifiedType,
      subtype: 'STANDARD',
      description: description,
      
      oem_codes: '',
      cross_reference: parseCrossReferences(data.xref),
      
      media_type: normalizeMediaType(data.media),
      equipment_applications: data.equipment || '',
      engine_applications: data.engines || '',
      
      height_mm: convertToMM(data.height),
      outer_diameter_mm: convertToMM(data.od),
      thread_size: data.thread || null,
      micron_rating: data.micron || null,
      
      product_url: data.url || '',
      breadcrumb: data.breadcrumb || '',
      manufacturer: manufacturer,
      source: `${manufacturer}_GEMINI_GROUNDING`,
      timestamp: new Date().toISOString()
    };
    
    return { encontrado: true, datos };
    
  } catch (error) {
    console.error(`[GEMINI] ❌ Error:`, error.message);
    
    if (error.message.includes('429') || error.message.includes('quota')) {
      console.error(`[GEMINI] 🚫 RATE LIMIT alcanzado - esperar 1 minuto`);
    }
    
    return { encontrado: false, razon: error.message };
  }
}

// ============================================================================
// SCRAPERS PRINCIPALES
// ============================================================================

async function scrapeDonaldson(codigo) {
  console.log(`[DONALDSON GEMINI] 🤖 Iniciando: ${codigo}`);
  return await scrapeWithGemini(codigo, 'DONALDSON');
}

async function scrapeFRAM(codigo) {
  console.log(`[FRAM GEMINI] 🤖 Iniciando: ${codigo}`);
  return await scrapeWithGemini(codigo, 'FRAM');
}

async function scrapeFleetguard(codigo) {
  console.log(`[FLEETGUARD GEMINI] 🤖 Iniciando: ${codigo}`);
  return await scrapeWithGemini(codigo, 'FLEETGUARD');
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function verifyFilterType(breadcrumb, title, crossRefs, aiType) {
  const b = (breadcrumb || '').toLowerCase();
  const t = (title || '').toLowerCase();
  const c = (crossRefs || '').toLowerCase();
  
  if (b.includes('lube') || b.includes('oil')) return 'OIL';
  if (b.includes('fuel') && !b.includes('lube')) return 'FUEL';
  if (b.includes('air') && !b.includes('cabin')) return 'AIR';
  if (b.includes('cabin')) return 'CABIN';
  if (b.includes('hydraulic')) return 'HYDRAULIC';
  
  if (t.includes('lube filter') || t.includes('oil filter')) return 'OIL';
  if (t.includes('fuel filter')) return 'FUEL';
  if (t.includes('air filter')) return 'AIR';
  if (t.includes('cabin')) return 'CABIN';
  
  if (c.includes('lf')) return 'OIL';
  if (c.includes('fs') || c.includes('ff')) return 'FUEL';
  if (c.includes('af')) return 'AIR';
  if (c.includes('cf')) return 'CABIN';
  
  return normalizeFilterType(aiType);
}

function normalizeFilterType(type) {
  if (!type) return 'UNKNOWN';
  const t = type.toLowerCase();
  
  if (t.includes('oil') || t.includes('lube')) return 'OIL';
  if (t.includes('fuel')) return 'FUEL';
  if (t.includes('air') && !t.includes('cabin')) return 'AIR';
  if (t.includes('cabin')) return 'CABIN';
  if (t.includes('hydraulic')) return 'HYDRAULIC';
  if (t.includes('separator')) return 'SEPARATOR';
  
  return 'UNKNOWN';
}

function generateELIMFILTERSDescription(type, duty, engineApps, equipmentApps) {
  const tech = ELIMFILTERS_TECH[type] || 'ELIMTEK™ EXTENDED 99%';
  const apps = extractTopApplications(engineApps, equipmentApps);
  
  if (apps && apps.length > 0) {
    return `ELIMFILTERS ${type} Filter - ${tech} - ${apps}`;
  }
  
  const dutyText = duty === 'HD' ? 'Heavy Duty' : 'Light Duty';
  return `ELIMFILTERS ${type} Filter - ${tech} - ${dutyText}`;
}

function extractTopApplications(engineApps, equipmentApps) {
  const apps = [];
  
  if (engineApps) {
    const engines = engineApps.split(/[,;]/).map(e => e.trim()).filter(e => e.length > 2);
    apps.push(...engines.slice(0, 2));
  }
  
  if (equipmentApps && apps.length < 3) {
    const equipment = equipmentApps.split(/[,;]/).map(e => e.trim()).filter(e => e.length > 2);
    apps.push(...equipment.slice(0, 3 - apps.length));
  }
  
  const result = apps.slice(0, 3).join(', ');
  return result.length > 100 ? result.substring(0, 97) + '...' : result;
}

function parseCrossReferences(crossRefs) {
  if (!crossRefs) return [];
  return crossRefs.split(/[,;]/).map(c => c.trim()).filter(c => c.length > 2);
}

function normalizeMediaType(media) {
  if (!media) return 'STANDARD';
  const m = media.toLowerCase();
  
  if (m.includes('synthetic')) return 'SYNTHETIC';
  if (m.includes('cellulose')) return 'CELLULOSE';
  if (m.includes('nanofiber')) return 'NANOFIBER';
  
  return 'STANDARD';
}

function convertToMM(value) {
  if (!value) return null;
  
  const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return null;
  
  const original = String(value).toLowerCase();
  
  if (original.includes('in') || original.includes('"')) {
    return Math.round(num * 25.4);
  }
  
  return Math.round(num);
}

module.exports = {
  scrapeDonaldson,
  scrapeFRAM,
  scrapeFleetguard
};