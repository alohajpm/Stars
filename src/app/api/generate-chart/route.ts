// /src/app/api/generate-chart/route.ts
import { NextResponse } from 'next/server';
import { createCanvas, CanvasRenderingContext2D, registerFont } from 'canvas';
import path from 'path';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb',
        },
        responseLimit: false,
    },
};

interface PlanetPosition {
    sign: string;
    degree: number;
    minutes: number;
}

interface Positions {
    [key: string]: PlanetPosition | any; // Keep 'any' for Houses
    Houses: Array<{
        house: number;
        sign: string;
        degree: number;
        minutes: number;
    }>;
}

// --- Helper Functions ---

function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, stroke = false, lineWidth = 1) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    if (stroke) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    } else {
        ctx.fillStyle = color;
        ctx.fill();
    }
}

function drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, lineWidth = 1) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

// --- Font and Symbol Setup ---

// Make sure AstroGadget.ttf is in your public folder!
const fontPath = path.join(process.cwd(), 'public', 'AstroGadget.ttf');
try {
  registerFont(fontPath, { family: 'AstroGadget' });
} catch (error){
    console.error("Error Registering Font:", error)
}

// Corrected symbol mappings:
const planetSymbols: { [key: string]: string } = {
    Sun: 'S',
    Moon: 'M',
    Mercury: 'E',
    Venus: 'V',
    Mars: 'A',
    Jupiter: 'J',
    Saturn: 'H',
    Uranus: 'G', // Corrected Uranus
    Neptune: 'O', // Corrected Neptune
    Pluto: 'P',
    Ascendant: 'Z'
};

const zodiacSymbols: { [key: string]: string } = {
    'Aries': 'a',
    'Taurus': 'b', // Corrected Taurus
    'Gemini': 'c', // Corrected Gemini
    'Cancer': 'd',
    'Leo': 'e',
    'Virgo': 'f',
    'Libra': 'g',
    'Scorpio': 'h',
    'Sagittarius': 'i', // Corrected Sagittarius
    'Capricorn': 'j',
    'Aquarius': 'k',
    'Pisces': 'l',
};

// --- Aspect Calculation ---

// Function to calculate the angular distance between two planets.
function calculateAngleDifference(angle1: number, angle2: number): number {
    let diff = (angle2 - angle1 + 180) % 360 - 180;
    return diff < -180 ? diff + 360 : diff;
}

// Function to determine if two planets form a major aspect.
function isMajorAspect(angleDiff: number): { isAspect: boolean; aspectType?: string } {
    const aspects = {
        conjunction: { angle: 0, orb: 8 },
        sextile: { angle: 60, orb: 6 },
        square: { angle: 90, orb: 8 },
        trine: { angle: 120, orb: 8 },
        opposition: { angle: 180, orb: 8 },
    };

    for (const [aspectType, aspect] of Object.entries(aspects)) {
        if (Math.abs(angleDiff - aspect.angle) <= aspect.orb) {
            return { isAspect: true, aspectType };
        }
      if (Math.abs(angleDiff + aspect.angle) <= aspect.orb){
        return {isAspect: true, aspectType};
      }
    }

    return { isAspect: false };
}


// --- Main API Route ---

