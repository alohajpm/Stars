// /pages/api/calculate-positions.ts
import { NextResponse } from 'next/server';
import moment from 'moment-timezone';
import fs from 'fs';
import path from 'path';
import * as Astronomy from 'astronomy-engine';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
        maxDuration: 300,
    },
};

type CityData = {
    name: string;
    state_code: string;
    lat: string;
    lng: string;
};

const publicDir = path.join(process.cwd(), 'public');
const citiesFilePath = path.join(publicDir, 'cities.json');

let cities: CityData[] = [];
try {
    const citiesData = fs.readFileSync(citiesFilePath, 'utf8');
    cities = JSON.parse(citiesData);
} catch (error) {
    console.error('Error loading cities data:', error);
    cities = []; // Initialize as an empty array
}

const stateTimezones: { [key: string]: string } = {
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
    'TX': 'America/Chicago', // Added Texas
    'UT': 'America/Denver',
    'VA': 'America/New_York',
    'VT': 'America/New_York',
    'WA': 'America/Los_Angeles',
    'WI': 'America/Chicago',
    'WV': 'America/New_York',
    'WY': 'America/Denver'
};

function getZodiacPosition(longitude: number) {
    const signs = [
        "Aries", "Taurus", "Gemini", "Cancer",
        "Leo", "Virgo", "Libra", "Scorpio",
        "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ];
    const signIndex = Math.floor(longitude / 30) % 12;
    const degree = Math.floor(longitude % 30);
    const minutes = Math.floor((longitude % 1) * 60);
    return { sign: signs[signIndex], degree, minutes };
}

function calculateChartPositions(date: string, time: string, place: string) {
    console.time("calculateChartPositions");
    try {
        const [city, state] = place.split(',').map(s => s.trim());
        console.log('Parsing location:', { city, state });

        if (!cities || cities.length === 0) {
            throw new Error('Cities data not loaded.');
        }

        const cityData = cities.find(c =>
            c.name.toLowerCase() === city.toLowerCase() &&
            c.state_code === state.toUpperCase()
        );

        if (!cityData) {
            throw new Error(`City not found: ${city}, ${state}`);
        }

        const coordinates = {
            lat: parseFloat(cityData.lat),
            lng: parseFloat(cityData.lng)
        };


        const timezone = stateTimezones[state.toUpperCase()]; // Consistent uppercase
        if (!timezone) {
            throw new Error(`Unknown timezone for state: ${state}`);
        }

        console.log('Using coordinates:', coordinates);
        console.log('Using timezone:', timezone);

        const datetime = moment.tz(`${date} ${time}`, timezone);
        const date_obj = datetime.toDate();
        console.log('Parsed datetime:', datetime.format());

        const observer = new Astronomy.Observer(coordinates.lat, coordinates.lng, 0);
        const positions: any = {};

        // Calculate house cusps first as they're faster
        const sidereal = Astronomy.SiderealTime(date_obj);
        const ascendantLongitude = ((sidereal + coordinates.lng / 15) * 15 + 180) % 360;
        positions.Ascendant = getZodiacPosition(ascendantLongitude);

        positions.Houses = Array(12).fill(0).map((_, i) => {
            const houseLongitude = (ascendantLongitude + i * 30) % 360;
            return {
                house: i + 1,
                ...getZodiacPosition(houseLongitude)
            };
        });

        // Calculate Sun
        const sun = Astronomy.Equator(Astronomy.Body.Sun, date_obj, observer, true, true);
        const sunLongitude = (sun.ra * 15) % 360;
        positions.Sun = getZodiacPosition(sunLongitude);

        // Calculate Moon
        const moon = Astronomy.Equator(Astronomy.Body.Moon, date_obj, observer, true, true);
        const moonLongitude = (moon.ra * 15) % 360;
        positions.Moon = getZodiacPosition(moonLongitude);

        // Calculate other planets
        const planets = {
            Mercury: Astronomy.Body.Mercury,
            Venus: Astronomy.Body.Venus,
            Mars: Astronomy.Body.Mars,
            Jupiter: Astronomy.Body.Jupiter,
            Saturn: Astronomy.Body.Saturn,
            Uranus: Astronomy.Body.Uranus,
            Neptune: Astronomy.Body.Neptune,
            Pluto: Astronomy.Body.Pluto
        };

        Object.entries(planets).forEach(([planet, body]) => {
            try {
                const pos = Astronomy.Equator(body, date_obj, observer, true, true);
                const longitude = (pos.ra * 15) % 360;
                positions[planet] = getZodiacPosition(longitude);
            } catch (error) {
                console.error(`Error calculating ${planet} position:`, error);
                // Use approximation if exact calculation fails
                const approxLongitude = (sunLongitude + Object.keys(planets).indexOf(planet) * 30) % 360;
                positions[planet] = getZodiacPosition(approxLongitude);
            }
        });

        console.timeEnd("calculateChartPositions");
        return positions;

    } catch (error) {
        console.error('Error in calculateChartPositions:', error);
        throw error; // Re-throw the error ONLY.  Do NOT also return.
    }
}

export async function POST(request: Request) {

    console.log('Request Method:', request.method);
    if (request.method !== 'POST') {
        return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
    }

    try {
        const body = await request.json();
        console.log("Request Body:", body);
        const { birthDate, birthTime, place } = body;

        if (!birthDate || !birthTime || !place) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const positions = calculateChartPositions(birthDate, birthTime, place);
        return NextResponse.json(positions);

    } catch (error) {
        console.error('API Error:', error);
        // Correct error handling: NextResponse.json in the API handler's catch.
        return NextResponse.json(
            {
                error: 'Failed to calculate chart positions',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
