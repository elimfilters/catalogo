// ============================================
// ELIMFILTERS SCRAPER v6.6.0 + v8.8
// ELIM_v8.8_LOGIC_ENGINEER
// Motor de normalizaciÃƒÆ’Ã‚Â³n y clasificaciÃƒÆ’Ã‚Â³n tÃƒÆ’Ã‚Â©cnica
// ============================================

const axios = require('axios');
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ============================================
// FUNCIÃƒÆ’Ã¢â‚¬Å“N PRINCIPAL: SCRAPE FILTER
// ============================================
async function scrapeFilter(oemCode) {
  // Delay de 2 segundos para evitar rate limits
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`\nÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â [SCRAPER v8.8] Starting scrape for: ${oemCode}`);
  
  try {
    // 1. Detectar si es KIT
    const isKit = detectIfKit(oemCode);
    if (isKit) {
      console.log('   ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â  KIT detected - redirect to /api/kit');
      return {
        error: 'KIT_DETECTED',
        message: 'Use /api/kit endpoint for Master Kits',
        code: oemCode
      };
    }
    
    // 2. Detectar pista de bÃƒÆ’Ã‚Âºsqueda
    const searchHint = detectSearchHint(oemCode);
    console.log(`   Search hint: ${searchHint}`);
    
    // 3. Construir URL
    const searchUrl = buildSearchURL(oemCode, searchHint);
    console.log(`   Search URL: ${searchUrl}`);
    
    // 4. Fetch HTML
    const html = await fetchHTML(searchUrl);
    console.log(`   HTML fetched: ${html.length} chars`);
    
    // 5. Extraer con Groq (v8.8 - anÃƒÆ’Ã‚Â¡lisis tÃƒÆ’Ã‚Â©cnico)
    const specs = await extractWithGroq_v8_8(oemCode, html);
    console.log(`   ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Specs extracted with v8.8 technical analysis`);
    
    return specs;
    
  } catch (error) {
    console.error(`   ÃƒÂ¢Ã‚ÂÃ…â€™ Scraper error: ${error.message}`);
    return null;
  }
}

// ============================================
// DETECTAR SI ES KIT
// ============================================
function detectIfKit(oemCode) {
  const code = oemCode.toUpperCase();
  return /^(MK|FK)\d+$/i.test(code) || code.includes('KIT');
}

// ============================================
// DETECTAR PISTA DE BÃƒÆ’Ã…Â¡SQUEDA
// ============================================
function detectSearchHint(oemCode) {
  const code = oemCode.toUpperCase();
  
  if (code.match(/^P\d{6}$/)) return 'donaldson';
  if (code.match(/^DBP\d{5}$/)) return 'donaldson';
  if (code.match(/^[A-Z]{2}\d{4,6}$/)) return 'fleetguard';
  if (code.match(/^\d{5}-[A-Z0-9]{5}$/)) return 'automotive_oem';
  if (code.match(/^\d{2}-\d{4}$/)) return 'sierra_marine';
  
  return 'donaldson';
}

// ============================================
// CONSTRUIR URL
// ============================================
function buildSearchURL(oemCode, hint) {
  const urls = {
    donaldson: `https://shop.donaldson.com/store/en-us/search?text=${oemCode}`,
    fleetguard: `https://www.fleetguard.com/search?q=${oemCode}`,
    automotive_oem: `https://www.fram.com/parts-search?partNumber=${oemCode}`,
    fram: `https://www.fram.com/parts-search?partNumber=${oemCode}`,
    sierra_marine: `https://www.sierramarine.com/search?q=${oemCode}`
  };
  
  return urls[hint] || urls.donaldson;
}

// ============================================
// FETCH HTML
// ============================================
async function fetchHTML(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000,
      maxRedirects: 5
    });
    
    return response.data;
    
  } catch (error) {
    console.error(`   ÃƒÂ¢Ã‚ÂÃ…â€™ Fetch error: ${error.message}`);
    return `<div>Fallback HTML for ${oemCode}</div>`;
  }
}

