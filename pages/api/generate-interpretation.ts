// pages/api/generate-interpretation.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) { // Use NextApiRequest and NextApiResponse
    console.log('API route /api/generate-interpretation started');

    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('Missing ANTHROPIC_API_KEY');
        return res.status(500).json({ error: 'Server configuration error - missing API key' });
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // Use req.body directly.  Next.js parses it for you.
        const { positions } = req.body;

        if (!positions) {
            console.error('Missing required fields: positions');
            return res.status(400).json({ error: 'Missing required fields: positions' });
        }

        console.log('Received positions:', positions);

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        console.log('Making Claude API call...');
        const message = await anthropic.messages.create({
            model: 'claude-3-opus-20240229',
            max_tokens: 4000,
            temperature: 0.7,
            system:
                'You are an expert astrologer providing interpretations for precisely calculated natal chart positions. Use ONLY the exact positions provided to give accurate readings.',
            messages: [
                {
                    role: 'user',
                    content: `Using these EXACT calculated positions for a natal chart:
        ${JSON.stringify(positions, null, 2)}

        Generate an astrological interpretation as perfectly formatted JSON using exactly this structure:
        {
          "summary": "A 2-3 sentence overview of the chart's main themes",
          "details": {
            "Sun Sign": "Detailed analysis of sun sign (${positions.Sun?.sign}) at ${positions.Sun?.degree}°${positions.Sun?.minutes}'",
            "Moon Sign": "Analysis of moon sign (${positions.Moon?.sign}) at ${positions.Moon?.degree}°${positions.Moon?.minutes}'",
            "Rising Sign": "Analysis of ascendant (${positions.Ascendant?.sign}) at ${positions.Ascendant?.degree}°${positions.Ascendant?.minutes}'",
            "Planetary Positions": "Analysis of each planet's exact position and their significance",
            "House Placements": "Analysis of house cusps and planetary placements",
            "Major Aspects": "Analysis of the major aspects between planets calculated above",
            "Life Path": "Overall life direction based on the complete chart"
          }
        }

        Base ALL interpretations ONLY on the exact calculated positions provided. Include specific degrees in your analysis.`,
                },
            ],
        });

        try {
            const contentBlock = message.content[0];
            if (contentBlock.type === 'text') {
                const text = contentBlock.text;
                console.log('Raw Claude response:', text);

                const jsonMatch = text.match(/\{[\s\S]*\}/);
                const jsonStr = jsonMatch ? jsonMatch[0] : text;

                const chartData = JSON.parse(jsonStr);

                if (!chartData.summary || !chartData.details) {
                    throw new Error('Response missing required fields');
                }

                console.log('Successfully generated chart data');
                return res.status(200).json(chartData); // Return the interpretation
            } else {
                console.error(
                    'Received a non-text response from Claude:',
                    contentBlock
                );
                 return res.status(500).json({
                        error: 'Received an unexpected response format from AI',
                    });
            }
        } catch (parseError) {
            console.error('Failed to parse Claude response:', parseError);
             return res.status(500).json({ error: 'Invalid response format from AI' });
        }
    } catch (error) {
        console.error('API Error:', error);
         return res.status(500).json({
                error: 'Failed to generate astrological interpretation',
                details:
                    error instanceof Error ? error.message : 'Unknown error',
            });
    }
}
