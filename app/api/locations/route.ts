/**
 * GET /api/locations
 *
 * Fetches all active locations from Square's Locations API.
 *
 * Security: Square access token is only used server-side.
 * Error handling: Returns 500 with generic message on failure.
 */

import { NextResponse } from 'next/server';
import { squareClient } from '@/app/lib/square';
import type { Location } from '@/app/lib/types';

export async function GET() {
  try {
    const response = await squareClient.locations.list();
    // Note: locations.list() returns response.locations (not response.data like catalog)
    const locations = response.locations || [];

    const activeLocations = locations.filter(
      (location) => location.status === 'ACTIVE',
    );

    return NextResponse.json(activeLocations as Location[], {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching locations:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch locations. Please try again later.',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
      { status: 500 },
    );
  }
}
