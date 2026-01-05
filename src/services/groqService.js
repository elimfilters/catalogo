const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function analyzeTechnicalContext(manufacturer, engineType, rawSpecs) {
    const prompt = `Analiza como Ingeniero de ELIMFILTERS®:
    Motor/Fabricante: ${manufacturer} / ${engineType}
    Especificación: ${rawSpecs.microns} micrones, Medio: ${rawSpecs.media}
    
    Determina:
    1. DUTY: HD (Heavy Duty) o LD (Light Duty) basado en el motor.
    2. TIER: ELITE (Sintético, ≤15μm), PERFORMANCE (Mezcla, ~21μm), STANDARD (Celulosa, ≥40μm).
    Responde JSON: {"duty": "HD"|"LD", "tier": "ELITE"|"PERFORMANCE"|"STANDARD"}`;

    const chat = await groq.chat.completions.create({
        messages: [{ role: "system", content: prompt }],
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" }
    });
    return JSON.parse(chat.choices[0].message.content);
}

module.exports = { analyzeTechnicalContext };
