import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 300, // 5 minutes
};

// ------------- CORS Preflight -------------
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    }
  );
}

// ------------- POST -----------------------
export async function POST(request: Request) {
  console.log('API route /api/generate-interpretation started');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY');
    return NextResponse.json(
      { error: 'Server configuration error - missing API key' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { positions } = body;

    if (!positions) {
      console.error('Missing required fields: positions');
      return NextResponse.json(
        { error: 'Missing required fields: positions' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    console.log('Received positions:', positions);

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 3,
      timeout: 240000,
    });

    console.log('Making Claude API call...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 240000);

    try {
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

      clearTimeout(timeout);

      const contentBlock = message.content[0];
      if (contentBlock.type !== 'text') {
        throw new Error('Received non-text response from Claude');
      }

      const text = contentBlock.text;
      console.log('Raw Claude response:', text);

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const chartData = JSON.parse(jsonMatch[0]);

      if (!chartData.summary || !chartData.details) {
        throw new Error('Response missing required fields');
      }

      console.log('Successfully generated chart data');
      return NextResponse.json(chartData, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      clearTimeout(timeout);
      return NextResponse.json(
        {
          error: 'Failed to generate astrological interpretation',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate astrological interpretation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
