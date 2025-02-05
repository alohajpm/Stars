import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import moment from 'moment-timezone';
import cities from 'cities.json';
import * as Astronomy from 'astronomy-engine';

const stateTimezones: { [key: string]: string } = {
  'AK': 'America/Anchorage',
  'AL': 'America/Chicago',
  'AR': 'America/Chicago',
  'AZ': 'America/Phoenix',
  'CA': 'America/Los_Angeles',
  'CA': 'America/San_Diego',
  'CA': 'America/Sacramento',
  'CA': 'America/Modesto',
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

const cityCoordinates: { [key: string]: { lat: number; lng: number; } } = {
  'WICHITA FALLS, TX': { lat: 33.9137, lng: -98.4934 },
  'NEW YORK, NY': { lat: 40.7128, lng: -74.0060 },
  'LOS ANGELES, CA': { lat: 34.0522, lng: -118.2437 },
  'CHICAGO, IL': { lat: 41.8781, lng: -87.6298 },
  'LONDON, UK': { lat: 51.5074, lng: -0.1278 },
  'PARIS, FR': { lat: 48.8566, lng: 2.3522 },
  'TOKYO, JP': { lat: 35.6895, lng: 139.6917 },
  'SYDNEY, AU': { lat: -33.8688, lng: 151.2093 },
  'RIO DE JANEIRO, BR': { lat: -22.9068, lng: -43.1729 },
  'MOSCOW, RU': { lat: 55.7558, lng: 37.6173 },
  'CAIRO, EG': { lat: 30.0444, lng: 31.2357 },
  'MUMBAI, IN': { lat: 19.0760, lng: 72.8777 },
  'BEIJING, CN': { lat: 39.9042, lng: 116.4074 },
  'MEXICO CITY, MX': { lat: 19.4326, lng: -99.1332 },
  'CAPE TOWN, ZA': { lat: -33.9249, lng: 18.4241 },
  'TORONTO, CA': { lat: 43.6532, lng: -79.3832},
  'DUBAI, AE': { lat: 25.2048, lng: 55.2708 },
  'HONG KONG, CN': { lat: 22.3193, lng: 114.1694 },
  'SINGAPORE, SG': { lat: 1.3521, lng: 103.8198 },
  'AUCKLAND, NZ': { lat: -36.8485, lng: 174.7633 },
  'SACRAMENTO, CA': { lat: 38.5816, lng: -121.4944 },
  'MODESTO, CA': { lat: 37.6388, lng: -120.9947 },
  'SAN DIEGO, CA': { lat: 32.7157, lng: -117.1611 }
};

function calculateChartPositions(date: string, time: string, place: string) {
  try {
    const [city, state] = place.split(',').map(s => s.trim());
    console.log('Parsing location:', { city, state });

    const cityKey = `${city}, ${state}`.toUpperCase();
    let coordinates = cityCoordinates[cityKey];
    let timezone = stateTimezones[state];

    if (!coordinates) {
      const cityData = (cities as any[]).find(c => 
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
      throw new Error(`Unknown timezone for state: ${state}`);
    }

    console.log('Using coordinates:', coordinates);
    console.log('Using timezone:', timezone);

    const datetime = moment.tz(`${date} ${time}`, timezone);
    console.log('Parsed datetime:', datetime.format());

    // Create an AstroTime object directly
    const astroTime = new Astronomy.AstroTime(datetime.toDate());

    // Calculate positions using Astronomy.js
    const observer = new Astronomy.Observer(coordinates.lat, coordinates.lng, 0);

    // Get Sun position (Corrected Ecliptic call)
    const sunEquator = Astronomy.Equator(Astronomy.Body.Sun, astroTime, observer, true, true);
    const sunEcliptic = Astronomy.Ecliptic(sunEquator.vec);
    const sunLongitude = sunEcliptic.elon;

    // Get Moon position (Corrected Ecliptic call)
    const moonEquator = Astronomy.Equator(Astronomy.Body.Moon, astroTime, observer, true, true);
    const moonEcliptic = Astronomy.Ecliptic(moonEquator.vec);
    const moonLongitude = moonEcliptic.elon;

    // Calculate Ascendant 
    const lst = Astronomy.SiderealTime(astroTime) + coordinates.lng / 15;
    const ascendantLongitude = (lst * 15) % 360;

    function getZodiacPosition(longitude: number) {
      const signs = [
        "Aries", "Taurus", "Gemini", "Cancer", 
        "Leo", "Virgo", "Libra", "Scorpio", 
        "Sagittarius", "Capricorn", "Aquarius", "Pisces"
      ];
      const signIndex = Math.floor(longitude / 30);
      const degree = Math.floor(longitude % 30);
      const minutes = Math.round((longitude % 1) * 60)
      return { sign: signs[signIndex], degree, minutes };
    }

    // Initialize positions object with accurate Sun, Moon, and Ascendant
    const positions: any = {
      Sun: getZodiacPosition(sunLongitude),
      Moon: getZodiacPosition(moonLongitude),
      Ascendant: getZodiacPosition(ascendantLongitude),
    };

    // Calculate house cusps
    positions.Houses = Array(12).fill(0).map((_, i) => {
      const houseLongitude = (ascendantLongitude + i * 30) % 360;
      return {
        house: i + 1,
        ...getZodiacPosition(houseLongitude)
      };
    });

    // Calculate planetary positions using correct Astronomy.js methods
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

    const planets: { [key: string]: number } = {};

    Object.entries(planetBodies).forEach(([planet, body]) => {
      const planetEquator = Astronomy.Equator(body, astroTime, observer, true, true);
      const planetEcliptic = Astronomy.Ecliptic(planetEquator.vec);
      const longitude = planetEcliptic.elon;
      planets[planet] = longitude;
      positions[planet] = getZodiacPosition(longitude);
    });

    // Add planetary positions to the main positions object
    Object.entries(planets).forEach(([planet, longitude]) => {
      positions[planet] = getZodiacPosition(longitude);
    });

    // Calculate major aspects
    const aspects: any[] = [];
    const MAJOR_ASPECTS = [
      { name: 'Conjunction', angle: 0, orb: 8 },
      { name: 'Sextile', angle: 60, orb: 6 },
      { name: 'Square', angle: 90, orb: 8 },
      { name: 'Trine', angle: 120, orb: 8 },
      { name: 'Opposition', angle: 180, orb: 8 }
    ];

    const allBodies = {
      ...planets,
      Sun: sunLongitude,
      Moon: moonLongitude
    };

    Object.entries(allBodies).forEach(([body1, long1], i) => {
      Object.entries(allBodies).slice(i + 1).forEach(([body2, long2]) => {
        const diff = Math.abs(long1 - long2);
        MAJOR_ASPECTS.forEach(aspect => {
          const orb = Math.min(
            Math.abs(diff - aspect.angle),
            Math.abs(360 - Math.abs(diff - aspect.angle))
          );
          if (orb <= aspect.orb) {
            aspects.push({
              planet1: body1,
              planet2: body2,
              aspect: aspect.name,
              orb: orb.toFixed(1)
            });
          }
        });
      });
    });

    positions.Aspects = aspects;

    console.log('Calculated positions:', positions);
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
            "Sun Sign": "Detailed analysis of sun sign (${positions.Sun.sign}) at ${positions.Sun.degree}°${positions.Sun.minutes}'",
            "Moon Sign": "Analysis of moon sign (${positions.Moon.sign}) at ${positions.Moon.degree}°${positions.Moon.minutes}'",
            "Rising Sign": "Analysis of ascendant (${positions.Ascendant.sign}) at ${positions.Ascendant.degree}°${positions.Ascendant.minutes}'",
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
      const text = message.content[0].text;
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