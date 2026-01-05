/**
 * ELIMFILTERS® Engineering Core - AI Duty Analyzer
 * v10.1 - Producción Railway
 */

const Groq = require('groq-sdk');
require('dotenv').config();

// Inicialización del SDK de Groq con la API Key del entorno
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY 
});

/**
 * Analiza si un fabricante/motor es Heavy Duty (HD) o Light Duty (LD)
 * @param {String} manufacturer - Marca (ej. Caterpillar, Toyota)
 * @param {String} engineType - Tipo (ej. C15, V6 3.5L)
 */
async function analyzeDuty(manufacturer, engineType) {
    try {
        console.log(`🧠 [GROQ] Analizando Duty para: ${manufacturer} / ${engineType}`);
        
        const prompt = `Act as an industrial filtration engineer for ELIMFILTERS®. 
        Analyze if the following manufacturer and engine type belong to Heavy Duty (HD) or Light Duty (LD) applications.
        Manufacturer: ${manufacturer}
        Engine: ${engineType}
        Return ONLY a valid JSON object: {"duty": "HD"} or {"duty": "LD"}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            model: "llama3-8b-8192", 
            response_format: { type: "json_object" }
        });

        const responseContent = chatCompletion.choices[0]?.message?.content;
        const result = JSON.parse(responseContent);
        
        console.log(`✅ [GROQ RESULT]: ${result.duty}`);
        return result;

    } catch (error) {
        console.error("❌ [GROQ ERROR]:", error.message);
        // Fallback Crítico: Si la IA no responde, ELIMFILTERS® asume HD por seguridad técnica
        return { duty: "HD" };
    }
}

// ESTA LÍNEA ES VITAL: Exporta la función como un objeto para que detectionService la reconozca
module.exports = { analyzeDuty };
