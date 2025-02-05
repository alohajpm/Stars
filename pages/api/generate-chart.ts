import { NextApiRequest, NextApiResponse } from 'next';
import { createCanvas, CanvasRenderingContext2D } from 'canvas';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb',
        },
        responseLimit: false,
    },
};

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

function drawSymbol(
    context: CanvasRenderingContext2D,
    symbol: string,
    x: number,
    y: number,
    fontSize: number = 14
) {
    context.font = `${fontSize}px Arial`;
    context.fillStyle = 'black';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(symbol, x, y);
}

const planetSymbols: { [key: string]: string } = {
    Sun: '☉',
    Moon: '☽',
    Mercury: '☿',
    Venus: '♀',
    Mars: '♂',
    Jupiter: '♃',
    Saturn: '♄',
    Uranus: '♅',
    Neptune: '♆',
    Pluto: '♇',
};

const zodiacSymbols: { [key: string]: string } = {
    'Aries': '♈',
    'Taurus': '♉',
    'Gemini': '♊',
    'Cancer': '♋',
    'Leo': '♌',
    'Virgo': '♍',
    'Libra': '♎',
    'Scorpio': '♏',
    'Sagittarius': '♐',
    'Capricorn': '♑',
    'Aquarius': '♒',
    'Pisces': '♓',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const { positions } = req.body;

        if (!positions) {
            return res.status(400).json({ error: 'Positions data is required' });
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
        const outerRadius = Math.min(centerX, centerY) * 0.85;
        const innerRadius = outerRadius * 0.6;

        // Draw outer circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw inner circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw zodiac segments
        const zodiacSigns = Object.keys(zodiacSymbols);
        const segmentAngle = (2 * Math.PI) / 12;

        zodiacSigns.forEach((sign, i) => {
            const startAngle = i * segmentAngle;
            const endAngle = (i + 1) * segmentAngle;
            const midAngle = (startAngle + endAngle) / 2;

            // Draw segment lines
            ctx.beginPath();
            ctx.moveTo(
                centerX + innerRadius * Math.cos(startAngle),
                centerY + innerRadius * Math.sin(startAngle)
            );
            ctx.lineTo(
                centerX + outerRadius * Math.cos(startAngle),
                centerY + outerRadius * Math.sin(startAngle)
            );
            ctx.stroke();

            // Draw zodiac symbols
            const symbolRadius = (outerRadius + innerRadius) / 2;
            const symbolX = centerX + symbolRadius * Math.cos(midAngle);
            const symbolY = centerY + symbolRadius * Math.sin(midAngle);
            drawSymbol(ctx, zodiacSymbols[sign], symbolX, symbolY, 20);
        });

        // Plot planets
        Object.entries(positions).forEach(([planet, data]) => {
            if (planet !== 'Houses' && planetSymbols[planet] && data.sign && typeof data.degree === 'number') {
                const signIndex = zodiacSigns.indexOf(data.sign);
                if (signIndex !== -1) {
                    const planetAngle = ((signIndex * 30 + data.degree) / 180) * Math.PI;
                    const planetRadius = innerRadius * 0.8;
                    const x = centerX + planetRadius * Math.cos(planetAngle);
                    const y = centerY + planetRadius * Math.sin(planetAngle);

                    // Draw planet symbol
                    const symbol = planetSymbols[planet];
                    drawCircle(ctx, x, y, 10, '#FFFFFF');
                    drawCircle(ctx, x, y, 9, '#4A90E2');
                    drawSymbol(ctx, symbol, x, y);

                    // Add degree text
                    const textRadius = innerRadius * 0.6;
                    const textX = centerX + textRadius * Math.cos(planetAngle);
                    const textY = centerY + textRadius * Math.sin(planetAngle);
                    ctx.font = '12px Arial';
                    ctx.fillStyle = '#000000';
                    ctx.fillText(`${data.degree}°`, textX, textY);
                }
            }
        });

        // Convert canvas to base64 image
        const imageDataUrl = canvas.toDataURL('image/png');
        
        return res.status(200).json({ image: imageDataUrl });

    } catch (error) {
        console.error('Error generating chart:', error);
        return res.status(500).json({
            error: 'Failed to generate chart image',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
