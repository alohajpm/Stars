import { NextApiRequest, NextApiResponse } from 'next';
import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import fs from 'fs';
import path from 'path';

// --- Type Definitions ---
type CityData = { // These types are used for loading city data
  name: string;
  state_code: string;
  lat: string;
  lng: string;
};
type CityCoordinates = {
    [cityState: string]: {
        lat: number;
        lng: number;
    };
};

// --- Read cities data (same as in calculate-positions)---
const publicDir = path.join(process.cwd(), 'public');
const citiesFilePath = path.join(publicDir, 'cities.json');
const citiesData = fs.readFileSync(citiesFilePath, 'utf8');
const cities = JSON.parse(citiesData);

const cityCoordinates: CityCoordinates = (cities as CityData[]).reduce((acc: CityCoordinates, city: CityData) => {
  const key = `${city.name.toUpperCase()}, ${city.state_code.toUpperCase()}`;
  acc[key] = { lat: parseFloat(city.lat), lng: parseFloat(city.lng) };
  return acc;
}, {} as CityCoordinates);


// --- Helper Function ---
function drawCircle(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string
) {
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI, false);
    context.fillStyle = color;
    context.fill();
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { positions } = req.body;

        if (!positions) {
            return res
                .status(400)
                .json({ error: 'Astrological positions are required.' });
        }

        const width = 800;
        const height = 800;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        const zodiacSigns = [
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
        const angles = zodiacSigns.map(
            (_, index) => (index * 2 * Math.PI) / zodiacSigns.length
        );

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) * 0.85;

        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 1;
        angles.forEach((angle) => {
            const x1 = centerX + radius * Math.cos(angle);
            const y1 = centerY + radius * Math.sin(angle);
            const x2 = centerX;
            const y2 = centerY;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });

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
const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

        for (const planet of planets) {
            // Check for undefined and missing degree
            if (!positions[planet] || typeof positions[planet].degree !== 'number') {
              continue;
            }
            const signIndex = zodiacSigns.indexOf(positions[planet].sign);
            // Check that the sign was found
            if (signIndex === -1) {
              continue;
            }

            const degreeInSign = positions[planet].degree;
            const angle = ((signIndex * 30 + degreeInSign) / 180) * Math.PI;
            const x = centerX + radius * 0.85 * Math.cos(angle);
            const y = centerY + radius * 0.85 * Math.sin(angle);

            drawCircle(ctx, x, y, 5, 'blue'); // Draw planet

            ctx.font = '12px Arial';
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.fillText(planet, x, y - 10); // Label planet
        }


        const imageDataURL = canvas.toDataURL('image/png');
        res.status(200).json({ image: imageDataURL });
    } catch (error) {
        console.error('Error generating chart:', error);
        res.status(500).json({
            error: 'Failed to generate chart',
            details:
                error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
