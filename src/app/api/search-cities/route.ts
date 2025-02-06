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

        // Fetch all states (ideally, this would be cached or use a separate class for efficiency)
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

        // Perform a search for each State
        for (const state of states) {
            const stateCode = state.adminCode;

            const url = `https://parseapi.back4app.com/classes/USA_cities_${stateCode}?where=${encodeURIComponent(
                JSON.stringify({
                    name: { "$regex": query, "$options": "i" },  // Case-insensitive partial match
                })
            )}&limit=5`; // Limit to 5 results per state

            // LOG THE URL BEING USED:
            console.log("Back4App API URL:", url);

            const response = await fetch(url, {
                headers: {
                    'X-Parse-Application-Id': appId,
                    'X-Parse-Javascript-Key': jsKey,
                },
            });

            // LOG THE RAW RESPONSE STATUS:
            console.log("Back4App API Response Status:", response.status);

            if (!response.ok) {
                console.error(`Back4App API request failed for state ${stateCode}: ${response.status} ${response.statusText}`);
                // LOG THE FULL RESPONSE BODY ON ERROR:
                console.error("Back4App API Response Body:", await response.text());
                continue; // Skip to the next state on error
            }

            const data = await response.json();
            // LOG THE RAW DATA:
            console.log("Back4App API Raw Data:", data);

             if (data.results && data.results.length > 0) {
                // Add state code to each city result for later use.
                const resultsWithState = data.results.map((city: any) => ({
                    ...city,
                    stateCode: stateCode, // Add the state code here
                    full_name: `${city.name}, ${stateCode}`,
                    cityId: city.objectId
                }));
              allResults = allResults.concat(resultsWithState);
          }
        }

      allResults.sort((a:any, b:any) => b.population - a.population);
      const limitedResults = allResults.slice(0,10); // Limit over all top ten results

        return NextResponse.json({ results: limitedResults });

    } catch (error) {
        console.error('Error in /api/search-cities:', error);
        return NextResponse.json(
            { error: 'Failed to search cities', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
