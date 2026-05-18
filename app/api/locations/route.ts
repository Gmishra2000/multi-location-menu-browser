/**
 * GET /api/locations
 *
 * Fetches all active locations from Square's Locations API.
 * Implements server-side caching to reduce API calls.
 *
 * Security: Square access token is only used server-side.
 * Error handling: Returns 500 with generic message on failure.
 */

import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { squareClient } from '@/app/lib/square';
import type { Location } from '@/app/lib/types';

// Cached Square API call - locations rarely change
// Revalidates every 10 minutes (600 seconds)
const getCachedLocations = unstable_cache(
  async () => {
    console.log('📍 Fetching fresh locations from Square API...');
    const response = await squareClient.locations.list();
    // Note: locations.list() returns response.locations (not response.data like catalog)
    const locations = response.locations || [];

    return locations.filter(
      (location) => location.status === 'ACTIVE',
    );
  },
  ['square-locations'], // Cache key
  {
    revalidate: 600, // 10 minutes (locations change rarely)
    tags: ['locations'],
  }
);

export async function GET() {
  try {
    // Use cached data - hits Square API max once every 10 minutes
    const activeLocations = await getCachedLocations();

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
