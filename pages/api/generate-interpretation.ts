import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
    console.log('API route /api/generate-interpretation started');

    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('Missing ANTHROPIC_API_KEY');
        return NextResponse.json(
            { error: 'Server configuration error - missing API key' },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { positions } = body; // Receive pre-calculated positions

        if (!positions) {
            console.error('Missing required fields: positions');
            return NextResponse.json(
                { error: 'Missing required fields: positions' },
                { status: 400 }
            );
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
        <span class="math-inline">\{JSON\.stringify\(positions, null, 2\)\}
Generate an astrological interpretation as perfectly formatted JSON using exactly this structure\:
\{
"summary"\: "A 2\-3 sentence overview of the chart's main themes",
"details"\: \{
"Sun Sign"\: "Detailed analysis of sun sign \(</span>{positions.Sun?.sign}) at <span class="math-inline">\{positions\.Sun?\.degree\}°</span>{positions.Sun?.minutes}'",
            "Moon Sign": "Analysis of moon sign (${positions.Moon?.sign}) at <span class="math-inline">\{positions\.Moon?\.degree\}°</span>{positions.Moon?.minutes}'",
            "Rising Sign": "Analysis of ascendant (${positions.Ascendant?.sign}) at <span class="math-inline">\{positions\.Ascendant?\.degree\}°</span>{positions.Ascendant?.minutes}'",
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
                return NextResponse.json(chartData); // Return the interpretation
            } else {
                console.error(
                    'Received a non-text response from Claude:',
                    contentBlock
                );
                return NextResponse.json(
                    {
                        error: 'Received an unexpected response format from AI',
                    },
                    { status: 500 }
                );
              }
        } catch (parseError) {
            console.error('Failed to parse Claude response:', parseError);
            return NextResponse.json(
                { error: 'Invalid response format from AI' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate astrological interpretation',
                details:
                    error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
