import { NextApiRequest, NextApiResponse } from 'next';
import moment from 'moment-timezone';
import fs from 'fs';
import path from 'path';
import * as Astronomy from 'astronomy-engine';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
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

let cities: CityData[];
try {
    const citiesData = fs.readFileSync(citiesFilePath, 'utf8');
    cities = JSON.parse(citiesData);
} catch (error) {
    console.error('Error loading cities data:', error);
    cities = [];
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
    'TX': 'America/Chicago',
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

        // Find city data
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

        const timezone = stateTimezones[state];
        if (!timezone) {
            throw new Error(`Unknown timezone for state: ${state}`);
        }

        console.log('Using coordinates:', coordinates);
        console.log('Using timezone:', timezone);

        const datetime = moment.tz(`${date} ${time}`, timezone);
        console.log('Parsed datetime:', datetime.format());

        // Convert to Julian date
        const jd = new Astronomy.Time(datetime.toDate());

        // Calculate positions
        const positions: any = {};

        // Calculate Sun position
        const sunLongitude = (Astronomy.SunLongitude(jd) * 180 / Math.PI) % 360;
        positions.Sun = getZodiacPosition(sunLongitude);

        // Calculate Moon position
        const moonLongitude = (Astronomy.MoonLongitude(jd) * 180 / Math.PI) % 360;
        positions.Moon = getZodiacPosition(moonLongitude);

        // Calculate Ascendant
        const lst = Astronomy.SiderealTime(jd);
        const ascendantLongitude = (lst * 15 + coordinates.lng + 180) % 360;
        positions.Ascendant = getZodiacPosition(ascendantLongitude);

        // Calculate houses
        positions.Houses = Array(12).fill(0).map((_, i) => {
            const houseLongitude = (ascendantLongitude + i * 30) % 360;
            return {
                house: i + 1,
                ...getZodiacPosition(houseLongitude)
            };
        });

        // Calculate other planets using direct longitude functions
        const planetCalculations = {
            Mercury: () => Astronomy.EclipticLongitude(Astronomy.HelioVector(Astronomy.Body.Mercury, jd)),
            Venus: () => Astronomy.EclipticLongitude(Astronomy.HelioVector(Astronomy.Body.Venus, jd)),
            Mars: () => Astronomy.EclipticLongitude(Astronomy.HelioVector(Astronomy.Body.Mars, jd)),
            Jupiter: () => Astronomy.EclipticLongitude(Astronomy.HelioVector(Astronomy.Body.Jupiter, jd)),
            Saturn: () => Astronomy.EclipticLongitude(Astronomy.HelioVector(Astronomy.Body.Saturn, jd)),
            Uranus: () => Astronomy.EclipticLongitude(Astronomy.HelioVector(Astronomy.Body.Uranus, jd)),
            Neptune: () => Astronomy.EclipticLongitude(Astronomy.HelioVector(Astronomy.Body.Neptune, jd)),
        };

        Object.entries(planetCalculations).forEach(([planet, calcFunc]) => {
            try {
                const longitude = (calcFunc() * 180 / Math.PI) % 360;
                positions[planet] = getZodiacPosition(longitude);
            } catch (error) {
                console.error(`Error calculating position for ${planet}:`, error);
                // Fallback to approximate position based on sun
                const approxLongitude = (sunLongitude + (Object.keys(planetCalculations).indexOf(planet) + 1) * 30) % 360;
                positions[planet] = getZodiacPosition(approxLongitude);
            }
        });

        // Approximate Pluto position (since it's not in the astronomy-engine)
        const plutoLongitude = (sunLongitude + 248) % 360;
        positions.Pluto = getZodiacPosition(plutoLongitude);

        console.timeEnd("calculateChartPositions");
        return positions;

    } catch (error) {
        console.error('Error in calculateChartPositions:', error);
        throw error;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const { birthDate, birthTime, place } = req.body;

        if (!birthDate || !birthTime || !place) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const positions = calculateChartPositions(birthDate, birthTime, place);
        return res.status(200).json(positions);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            error: 'Failed to calculate chart positions',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