export async function POST(request: Request) {
  try {
      const body = await request.json();
      const { positions } = body as { positions: Positions };

        if (!positions) {
            return NextResponse.json(
                { error: 'Positions data is required' },
                { status: 400 }
            );
        }

        const width = 800;
        const height = 800;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Set white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const outerRadius = Math.min(centerX, centerY) * 0.9; // Increased for more space
        const innerRadius = outerRadius * 0.65; // Adjusted for house numbers
        const houseNumberRadius = (outerRadius + innerRadius) / 2;
        const zodiacSymbolRadius = outerRadius * 0.95; // Just inside the outer circle
        const planetRadius = innerRadius * 0.8;
        const degreeRadius = innerRadius * 0.9;

        // Draw outer circle
        drawCircle(ctx, centerX, centerY, outerRadius, '#000000', true, 2);

        // Draw inner circle
        drawCircle(ctx, centerX, centerY, innerRadius, '#000000', true, 2);

       // Draw zodiac segments and symbols
        const zodiacSigns = Object.keys(zodiacSymbols);
        const segmentAngle = (2 * Math.PI) / 12;
        zodiacSigns.forEach((sign, i) => {
            const startAngle = i * segmentAngle;
            const endAngle = (i + 1) * segmentAngle;
            const midAngle = (startAngle + endAngle) / 2;

            // Draw segment lines
            drawLine(ctx,
                centerX + innerRadius * Math.cos(startAngle),
                centerY + innerRadius * Math.sin(startAngle),
                centerX + outerRadius * Math.cos(startAngle),
                centerY + outerRadius * Math.sin(startAngle),
                '#000000',
                1
              );

            // Draw zodiac symbols
            ctx.font = '24px AstroGadget'; // Use the loaded font
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(zodiacSymbols[sign],
                centerX + zodiacSymbolRadius * Math.cos(midAngle),
                centerY + zodiacSymbolRadius * Math.sin(midAngle)
            );

              // Draw house numbers
            ctx.font = '16px Arial';
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((i + 1).toString(),
                centerX + houseNumberRadius * Math.cos(midAngle),
                centerY + houseNumberRadius * Math.sin(midAngle)
            );

            // Draw degree markings (minor ticks)
              for (let j = 0; j < 30; j++) {
                  const tickAngle = startAngle + (j / 30) * segmentAngle;
                  const tickOuterRadius = outerRadius;
                  const tickInnerRadius = j % 5 === 0 ? outerRadius * 0.95 : outerRadius * 0.97; // Longer ticks every 5 degrees

                  drawLine(ctx,
                      centerX + tickOuterRadius * Math.cos(tickAngle),
                      centerY + tickOuterRadius * Math.sin(tickAngle),
                      centerX + tickInnerRadius * Math.cos(tickAngle),
                      centerY + tickInnerRadius * Math.sin(tickAngle),
                      '#000000',
                      1
                  );
              }
        });

       // --- Plot Planets ---
       // Create a map to store planet positions for aspect calculations
        const planetPositions: { [key: string]: number } = {};

        Object.entries(positions).forEach(([key, data]: [string, any]) => {
             if (planetSymbols[key] && data?.sign && typeof data.degree === 'number') {
                const signIndex = zodiacSigns.indexOf(data.sign);

                if (signIndex !== -1) {
                  const planetAngle = ((signIndex * 30 + data.degree) / 180) * Math.PI;

                  // Adjust the radius based on whether it is the Ascendant or not
                  const currentPlanetRadius = (key === 'Ascendant') ? innerRadius * 0.30 : planetRadius;

                  const x = centerX + currentPlanetRadius * Math.cos(planetAngle);
                  const y = centerY + currentPlanetRadius * Math.sin(planetAngle);


                  // Draw planet symbol
                  ctx.font = '20px AstroGadget'; // Use the loaded font
                  ctx.fillStyle = 'black';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(planetSymbols[key], x, y);

                  // Draw degree text
                  ctx.font = '12px Arial';
                  ctx.fillStyle = 'black';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(`${data.degree}°`,
                      centerX + degreeRadius * Math.cos(planetAngle),
                      centerY + degreeRadius * Math.sin(planetAngle)
                  );

                  // Store the planet's angle in degrees for aspect calculation.
                  planetPositions[key] = signIndex * 30 + data.degree;
                }
            }
        });

        // --- Draw Aspect Lines ---
          const aspectColors = {
            conjunction: 'green',
            sextile: 'blue',
            square: 'red',
            trine: 'green',
            opposition: 'red',
        };

        // Iterate through all planet combinations to check for aspects.
      for (const planet1 in planetPositions) {
        for (const planet2 in planetPositions) {
          if (planet1 !== planet2) {
            const angleDiff = calculateAngleDifference(planetPositions[planet1], planetPositions[planet2]);
            const aspect = isMajorAspect(angleDiff);

              if (aspect.isAspect && aspect.aspectType) {
                //   console.log("Aspect Found:", aspect, "between", planet1, planet2)
                  const planet1Angle = (planetPositions[planet1] / 180) * Math.PI;
                  const planet2Angle = (planetPositions[planet2] / 180) * Math.PI;

                  const x1 = centerX + planetRadius * Math.cos(planet1Angle);
                  const y1 = centerY + planetRadius * Math.sin(planet1Angle);
                  const x2 = centerX + planetRadius * Math.cos(planet2Angle);
                  const y2 = centerY + planetRadius * Math.sin(planet2Angle);

                  drawLine(ctx, x1, y1, x2, y2, aspectColors[aspect.aspectType as keyof typeof aspectColors], 1); // Draw aspect line
              }
          }
        }
      }

        // Convert canvas to base64 image
        const imageDataUrl = canvas.toDataURL('image/png');

        return NextResponse.json({ image: imageDataUrl });

    } catch (error) {
        console.error('Error generating chart:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate chart image',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
