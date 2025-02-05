import { NextApiRequest, NextApiResponse } from 'next';
import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import * as Astronomy from 'astronomy-engine';
import moment from 'moment-timezone';
import cities from '../../public/cities.json'; // Import cities.json

// Define a type for the city data to ensure consistency
type CityData = {
  name: string;
  state_code: string;
  lat: string;
  lng: string;
};

const cityCoordinates: { [key: string]: { lat: number; lng: number; } } = {};

// Populate cityCoordinates with data from cities.json
(cities as CityData[]).forEach(city => {
  const key = `${city.name.toUpperCase()}, ${city.state_code.toUpperCase()}`;
  cityCoordinates[key] = {
    lat: parseFloat(city.lat),
    lng: parseFloat(city.lng)
  };
});

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { positions } = req.body;

      // Validate that positions are provided
      if (!positions) {
        return res.status(400).json({ error: 'Astrological positions are required.' });
      }

      // Define the dimensions of the chart
      const width = 800;
      const height = 800;

      // Create a canvas
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Chart background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);

      // Zodiac signs
      const zodiacSigns = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
      ];
      const angles = zodiacSigns.map((_, index) => (index * 2 * Math.PI) / zodiacSigns.length);

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) * 0.85;

      // Function to draw a circle
      function drawCircle(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI, false);
        context.fillStyle = color;
        context.fill();
      }

      // Draw zodiac divisions
      ctx.strokeStyle = 'gray';
      ctx.lineWidth = 1;
      angles.forEach(angle => {
        const x1 = centerX + radius * Math.cos(angle);
        const y1 = centerY + radius * Math.sin(angle);
        const x2 = centerX;
        const y2 = centerY;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // Label zodiac signs
      ctx.fillStyle = 'black';
      ctx.font = 'bold 16px Arial';
      zodiacSigns.forEach((sign, i) => {
        const angle = (angles[i] + angles[i + 1]) / 2;
        const labelRadius = radius * 1.1;
        const x = centerX + labelRadius * Math.cos(angle);
        const y = centerY + labelRadius * Math.sin(angle) + 8;
        ctx.textAlign = 'center';
        ctx.fillText(sign, x, y);
      });

      // Convert planetary positions to coordinates on the canvas and draw them
      for (const planet in positions) {
        // Skip if the key is not a planet or if it's 'Houses' or 'Aspects'
        if (!positions.hasOwnProperty(planet) || planet === 'Houses' || planet === 'Aspects' || planet === 'Ascendant') {
          continue;
        }
        
        // Ensure the planet data is in the expected format
        if (typeof positions[planet].degree !== 'number') {
          console.error(`Invalid degree for ${planet}:`, positions[planet].degree);
          continue;
        }
        
        // Calculate the angle based on the planet's position
        const signIndex = zodiacSigns.indexOf(positions[planet].sign);
        if (signIndex === -1) {
          console.error(`Invalid sign for ${planet}:`, positions[planet].sign);
          continue;
        }
      
        const degreeInSign = positions[planet].degree;
        const angle = ((signIndex * 30 + degreeInSign) / 180) * Math.PI;
      
        // Convert polar coordinates to cartesian coordinates for drawing
        const x = centerX + radius * 0.85 * Math.cos(angle);
        const y = centerY + radius * 0.85 * Math.sin(angle);
      
        // Draw the planet as a filled circle
        drawCircle(ctx, x, y, 5, 'blue'); // Adjust color and size as needed
      
        // Label the planet
        ctx.font = '12px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText(planet, x, y - 10);
      }

       // Convert the canvas to a PNG data URL
      const imageDataURL = canvas.toDataURL('image/png');

      // Send the image data URL in the response
      res.status(200).json({ image: imageDataURL });
    } catch (error) {
      console.error('Error generating chart:', error);
      res.status(500).json({ error: 'Failed to generate chart', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