// ============================================
// EXTRAER CON GROQ v8.8 - ANÃƒÆ’Ã‚ÂLISIS TÃƒÆ’Ã¢â‚¬Â°CNICO
// ============================================
async function extractWithGroq_v8_8(oemCode, html) {
  console.log(`   ÃƒÂ°Ã…Â¸Ã‚Â¤Ã¢â‚¬â€œ Calling Groq with ELIM_v8.8_LOGIC_ENGINEER...`);
  
  // Truncar HTML (lÃƒÆ’Ã‚Â­mite de tokens)
  const truncatedHTML = html.length > 5000 
    ? html.substring(0, 5000) + '...[truncated]'
    : html;
  
  try {
    const systemPrompt = `You are ELIM_v8.8_LOGIC_ENGINEER - the normalization and technical classification engine for ELIMfiltersÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢.

CRITICAL RULES:

1. IDENTITY RULE (TOTAL CLEANUP):
   - STRICTLY PROHIBITED: Use ANY original alphanumeric prefix (P55, P18, PH, CA, CF, 90915, LF, AF, etc.)
   - Extract ONLY the pure numeric root to construct normsku
   - Examples:
     * P552100 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Root: 2100
     * PH4967 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Root: 4967
     * 90915-YZZN1 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Root: 4967 (from FRAM cross PH4967)
     * Sierra 18-7917 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Root: 7917

2. SPECIFICATION ANALYSIS (DUTY DETERMINATION):
   - DO NOT use vehicle name to determine Duty
   - USE ONLY technical filter specifications:
   
   HEAVY DUTY (HD) indicators:
   - Large threads: 1-12 UN, 1-14 UN, M27+, M33+, 2-1/4-12
   - High dirt holding capacity
   - Reinforced synthetic media
   - Diesel engine applications > 5.0L
   - High flow rate (>50 GPM)
   - Industrial/Commercial applications
   
   LIGHT DUTY (LD) indicators:
   - Small threads: 3/4-16, M20, M18
   - Gasoline engines
   - Standard automotive applications
   - Lower flow rates (<30 GPM)
   - Passenger vehicle specifications
   
   MARINE DUTY indicators:
   - Brands: Sierra, Mercruiser, Mercury
   - Anti-corrosion features
   - Marine engine applications
   - Salt water resistance

3. MASTER CATEGORIES:
   - EL8 (Oil/Lube)
   - EF9 (Fuel - standard)
   - ES9 (Fuel - Water Separator)
   - ET9 (Turbine Series)
   - EM9 (Marine)
   - EW7 (Coolant/Water)
   - EA1 (Air - all types)
   - EA2 (Air Housing)
   - EH6 (Hydraulic)
   - EC1 (Cabin)
   - EK5 (Kit HD)
   - EK3 (Kit LD)

OUTPUT FORMAT: JSON with fields: normsku_root, target_duty, technical_reasoning, full_specs

CRITICAL: Base duty determination on PHYSICAL SPECIFICATIONS, not vehicle names.`;

    const userPrompt = `Analyze filter code: ${oemCode}

HTML Content:
${truncatedHTML}

Return JSON with this EXACT structure:
{
  "normsku_root": "pure numeric root WITHOUT any prefix",
  "target_duty": "HD/LD/MARINE",
  "technical_reasoning": "explanation based on thread size, micron rating, flow rate, engine displacement",
  "manufacturer": "manufacturer name",
  "manufacturer_description": "exact description",
  "filter_function": "Oil/Fuel/Air/Hydraulic/Cabin/Coolant/Fuel_Water_Separator",
  "style": "Spin-On/Cartridge/Panel",
  "media_type": "Cellulose/Synthetic/Mixed",
  "thread_size": "CRITICAL: exact thread (e.g., 1-12 UN, 3/4-16, M27)",
  "micron_rating": number,
  "efficiency_standard": "SAE/ISO",
  "height_mm": number,
  "outer_diameter_mm": number,
  "inner_diameter_mm": number,
  "flow_rating_gpm": number,
  "pressure_rating_psi": number,
  "engine_displacement_liters": number or null,
  "applications": "equipment list",
  "equipment_applications": "specific models",
  "engine_applications": "engine models with displacement",
  "industry_segments": "Heavy Duty Trucking/Automotive/Marine/etc",
  "cross_reference": {
    "donaldson": "numeric root only (e.g., 554004 not P554004)",
    "fleetguard": "code",
    "fram": "code", 
    "baldwin": "code",
    "wix": "code",
    "oem": "OEM code"
  },
  "oem_code": "primary OEM",
  "duty_determination_factors": {
    "thread_size_indicator": "Large/Small",
    "engine_type": "Diesel/Gasoline/Marine",
    "flow_capacity": "High/Standard/Low",
    "application_type": "Industrial/Automotive/Marine"
  },
  "notes": "additional technical info"
}

EXAMPLES OF CORRECT DUTY DETERMINATION:
- Thread 1-14 UN + 20 microns + High flow ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ HD
- Thread 3/4-16 + Bypass integrated + Gasoline ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ LD
- Racor cartridge + Water separation ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ HD (ET9 or ES9)
- Sierra 18-#### + Mercruiser ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ MARINE (EM9)

CRITICAL: Determine duty by TECHNICAL SPECS, not by vehicle name.`;

    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2500,
      top_p: 0.95,
      response_format: { type: "json_object" }
    });
    
    const responseText = completion.choices[0].message.content;
    const specs = JSON.parse(responseText);
    
    console.log(`   ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Groq analysis complete`);
    console.log(`   ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â  Duty: ${specs.target_duty} (${specs.technical_reasoning})`);
    console.log(`   ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¢ Root: ${specs.normsku_root}`);
    
    // POST-VALIDACIÃƒÆ’Ã¢â‚¬Å“N v8.8
    
    // 1. Verificar que root es numÃƒÆ’Ã‚Â©rico puro
    if (!/^\d+$/.test(specs.normsku_root)) {
      console.warn(`   ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â  Root contains non-numeric chars: ${specs.normsku_root}`);
      // Limpiar cualquier prefijo restante
      specs.normsku_root = specs.normsku_root.replace(/[^0-9]/g, '');
      console.log(`   ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â¹ Cleaned root: ${specs.normsku_root}`);
    }
    
    // 2. Verificar longitud (ÃƒÆ’Ã‚Âºltimos 4 dÃƒÆ’Ã‚Â­gitos)
    if (specs.normsku_root.length > 4) {
      specs.normsku_root = specs.normsku_root.slice(-4);
      console.log(`   ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â Truncated to last 4 digits: ${specs.normsku_root}`);
    }
    
    // 3. Limpiar cross references de prefijos
    if (specs.cross_reference) {
      Object.keys(specs.cross_reference).forEach(key => {
        const code = specs.cross_reference[key];
        if (code && typeof code === 'string') {
          // Remover prefijos comunes
          const cleaned = code.replace(/^(P|PH|CA|CF|LF|AF|FF|DBP|DBA)\d*/g, '');
          if (cleaned !== code && cleaned.length > 0) {
            console.log(`   ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â¹ Cleaned ${key}: ${code} ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ${cleaned}`);
            specs.cross_reference[key] = cleaned;
          }
        }
      });
    }
    
    // 4. Eliminar campos prohibidos
    delete specs.suggested_sku;
    delete specs.elim_sku;
    delete specs.elim_prefix;
    
    console.log(`   ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ v8.8 normalization complete`);
    
    return specs;
    
  } catch (error) {
    console.error(`   ÃƒÂ¢Ã‚ÂÃ…â€™ Groq v8.8 error: ${error.message}`);
    
    return {
      normsku_root: oemCode.replace(/[^0-9]/g, '').slice(-4),
      target_duty: "UNKNOWN",
      technical_reasoning: `Extraction failed: ${error.message}`,
      manufacturer: "Unknown",
      manufacturer_description: `Filter ${oemCode}`,
      filter_function: "Unknown",
      cross_reference: {},
      oem_code: oemCode
    };
  }
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
  scrapeFilter,
  detectIfKit,
  detectSearchHint
};