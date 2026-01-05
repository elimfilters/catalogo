// src/services/groqService.js
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function analyzeTechnicalSpecs(manufacturer, engineType, scraperData) {
    const prompt = `
    Como Director de Ingeniería de ELIMFILTERS®, tu análisis debe ser TECHNICAL_SPECS_DRIVEN.
    IGNORA el prefijo o formato del código OEM.
    BASATE ÚNICAMENTE EN:
    1. Tipo de Motor/Fabricante: ${manufacturer} / ${engineType}.
    2. Datos Técnicos: Micrones (${scraperData.microns}), Medio Filtrante (${scraperData.media}), Aplicación (${scraperData.application}).

    TAREAS:
    - Clasifica el DUTY: HD (Heavy Duty) o LD (Light Duty) basándote en el motor.
    - Asigna el TIER: 
        - ELITE: Si el medio es 100% Sintético y micraje ≤ 15μm.
        - PERFORMANCE: Si es Celulosa Reforzada/Mezcla y micraje ~21μm.
        - STANDARD: Si es Celulosa Estándar y micraje ≥ 40μm.
    
    RESPUESTA JSON: {"duty": "HD"|"LD", "tier": "ELITE"|"PERFORMANCE"|"STANDARD", "tech_justification": "..."}`;

    const chat = await groq.chat.completions.create({
        messages: [{ role: "system", content: prompt }],
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" }
    });
    return JSON.parse(chat.choices[0].message.content);
}
