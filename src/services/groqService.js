const Groq = require('groq-sdk');

// SEGURIDAD: Usamos process.env para proteger tu llave técnica
const groq = new Groq({ 
    apiKey: process.env.GROQ_API_KEY 
});

async function analyzeTechnicalContext(manufacturer, engineType, technicalData) {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `Eres el Ingeniero Jefe de ELIMFILTERS®. Tu análisis es TECHNICAL_SPECS_DRIVEN.
                    1. Determina DUTY: HD o LD según el motor.
                    2. Clasifica TIER: ELITE (≤15μm), PERFORMANCE (~21μm), STANDARD (≥40μm).
                    Responde JSON: {"duty": "HD"|"LD", "tier": "ELITE"|"PERFORMANCE"|"STANDARD"}` 
                },
                { 
                    role: "user", 
                    content: `Fabricante: ${manufacturer}, Motor: ${engineType}, Datos: ${technicalData}` 
                }
            ],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" }
        });
        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        return { duty: "HD", tier: "STANDARD" }; 
    }
}

module.exports = { analyzeTechnicalContext };
