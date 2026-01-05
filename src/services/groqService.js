const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function analyzeTechnicalSpecs(manufacturer, searchTerm) {
    const chat = await groq.chat.completions.create({
        messages: [
            { role: "system", content: "Determine DUTY: HD (Heavy Duty) or LD (Light Duty). Output JSON: { 'duty': 'HD'|'LD' }" },
            { role: "user", content: `Manufacturer: ${manufacturer}, Code: ${searchTerm}` }
        ],
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" }
    });
    return JSON.parse(chat.choices[0].message.content);
}

module.exports = { analyzeTechnicalSpecs };
