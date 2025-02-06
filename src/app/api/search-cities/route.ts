// /src/app/api/search-cities/route.ts
import { NextResponse } from 'next/server';

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

        // Fetch all states (ideally, this would be cached or use a separate class)
        const statesResponse = await fetch('https://parseapi.back4app.com/classes/USA_states', {
            headers: {
                'X-Parse-Application-Id': appId,
                'X-Parse-Javascript-Key': jsKey,
            },
        });

        if (!statesResponse.ok) {
            throw new Error(`Failed to fetch states: ${statesResponse.status} ${statesResponse.statusText}`);
        }
        const statesData = await statesResponse.json();
        const states = statesData.results;

        let allResults: any[] = [];

        // Iterate through states and query each state's city class
        for (const state of states) {
            const stateCode = state.adminCode;
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
                continue; // Skip to the next state on error
            }

            const data = await response.json();
            // KEY CHANGE: Access results correctly
            if (data.results && data.results.length > 0) {
              const resultsWithState = data.results.map((city: any) => ({
                    ...city,
                    stateCode: stateCode, // Add stateCode
                    full_name: `${city.name}, ${stateCode}`, // Construct full_name
                    cityId: city.objectId,  // Use objectId as cityId
                }));
              allResults = allResults.concat(resultsWithState)
            }

        }
        allResults.sort((a:any, b:any) => b.population - a.population);
        const limitedResults = allResults.slice(0,10);

        return NextResponse.json({ results: limitedResults });

    } catch (error) {
        console.error('Error in /api/search-cities:', error);
        return NextResponse.json(
            { error: 'Failed to search cities', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
