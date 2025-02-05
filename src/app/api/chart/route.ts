import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import moment from 'moment-timezone';
import cities from '../../../../public/cities.json'; // Update path to cities.json
import * as Astronomy from 'astronomy-engine';

// Type definitions for clarity and type safety
type CityData = {
  name: string;
  state_code: string;
  lat: string;
  lng: string;
};

type StateTimezones = { [state: string]: string };

type CityCoordinates = {
  [cityState: string]: {
    lat: number;
    lng: number;
  };
};

type Planet = 'Sun' | 'Moon' | 'Ascendant' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto';

type ZodiacPosition = {
  sign: string;
  degree: number;
  minutes: number;
};

type House = {
  house: number;
  sign: string;
  degree: number;
  minutes: number;
};

type Aspect = {
  planet1: string;
  planet2: string;
  aspect: string;
  orb: string;
};

type ChartPositions = {
  [key in Planet]?: ZodiacPosition;
} & {
  Houses?: House[];
  Aspects?: Aspect[];
};

const stateTimezones: StateTimezones = {
  'AK': 'America/Anchorage',
  'AL': 'America/Chicago',
  'AR': 'America/Chicago',
  'AZ': 'America/Phoenix',
  'CA': 'America/Los_Angeles',
  'CO': 'America/Denver',
  'CT': 'America/New_York',
  'DC': 'America/New_York',
  'DE': 'America/New_York',
  'FL': 'America/New_York',
  'GA': 'America/New_York',
  'HI': 'Pacific/Honolulu',
  'IA': 'America/Chicago',
  'ID': 'America/Denver',
  'IL': 'America/Chicago',
  'IN': 'America/Indiana/Indianapolis',
  'KS': 'America/Chicago',
  'KY': 'America/New_York',
  'LA': 'America/Chicago',
  'MA': 'America/New_York',
  'MD': 'America/New_York',
  'ME': 'America/New_York',
  'MI': 'America/New_York',
  'MN': 'America/Chicago',
  'MO': 'America/Chicago',
  'MS': 'America/Chicago',
  'MT': 'America/Denver',
  'NC': 'America/New_York',
  'ND': 'America/Chicago',
  'NE': 'America/Chicago',
  'NH': 'America/New_York',
  'NJ': 'America/New_York',
  'NM': 'America/Denver',
  'NV': 'America/Los_Angeles',
  'NY': 'America/New_York',
  'OH': 'America/New_York',
  'OK': 'America/Chicago',
  'OR': 'America/Los_Angeles',
  'PA': 'America/New_York',
  'RI': 'America/New_York',
  'SC': 'America/New_York',
  'SD': 'America/Chicago',
  'TN': 'America/Chicago',
  'TX': 'America/Chicago',
  'UT': 'America/Denver',
  'VA': 'America/New_York',
  'VT': 'America/New_York',
  'WA': 'America/Los_Angeles',
  'WI': 'America/Chicago',
  'WV': 'America/New_York',
  'WY': 'America/Denver'
};

const cityCoordinates: CityCoordinates = (cities as CityData[]).reduce((acc: CityCoordinates, city: CityData) => {
  const key = `${city.name.toUpperCase()}, ${city.state_code.toUpperCase()}`;
  acc[key] = { lat: parseFloat(city.lat), lng: parseFloat(city.lng) };
  return acc;
}, {} as CityCoordinates);

const zodiacPositionCache: { [key: number]: ZodiacPosition } = {}; //cache object

