const axios = require('axios');

class GroqService {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
        this.model = 'llama-3.1-8b-instant';
        this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
    }

    async detectDuty(filterCode) {
        const prompt = `You are a heavy equipment and automotive filter classification expert.

Analyze this filter part number: "${filterCode}"

RULES:
1. NEVER decode the prefix - focus ONLY on technical specifications and manufacturer patterns
2. Determine if this filter is for Heavy Duty (HD) or Light Duty (LD) equipment
3. HD manufacturers: Caterpillar, CAT, John Deere, Cummins, Volvo, Mack, Freightliner, Komatsu, Bobcat, Case, New Holland, International, Peterbilt, Kenworth, Navistar
4. LD manufacturers: Ford, Toyota, BMW, Mercedes-Benz, Honda, Nissan, Chevrolet, GMC, Dodge, Ram, Volkswagen, Audi, Hyundai, Kia, Mazda, Subaru

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "duty": "HD" or "LD",
  "confidence": 0-100,
  "manufacturer": "detected manufacturer name or 'Unknown'",
  "reasoning": "brief explanation"
}`;

        try {
            const response = await axios.post(
                this.baseUrl,
                {
                    model: this.model,
                    messages: [
                        { role: 'system', content: 'You are a technical filter classification expert. Respond ONLY with valid JSON, no markdown formatting.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 500
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const content = response.data.choices[0].message.content.trim();
            const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const result = JSON.parse(cleanContent);
            
            console.log(`🤖 GROQ DUTY Detection: ${filterCode} → ${result.duty} (${result.confidence}% confidence)`);
            
            return result;
        } catch (error) {
            console.error('❌ GROQ Error:', error.response?.data || error.message);
            return {
                duty: 'HD',
                confidence: 50,
                manufacturer: 'Unknown',
                reasoning: 'Fallback to HD due to GROQ error'
            };
        }
    }

    async analyzeTechnicalSpecs(crossReferences) {
        const prompt = `You are a filter technology expert specializing in filtration media analysis.

Analyze these filter cross-references and assign the correct TIER based on technical specifications:

${crossReferences.map((ref, i) => `${i + 1}. ${ref.code}: ${ref.description || 'No description'}`).join('\n')}

TIER ASSIGNMENT RULES:
- STANDARD (9000): 40+ microns, Celulosa/Paper media, basic filtration
- PERFORMANCE (0949): 15-25 microns, Celulosa Enhanced or Blend media, improved efficiency  
- ELITE (7900): <15 microns, Synthetic media (Synteq™, NanoForce™, etc.), maximum protection

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "results": [
    {
      "code": "filter code",
      "tier": "STANDARD" or "PERFORMANCE" or "ELITE",
      "microns": estimated micron rating (number),
      "media_type": "type of filtration media",
      "technology": "ELIMFILTERS technology mapping"
    }
  ]
}`;

        try {
            const response = await axios.post(
                this.baseUrl,
                {
                    model: this.model,
                    messages: [
                        { role: 'system', content: 'You are a filter technology expert. Respond ONLY with valid JSON, no markdown formatting.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.2,
                    max_tokens: 1000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const content = response.data.choices[0].message.content.trim();
            const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const result = JSON.parse(cleanContent);
            
            console.log(`🔬 GROQ Technical Analysis: ${result.results.length} filters analyzed`);
            
            return result.results;
        } catch (error) {
            console.error('❌ GROQ Technical Analysis Error:', error.response?.data || error.message);
            
            return crossReferences.map((ref, index) => ({
                code: ref.code,
                tier: index === 0 ? 'PERFORMANCE' : index === 1 ? 'STANDARD' : 'ELITE',
                microns: index === 0 ? 21 : index === 1 ? 40 : 15,
                media_type: index === 0 ? 'Celulosa' : index === 1 ? 'Blend' : 'Synthetic',
                technology: index === 0 ? 'SYNTRAX™' : index === 1 ? 'SYNTRAX™' : 'NANOFORCE™'
            }));
        }
    }
}

module.exports = new GroqService();
