const axios = require('axios');

const analyzeCode = async (code) => {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama-3.1-70b-versatile",
        messages: [{
            role: "system",
            content: "Eres un experto en filtros industriales. Si el motor es Caterpillar/Cummins es HD. Si es Toyota/RAV4 es LD. Devuelve JSON: {duty: 'HD'|'LD', prefix: 'EL8'|'EA1', description: 'string'}"
        }, { role: "user", content: code }]
    }, { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } });
    
    return JSON.parse(response.data.choices[0].message.content);
};

module.exports = { analyzeCode };
