// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only apply to /api/ paths
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (request.method === 'OPTIONS') {
      // Preflight
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*', // or "http://localhost:19006"
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // Normal GET/POST requests also need the header
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*'); // or specific domain
    return response;
  }

  // For other routes, just continue
  return NextResponse.next();
}

// So that only /api routes get it:
export const config = {
  matcher: ['/api/:path*'],
};
