// src/scrapers/donaldson-stagehand.js
const { Stagehand } = require('@browserbasehq/stagehand');
const { z } = require('zod');

/**
 * Scraper para Donaldson usando Gemini 2.5 Flash
 * Heavy Duty filters: P, DBL, DBA, ELF series
 */

// Zod schema para validación
const DonaldsonSchema = z.object({
  description: z.string(),
  specifications: z.object({
    outer_diameter: z.string().optional(),
    inner_diameter: z.string().optional(),
    height: z.string().optional(),
    thread_size: z.string().optional(),
    gasket_od: z.string().optional(),
    media_type: z.string().optional(),
    efficiency: z.string().optional(),
    micron_rating: z.string().optional()
  }).optional(),
  cross_references: z.array(z.object({
    brand: z.string(),
    part_number: z.string()
  })).optional(),
  applications: z.object({
    engines: z.array(z.string()).optional(),
    equipment: z.array(z.string()).optional()
  }).optional()
});

async function scrapeDonaldson(code, options = {}) {
  const {
    enableCache = true,
    debugMode = false,
    timeout = 30000
  } = options;

  console.log(`🔍 [Donaldson Stagehand] Searching for: ${code}`);

  let stagehand;
  
  try {
    // Inicializar Stagehand con Gemini
    stagehand = new Stagehand({
      env: process.env.BROWSERBASE_API_KEY ? 'BROWSERBASE' : 'LOCAL',
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      modelName: 'gemini-2.0-flash-exp',
      modelClientOptions: {
        apiKey: process.env.GOOGLE_API_KEY
      },
      enableCaching: enableCache,
      debugDom: debugMode
    });

    await stagehand.init({ timeout });
    await stagehand.page.goto('https://shop.donaldson.com/store/en-us/');

    // Buscar el código
    console.log(`🔎 [Donaldson] Searching for code: ${code}`);
    await stagehand.act(`Search for part number ${code} in the search box and press enter`);
    
    // Esperar resultados
    await stagehand.page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verificar si encontró el producto
    const currentUrl = stagehand.page.url();
    if (!currentUrl.includes('/product/') && !currentUrl.includes(code)) {