const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function analyzeTechnicalSpecs(manufacturer, searchTerm) {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Eres el Ingeniero Jefe de ELIMFILTERS®. 
                    Tu tarea es analizar un código de filtro y su fabricante para:
                    1. Determinar DUTY: 'HD' (Heavy Duty) para camiones/maquinaria o 'LD' (Light Duty) para autos.
                    2. Analizar TIER: 'ELITE' (Sintético/15μ), 'PERFORMANCE' (Celulosa/21μ), 'STANDARD' (Mezcla/40μ).
                    Responde estrictamente en formato JSON: {"duty": "HD"|"LD", "tier": "ELITE"|"PERFORMANCE"|"STANDARD", "reason": "breve explicacion"}`
                },
                {
                    role: "user",
                    content: `Fabricante: ${manufacturer}. Código de búsqueda: ${searchTerm}`
                }
            ],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" }
        });

        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        console.error("❌ Error en Groq Service:", error);
        return { duty: "HD", tier: "PERFORMANCE", reason: "Fallback por error de conexión" };
    }
}

module.exports = { analyzeTechnicalSpecs };
