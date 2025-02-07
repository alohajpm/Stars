import { NextResponse } from 'next/server';
import moment from 'moment-timezone';
import * as Astronomy from 'astronomy-engine';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  runtime: 'nodejs',
  maxDuration: 300,
};

// State Timezones
const stateTimezones: { [key: string]: string } = {
  AK: 'America/Anchorage',
  AL: 'America/Chicago',
  AR: 'America/Chicago',
  AZ: 'America/Phoenix',
  CA: 'America/Los_Angeles',
  CO: 'America/Denver',
  CT: 'America/New_York',
  DC: 'America/New_York',
  DE: 'America/New_York',
  FL: 'America/New_York',
  GA: 'America/New_York',
  HI: 'Pacific/Honolulu',
  IA: 'America/Chicago',
  ID: 'America/Denver',
  IL: 'America/Chicago',
  IN: 'America/Indiana/Indianapolis',
  KS: 'America/Chicago',
  KY: 'America/New_York',
  LA: 'America/Chicago',
  MA: 'America/New_York',
  MD: 'America/New_York',
  ME: 'America/New_York',
  MI: 'America/New_York',
  MN: 'America/Chicago',
  MO: 'America/Chicago',
  MS: 'America/Chicago',
  MT: 'America/Denver',
  NC: 'America/New_York',
  ND: 'America/Chicago',
  NE: 'America/Chicago',
  NH: 'America/New_York',
  NJ: 'America/New_York',
  NM: 'America/Denver',
  NV: 'America/Los_Angeles',
  NY: 'America/New_York',
  OH: 'America/New_York',
  OK: 'America/Chicago',
  OR: 'America/Los_Angeles',
  PA: 'America/New_York',
  RI: 'America/New_York',
  SC: 'America/New_York',
  SD: 'America/Chicago',
  TN: 'America/Chicago',
  TX: 'America/Chicago',
  UT: 'America/Denver',
  VA: 'America/New_York',
  VT: 'America/New_York',
  WA: 'America/Los_Angeles',
  WI: 'America/Chicago',
  WV: 'America/New_York',
  WY: 'America/Denver',
};

// --- Helper function to fetch city data from Back4App ---
async function fetchCityData(city: string, stateCode: string) {
  console.log('fetchCityData called with:', { city, stateCode }); // LOG 1

  const appId = process.env.BACK4APP_APPLICATION_ID;
  const jsKey = process.env.BACK4APP_JAVASCRIPT_KEY;

  if (!appId || !jsKey) {
    throw new Error('Missing Back4App credentials.');
  }

  // Construct the URL *exactly* as it should be:
  const url = `https://parseapi.back4app.com/classes/${stateCode}?where=${encodeURIComponent(
    JSON.stringify({
      name: { $regex: `^${city}$`, $options: 'i' },
    })
  )}`;

  console.log('fetchCityData: Constructed URL:', url); // LOG 2
  const response = await fetch(url, {
    headers: {
      'X-Parse-Application-Id': appId,
      'X-Parse-Javascript-Key': jsKey,
    },
  });

  console.log('fetchCityData: Response Status:', response.status); // LOG 3
  if (!response.ok) {
    console.error('fetchCityData: Back4App API request failed:', await response.text());
    throw new Error(`Back4App API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('fetchCityData: Raw Back4App Data:', data); // LOG 5

  if (!data.results || data.results.length === 0) {
    throw new Error(`City not found: ${city}, ${stateCode}`);
  }

  data.results.sort((a: any, b: any) => b.population - a.population);
  return data.results[0];
}

function getZodiacPosition(longitude: number) {
  const signs = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ];
  const signIndex = Math.floor(longitude / 30) % 12;
  const degree = Math.floor(longitude % 30);
  const minutes = Math.floor((longitude % 1) * 60);
  return { sign: signs[signIndex], degree, minutes };
}

async function calculateChartPositions(date: string, time: string, place: string) {
  console.time('calculateChartPositions');
  try {
    const [city, stateCode] = place.split(',').map((s) => s.trim());
    console.log('Parsing location:', { city, stateCode });

    if (!city || !stateCode) {
      console.log('City or state code is empty. Returning error.');
      return { error: 'No city selected' };
    }

    const cityData = await fetchCityData(city, stateCode); // Await the result

    const coordinates = {
      lat: cityData.location.latitude,
      lng: cityData.location.longitude,
    };

    const timezone = stateTimezones[stateCode.toUpperCase()];
    if (!timezone) {
      return { error: `Unknown timezone for state: ${stateCode}` };
    }

    console.log('Using coordinates:', coordinates);
    console.log('Using timezone:', timezone);

    const datetime = moment.tz(`${date} ${time}`, timezone);
    const date_obj = datetime.toDate();
    console.log('Parsed datetime:', datetime.format());

    const observer = new Astronomy.Observer(coordinates.lat, coordinates.lng, 0);
    const positions: any = {};

    const sidereal = Astronomy.SiderealTime(date_obj);
    const ascendantLongitude = ((sidereal + coordinates.lng / 15) * 15 + 180) % 360;
    positions.Ascendant = getZodiacPosition(ascendantLongitude);

    positions.Houses = Array(12)
      .fill(0)
      .map((_, i) => {
        const houseLongitude = (ascendantLongitude + i * 30) % 360;
        return {
          house: i + 1,
          ...getZodiacPosition(houseLongitude),
        };
      });

    const sun = Astronomy.Equator(Astronomy.Body.Sun, date_obj, observer, true, true);
    const sunLongitude = (sun.ra * 15) % 360;
    positions.Sun = getZodiacPosition(sunLongitude);

    const moon = Astronomy.Equator(Astronomy.Body.Moon, date_obj, observer, true, true);
    const moonLongitude = (moon.ra * 15) % 360;
    positions.Moon = getZodiacPosition(moonLongitude);

    const planets = {
      Mercury: Astronomy.Body.Mercury,
      Venus: Astronomy.Body.Venus,
      Mars: Astronomy.Body.Mars,
      Jupiter: Astronomy.Body.Jupiter,
      Saturn: Astronomy.Body.Saturn,
      Uranus: Astronomy.Body.Uranus,
      Neptune: Astronomy.Body.Neptune,
      Pluto: Astronomy.Body.Pluto,
    };

    Object.entries(planets).forEach(([planet, body]) => {
      try {
        const pos = Astronomy.Equator(body, date_obj, observer, true, true);
        const longitude = (pos.ra * 15) % 360;
        positions[planet] = getZodiacPosition(longitude);
      } catch (error) {
        console.error(`Error calculating ${planet} position:`, error);
        //approximation
        const approxLongitude =
          (sunLongitude + Object.keys(planets).indexOf(planet) * 30) % 360;
        positions[planet] = getZodiacPosition(approxLongitude);
      }
    });

    console.timeEnd('calculateChartPositions');
    return positions;
  } catch (error) {
    console.error('Error in calculateChartPositions:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ------------ CORS Preflight ---------------
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    }
  );
}

// ------------ POST Handler -----------------
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('/api/calculate-positions: Received body:', body);

    const { birthDate, birthTime, place } = body;
    if (!birthDate || !birthTime || !place) {
      console.log('/api/calculate-positions: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const positions = await calculateChartPositions(birthDate, birthTime, place);
    console.log('/api/calculate-positions: Calculated positions:', positions);

    if (positions.error) {
      console.log('/api/calculate-positions: Returning error:', positions.error);
      return NextResponse.json(
        { error: 'Failed to calculate chart positions', details: positions.error },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    return NextResponse.json(positions, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate chart positions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
