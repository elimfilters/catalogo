// ============================================
// ELIMFILTERS SCRAPER v6.6.0 + v8.8
// ELIM_v8.8_LOGIC_ENGINEER
// Motor de normalización y clasificación técnica
// SIN WEB SCRAPING - Solo análisis con Groq
// ============================================

const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ============================================
// FUNCIÓN PRINCIPAL: SCRAPE FILTER
// ============================================
async function scrapeFilter(query) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`\n🔍 [SCRAPER v8.8] Analyzing: ${query}`);

  try {
    // 1. Detectar si es KIT
    const isKit = detectIfKit(query);
    if (isKit) {
      console.log('   ⚠️ KIT detected - redirect to /api/kit');
      return {
        error: 'KIT_DETECTED',
        message: 'Use /api/kit endpoint for Master Kits',
        code: query
      };
    }

    // 2. Analizar con Groq (sin HTML, solo el código OEM)
    const specs = await analyzeWithGroq(query);
    console.log(`   ✅ Analysis complete`);

    return specs;

  } catch (error) {
    console.error(`   ❌ Scraper error: ${error.message}`);
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
// DETECTAR PISTA DE BÚSQUEDA
// ============================================
function detectSearchHint(oemCode) {
  const code = oemCode.toUpperCase();

  if (code.match(/^P\d{6}$/)) return 'donaldson';
  if (code.match(/^DBP\d{5}$/)) return 'donaldson';
  if (code.match(/^[A-Z]{2}\d{4,6}$/)) return 'fleetguard';
  if (code.match(/^\d{5}-[A-Z0-9]{5}$/)) return 'automotive_oem';
  if (code.match(/^\d{2}-\d{4}$/)) return 'sierra_marine';

  return 'unknown';
}

// ============================================
// ANALIZAR CON GROQ (SIN WEB SCRAPING)
// ============================================
async function analyzeWithGroq(query) {
  console.log(`   🤖 Analyzing with Groq...`);

  try {
    const systemPrompt = `You are ELIM_v8.8_LOGIC_ENGINEER - a technical filter classification engine.

YOUR TASK: Analyze the OEM filter code and determine:
1. The manufacturer (Donaldson, FRAM, Fleetguard, etc.)
2. If it's Heavy Duty (HD) or Light Duty (LD) based on SPECIFICATIONS, not vehicle type
3. The filter type (Oil, Fuel, Air, etc.)

CRITICAL RULES FOR DUTY CLASSIFICATION:

** HD (Heavy Duty) Indicators - Base on SPECIFICATIONS ONLY:**
- Large thread sizes: 1-12 UN, 1-14 UN, M27+, M33+, 2-1/4-12
- High dirt holding capacity (>20g)
- High flow rate (>50 GPM)
- Diesel engines >5.0L displacement
- Industrial/Commercial applications
- Reinforced synthetic media
- Extended service intervals

** LD (Light Duty) Indicators - Base on SPECIFICATIONS ONLY:**
- Small thread sizes: 3/4-16, M20, M18
- Standard automotive specifications
- Gasoline engines
- Lower flow rates (<30 GPM)
- Standard dirt capacity (<15g)
- Passenger vehicle applications
- Cellulose or standard media

** SKU CONSTRUCTION RULES:**
1. Extract numeric root (last 4 digits from OEM code)
2. Determine manufacturer channel:
   - If HD → Use Donaldson channel → EL8 prefix (Oil) or EF9 (Fuel)
   - If LD → Use FRAM channel → EL8 prefix (Oil) or EF9 (Fuel)
3. Final SKU = Prefix + Last4Digits
   Examples:
   - P550425 (Donaldson, HD specs) → EL80425
   - LF3000 (Fleetguard, HD specs) → EL83000
   - PH4967 (FRAM, LD specs) → EL84967

IMPORTANT: You must determine HD/LD based on the filter's PHYSICAL SPECIFICATIONS and TYPICAL APPLICATIONS for that specific filter model, NOT just the vehicle it might be used in.

OUTPUT: Return ONLY valid JSON (no markdown, no backticks):
{
  "normsku_root": "4-digit numeric root",
  "target_duty": "HD or LD",
  "technical_reasoning": "Explain WHY based on thread size, flow rate, capacity, engine type",
  "manufacturer": "Donaldson/FRAM/Fleetguard/etc",
  "manufacturer_description": "Filter description",
  "filter_function": "Oil/Fuel/Air/Hydraulic/Cabin/Coolant",
  "cross_reference": {}
}`;

    const userPrompt = `Analyze this filter code: ${query}

Based on your knowledge of filter specifications:
1. Identify the manufacturer
2. Determine if it's HD or LD based on SPECIFICATIONS (thread size, flow rate, capacity, application)
3. Extract the numeric root (last 4 digits)
4. Provide technical reasoning

Return JSON only.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 1000
    });

    let responseText = completion.choices[0]?.message?.content || '{}';
    
    // Limpiar markdown
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsed = JSON.parse(responseText);

    // Construir SKU ELIM
    const root = parsed.normsku_root || query.replace(/[^0-9]/g, '').slice(-4);
    const duty = (parsed.target_duty || 'UNKNOWN').toUpperCase();
    const func = parsed.filter_function || 'Oil';
    
    // Determinar prefijo según función
    let prefix = 'EL8'; // Default: Oil
    if (func.includes('Fuel')) prefix = 'EF9';
    else if (func.includes('Air')) prefix = 'EA1';
    else if (func.includes('Hydraulic')) prefix = 'EH6';
    else if (func.includes('Cabin')) prefix = 'EC1';
    else if (func.includes('Coolant')) prefix = 'EW7';

    const elimSku = prefix + root;

    console.log(`   📊 Result: ${elimSku} (${duty})`);

    // Retornar formato esperado
    return {
      normsku_root: root,
      target_duty: duty,
      technical_reasoning: parsed.technical_reasoning || 'Analysis based on filter specifications',
      manufacturer: parsed.manufacturer || 'Unknown',
      manufacturer_description: parsed.manufacturer_description || `Filter ${query}`,
      filter_function: func,
      cross_reference: parsed.cross_reference || {},
      oem_code: query,
      elim_sku: elimSku
    };

  } catch (error) {
    console.error(`   ❌ Groq error: ${error.message}`);

    // Fallback: construcción básica
    const root = query.replace(/[^0-9]/g, '').slice(-4);
    return {
      normsku_root: root,
      target_duty: 'UNKNOWN',
      technical_reasoning: `Analysis failed: ${error.message}`,
      manufacturer: 'Unknown',
      manufacturer_description: `Filter ${query}`,
      filter_function: 'Unknown',
      cross_reference: {},
      oem_code: query,
      elim_sku: 'EL8' + root
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