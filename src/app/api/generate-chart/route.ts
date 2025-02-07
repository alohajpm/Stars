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

// For TypeScript reference
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

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  stroke = false,
  lineWidth = 1
) {
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

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lineWidth = 1
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

// Font and symbol setup
const fontPath = path.join(process.cwd(), 'public', 'AstroGadget.ttf');
try {
  registerFont(fontPath, { family: 'AstroGadget' });
} catch (error) {
  console.error('Error Registering Font:', error);
}

const planetSymbols: { [key: string]: string } = {
  Sun: 'S',
  Moon: 'M',
  Mercury: 'E',
  Venus: 'V',
  Mars: 'A',
  Jupiter: 'J',
  Saturn: 'H',
  Uranus: 'G',
  Neptune: 'O',
  Pluto: 'P',
  Ascendant: 'Z',
};

const zodiacSymbols: { [key: string]: string } = {
  Aries: 'a',
  Taurus: 'b',
  Gemini: 'c',
  Cancer: 'd',
  Leo: 'e',
  Virgo: 'f',
  Libra: 'g',
  Scorpio: 'h',
  Sagittarius: 'i',
  Capricorn: 'j',
  Aquarius: 'k',
  Pisces: 'l',
};

// Aspect calculations
function calculateAngleDifference(angle1: number, angle2: number): number {
  let diff = ((angle2 - angle1 + 180) % 360) - 180;
  return diff < -180 ? diff + 360 : diff;
}

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
    if (Math.abs(angleDiff + aspect.angle) <= aspect.orb) {
      return { isAspect: true, aspectType };
    }
  }

  return { isAspect: false };
}

// ------------ CORS Preflight ---------------
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    }
  );
}

// ------------ POST Handler -----------------
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { positions } = body as { positions: Positions };

    if (!positions) {
      return NextResponse.json(
        { error: 'Positions data is required' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const width = 800;
    const height = 800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(centerX, centerY) * 0.9;
    const innerRadius = outerRadius * 0.65;
    const houseNumberRadius = (outerRadius + innerRadius) / 2;
    const zodiacSymbolRadius = outerRadius * 0.95;
    const planetRadius = innerRadius * 0.8;
    const degreeRadius = innerRadius * 0.9;

    // Outer & inner circles
    drawCircle(ctx, centerX, centerY, outerRadius, '#000000', true, 2);
    drawCircle(ctx, centerX, centerY, innerRadius, '#000000', true, 2);

    // Draw zodiac segments
    const zodiacSigns = Object.keys(zodiacSymbols);
    const segmentAngle = (2 * Math.PI) / 12;
    zodiacSigns.forEach((sign, i) => {
      const startAngle = i * segmentAngle;
      const endAngle = (i + 1) * segmentAngle;
      const midAngle = (startAngle + endAngle) / 2;

      // Segment line
      drawLine(
        ctx,
        centerX + innerRadius * Math.cos(startAngle),
        centerY + innerRadius * Math.sin(startAngle),
        centerX + outerRadius * Math.cos(startAngle),
        centerY + outerRadius * Math.sin(startAngle),
        '#000000',
        1
      );

      // Zodiac symbol
      ctx.font = '24px AstroGadget';
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        zodiacSymbols[sign],
        centerX + zodiacSymbolRadius * Math.cos(midAngle),
        centerY + zodiacSymbolRadius * Math.sin(midAngle)
      );

      // House number
      ctx.font = '16px Arial';
      ctx.fillText(
        (i + 1).toString(),
        centerX + houseNumberRadius * Math.cos(midAngle),
        centerY + houseNumberRadius * Math.sin(midAngle)
      );

      // Degree markings
      for (let j = 0; j < 30; j++) {
        const tickAngle = startAngle + (j / 30) * segmentAngle;
        const tickOuterRadius = outerRadius;
        const tickInnerRadius = j % 5 === 0 ? outerRadius * 0.95 : outerRadius * 0.97;

        drawLine(
          ctx,
          centerX + tickOuterRadius * Math.cos(tickAngle),
          centerY + tickOuterRadius * Math.sin(tickAngle),
          centerX + tickInnerRadius * Math.cos(tickAngle),
          centerY + tickInnerRadius * Math.sin(tickAngle),
          '#000000',
          1
        );
      }
    });

    // Plot planets
    const planetPositions: { [key: string]: number } = {};

    Object.entries(positions).forEach(([key, data]) => {
      if (planetSymbols[key] && data?.sign && typeof data.degree === 'number') {
        const signIndex = zodiacSigns.indexOf(data.sign);
        if (signIndex !== -1) {
          const planetAngle = ((signIndex * 30 + data.degree) / 180) * Math.PI;
          const currentPlanetRadius = key === 'Ascendant' ? innerRadius * 0.3 : planetRadius;
          const x = centerX + currentPlanetRadius * Math.cos(planetAngle);
          const y = centerY + currentPlanetRadius * Math.sin(planetAngle);

          // Planet symbol
          ctx.font = '20px AstroGadget';
          ctx.fillText(planetSymbols[key], x, y);

          // Degree text
          ctx.font = '12px Arial';
          ctx.fillText(
            `${data.degree}°`,
            centerX + degreeRadius * Math.cos(planetAngle),
            centerY + degreeRadius * Math.sin(planetAngle)
          );

          // Store angle for aspects
          planetPositions[key] = signIndex * 30 + data.degree;
        }
      }
    });

    // Draw aspect lines
    const aspectColors: any = {
      conjunction: 'green',
      sextile: 'blue',
      square: 'red',
      trine: 'green',
      opposition: 'red',
    };

    for (const planet1 in planetPositions) {
      for (const planet2 in planetPositions) {
        if (planet1 !== planet2) {
          const angleDiff = calculateAngleDifference(
            planetPositions[planet1],
            planetPositions[planet2]
          );
          const aspect = isMajorAspect(angleDiff);
          if (aspect.isAspect && aspect.aspectType) {
            const planet1Angle = (planetPositions[planet1] / 180) * Math.PI;
            const planet2Angle = (planetPositions[planet2] / 180) * Math.PI;

            const x1 = centerX + planetRadius * Math.cos(planet1Angle);
            const y1 = centerY + planetRadius * Math.sin(planet1Angle);
            const x2 = centerX + planetRadius * Math.cos(planet2Angle);
            const y2 = centerY + planetRadius * Math.sin(planet2Angle);

            drawLine(ctx, x1, y1, x2, y2, aspectColors[aspect.aspectType], 1);
          }
        }
      }
    }

    // Convert canvas to base64
    const imageDataUrl = canvas.toDataURL('image/png');

    return NextResponse.json(
      { image: imageDataUrl },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error generating chart:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate chart image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
