const Groq = require('groq-sdk');

/**
 * ELIMFILTERS® Engineering Core - AI Service
 * v9.8 - Technical Specs Driven & Secure
 */
const groq = new Groq({ 
    apiKey: process.env.GROQ_API_KEY // <-- SEGURIDAD: Lee la llave desde Railway, no desde aquí.
});

async function analyzeTechnicalContext(manufacturer, engineType, technicalData) {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `Eres el Ingeniero Jefe de ELIMFILTERS®. Tu análisis es estrictamente TECHNICAL_SPECS_DRIVEN.
                    
                    REGLAS MANDATORIAS:
                    1. Clasifica DUTY: 'HD' (Heavy Duty) para fabricantes como Caterpillar, Komatsu, John Deere, Mack. 
                       'LD' (Light Duty) para Toyota, Ford, BMW, Mercedes Benz.
                    2. Clasifica TIER basado en la física del filtro:
                       - ELITE: Tecnología Sintética (Synteq™), eficiencia máxima, ≤ 15 micrones.
                       - PERFORMANCE: Celulosa Estándar/Reforzada, ~21 micrones.
                       - STANDARD: Mezcla/Celulosa básica (Flujo optimizado), ≥ 40 micrones.
                    
                    Responde únicamente en formato JSON: {"duty": "HD"|"LD", "tier": "ELITE"|"PERFORMANCE"|"STANDARD"}` 
                },
                { 
                    role: "user", 
                    content: `Fabricante: ${manufacturer}, Motor/Equipo: ${engineType}, Datos de Scraper: ${technicalData}` 
                }
            ],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" }
        });

        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        console.error("❌ Error en análisis Groq:", error);
        return { duty: "HD", tier: "STANDARD" }; // Fallback de seguridad
    }
}

module.exports = { analyzeTechnicalContext };
