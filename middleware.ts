import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only affect /api routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // If the method is OPTIONS, return a preflight response
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,PUT,PATCH,DELETE',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // For normal GET/POST, also set CORS
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }

  // For other (non /api) routes
  return NextResponse.next();
}

// Ensure the matcher includes /api:
export const config = {
  matcher: ['/api/:path*'],
};
