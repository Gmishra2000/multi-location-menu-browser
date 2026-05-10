/**
 * GET /api/catalog
 *
 * Fetches catalog items, categories, and images from Square's Catalog API.
 */

import { NextResponse } from 'next/server';
import { squareClient } from '@/app/lib/square';
import type { CatalogObject } from '@/app/lib/types';

// Helper to convert BigInt to Number for JSON serialization
function serializeCatalogObject(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
}

export async function GET() {
  try {
    const response = await squareClient.catalog.list({
      types: 'ITEM,CATEGORY,IMAGE',
    });

    // Square SDK v44+ uses response.data (array-like) not response.objects
    const catalogArray = response.data ? Object.values(response.data) : [];
    const catalogObjects = catalogArray.filter(Boolean);

    const items = catalogObjects.filter((obj) => obj.type === 'ITEM');
    const categories = catalogObjects.filter((obj) => obj.type === 'CATEGORY');
    const images = catalogObjects.filter((obj) => obj.type === 'IMAGE');

    // Serialize objects to handle BigInt values
    return NextResponse.json(
      {
        items: serializeCatalogObject(items),
        categories: serializeCatalogObject(categories),
        images: serializeCatalogObject(images),
        cursor: response._hasNextPage ? 'has_more' : undefined,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    console.error('Error fetching catalog:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch catalog. Please try again later.',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
      { status: 500 },
    );
  }
}