function getZodiacPosition(longitude: number): ZodiacPosition {
    if (zodiacPositionCache[longitude]) {
        return zodiacPositionCache[longitude]; // Return cached value if available
    }

    const signs = [
        "Aries", "Taurus", "Gemini", "Cancer",
        "Leo", "Virgo", "Libra", "Scorpio",
        "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ];
    const signIndex = Math.floor(longitude / 30);
    const degree = Math.floor(longitude % 30);
    const minutes = Math.round((longitude % 1) * 60);

    const zodiacPosition = { sign: signs[signIndex], degree, minutes };
    zodiacPositionCache[longitude] = zodiacPosition; //store in cache
    return zodiacPosition;
}

function calculateChartPositions(date: string, time: string, place: string): ChartPositions {
  console.time("calculateChartPositions"); // Start timer
  try {
    const [city, state] = place.split(',').map(s => s.trim());
    console.log('Parsing location:', { city, state });

    const cityKey = `${city}, ${state}`.toUpperCase();
    let coordinates = cityCoordinates[cityKey];
    let timezone = stateTimezones[state];

    if (!coordinates) {
      const cityData = (cities as CityData[]).find(c => 
        c.name.toLowerCase() === city.toLowerCase() && 
        c.state_code === state.toUpperCase()
      );

      if (cityData) {
        coordinates = { lat: parseFloat(cityData.lat), lng: parseFloat(cityData.lng) };
      }
    }

    if (!coordinates) {
      throw new Error(`City not found: ${city}, ${state}`);
    }

    if (!timezone) {
      console.error(`Unknown timezone for state: ${state}`);
      timezone = 'UTC'; // Fallback to UTC
    }

    console.log('Using coordinates:', coordinates);
    console.log('Using timezone:', timezone);

    const datetime = moment.tz(`${date} ${time}`, timezone);
    console.log('Parsed datetime:', datetime.format());

    const astroTime = new Astronomy.AstroTime(datetime.toDate());
    const observer = new Astronomy.Observer(coordinates.lat, coordinates.lng, 0);

    const sunEquator = Astronomy.Equator(Astronomy.Body.Sun, astroTime, observer, true, true);
    const sunEcliptic = Astronomy.Ecliptic(sunEquator.vec);
    const sunLongitude = sunEcliptic.elon;
    console.timeLog("calculateChartPositions", "Sun position calculated");

    const moonEquator = Astronomy.Equator(Astronomy.Body.Moon, astroTime, observer, true, true);
    const moonEcliptic = Astronomy.Ecliptic(moonEquator.vec);
    const moonLongitude = moonEcliptic.elon;
    console.timeLog("calculateChartPositions", "Moon position calculated");

    const lst = Astronomy.SiderealTime(astroTime) + coordinates.lng / 15;
    const ascendantLongitude = (lst * 15) % 360;

    // Cache zodiac positions
    const sunZodiac = getZodiacPosition(sunLongitude);
    const moonZodiac = getZodiacPosition(moonLongitude);
    const ascendantZodiac = getZodiacPosition(ascendantLongitude);

    let positions: ChartPositions = {
      Sun: sunZodiac,
      Moon: moonZodiac,
      Ascendant: ascendantZodiac,
    };

    positions.Houses = Array(12).fill(0).map((_, i) => {
      const houseLongitude = (ascendantLongitude + i * 30) % 360;
      return {
        house: i + 1,
        ...getZodiacPosition(houseLongitude)
      };
    });
    console.timeLog("calculateChartPositions", "Houses calculated");

    const planetBodies = {
      Mercury: Astronomy.Body.Mercury,
      Venus: Astronomy.Body.Venus,
      Mars: Astronomy.Body.Mars,
      Jupiter: Astronomy.Body.Jupiter,
      Saturn: Astronomy.Body.Saturn,
      Uranus: Astronomy.Body.Uranus,
      Neptune: Astronomy.Body.Neptune,
      Pluto: Astronomy.Body.Pluto
    };

    const planetPositions: { [key: string]: ZodiacPosition } = {};
    Object.entries(planetBodies).forEach(([planet, body]) => {
      const planetEquator = Astronomy.Equator(body, astroTime, observer, true, true);
      const planetEcliptic = Astronomy.Ecliptic(planetEquator.vec);
      const longitude = planetEcliptic.elon;
      planetPositions[planet] = getZodiacPosition(longitude);
    });
    console.timeLog("calculateChartPositions", "Planets calculated");

    positions = { ...positions, ...planetPositions };

    // Simplify aspect calculations
    const aspects: Aspect[] = [];
    const majorAspectAngles = [0, 60, 90, 120, 180]; // Conjunction, Sextile, Square, Trine, Opposition
    const majorAspectOrbs = [8, 6, 8, 8, 8];

    const bodies = ['Sun', 'Moon', ...Object.keys(planetBodies)];

    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const body1 = bodies[i];
        const body2 = bodies[j];
        const long1 = body1 === 'Sun' ? sunLongitude : body1 === 'Moon' ? moonLongitude : planetPositions[body1].degree;
        const long2 = body2 === 'Sun' ? sunLongitude : body2 === 'Moon' ? moonLongitude : planetPositions[body2].degree;
        const diff = Math.abs(long1 - long2);

        for (let k = 0; k < majorAspectAngles.length; k++) {
          const aspectAngle = majorAspectAngles[k];
          const orb = majorAspectOrbs[k];
          const aspectDiff = Math.min(Math.abs(diff - aspectAngle), 360 - Math.abs(diff - aspectAngle));

          if (aspectDiff <= orb) {
            aspects.push({
              planet1: body1,
              planet2: body2,
              aspect: ['Conjunction', 'Sextile', 'Square', 'Trine', 'Opposition'][k],
              orb: aspectDiff.toFixed(1),
            });
          }
        }
      }
    }
    positions.Aspects = aspects;
    console.timeLog("calculateChartPositions", "Aspects calculated");

    console.log('Calculated positions:', positions);
    console.timeEnd("calculateChartPositions");
    return positions;

  } catch (error) {
    console.error('Error in calculateChartPositions:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  console.log('API route started');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY');
    return NextResponse.json(
      { error: 'Server configuration error - missing API key' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    console.log('Processing request for:', {
      date: body.birthDate,
      time: body.birthTime,
      place: body.place
    });

    const { birthDate, birthTime, place } = body;

    if (!birthDate || !birthTime || !place) {
      console.error('Missing required fields:', { birthDate, birthTime, place });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Calculating positions...');
    const positions = calculateChartPositions(birthDate, birthTime, place);
    console.log('Calculated positions:', positions);

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    console.log('Making Claude API call...');
    const message = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 4000,
      temperature: 0.7,
      system: "You are an expert astrologer providing interpretations for precisely calculated natal chart positions. Use ONLY the exact positions provided to give accurate readings.",
      messages: [{
        role: "user",
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

        Base ALL interpretations ONLY on the exact calculated positions provided. Include specific degrees in your analysis.`
      }],
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

          chartData.calculated_positions = positions;

          console.log('Successfully generated chart data');
          return NextResponse.json(chartData);

        } else {
          console.error('Received a non-text response from Claude:', contentBlock);
          return NextResponse.json(
            { error: 'Received an unexpected response format from AI' },
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
        error: 'Failed to generate astrological chart',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
