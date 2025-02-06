// /src/app/api/search-cities/route.ts
import { NextResponse } from 'next/server';

// State Timezones (from /api/calculate-positions/route.ts) - REUSE THESE!
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

const stateCodes = Object.keys(stateTimezones); // Get the state codes directly


export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');

        if (!query) {
            return NextResponse.json({ results: [] });
        }

        const appId = process.env.BACK4APP_APPLICATION_ID;
        const jsKey = process.env.BACK4APP_JAVASCRIPT_KEY;

        if (!appId || !jsKey) {
            throw new Error("Missing Back4App credentials.");
        }
        let allResults: any[] = [];

        // Iterate through state codes directly - NO MORE FETCH TO USA_states
        for (const stateCode of stateCodes) {
            const url = `https://parseapi.back4app.com/classes/USA_cities_${stateCode}?where=${encodeURIComponent(
                JSON.stringify({
                    name: { "$regex": query, "$options": "i" },
                })
            )}&limit=5`;

            const response = await fetch(url, {
                headers: {
                    'X-Parse-Application-Id': appId,
                    'X-Parse-Javascript-Key': jsKey,
                },
            });

            if (!response.ok) {
                console.error(`Back4App API request failed for ${stateCode}: ${response.status}`);
                continue;
            }

            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const resultsWithState = data.results.map((city: any) => ({
                    ...city,
                    stateCode: stateCode,
                    full_name: `${city.name}, ${stateCode}`,
                    cityId: city.objectId // Use objectId from Back4App
                }));
                allResults = allResults.concat(resultsWithState);
            }
        }

        allResults.sort((a: any, b: any) => b.population - a.population);
        const limitedResults = allResults.slice(0, 10);

        return NextResponse.json({ results: limitedResults });

    } catch (error) {
        console.error('Error in /api/search-cities:', error);
        return NextResponse.json(
            { error: 'Failed to search cities', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
