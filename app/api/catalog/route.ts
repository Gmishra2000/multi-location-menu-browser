/**
 * GET /api/catalog
 *
 * Fetches catalog items, categories, and images from Square's Catalog API.
 */

import { NextResponse } from 'next/server';
import { squareClient } from '@/app/lib/square';

// Helper to convert BigInt to Number for JSON serialization
function serializeCatalogObject(obj: unknown): unknown {
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

    const allItems = catalogObjects.filter((obj) => obj.type === 'ITEM');
    const allCategories = catalogObjects.filter((obj) => obj.type === 'CATEGORY');
    const images = catalogObjects.filter((obj) => obj.type === 'IMAGE');

    // Deduplicate items: keep only the most recent version of each item by name
    const itemsByName = new Map();
    allItems.forEach((item) => {
      const itemName = item.itemData?.name;
      if (!itemName) return;

      const existing = itemsByName.get(itemName);
      const currentUpdatedAt = new Date(item.updatedAt || 0).getTime();
      const existingUpdatedAt = existing ? new Date(existing.updatedAt || 0).getTime() : 0;

      if (!existing || currentUpdatedAt > existingUpdatedAt) {
        itemsByName.set(itemName, item);
      }
    });

    const items = Array.from(itemsByName.values());

    // Deduplicate categories: keep only the most recent version of each category by name
    const categoriesByName = new Map();
    allCategories.forEach((category) => {
      const categoryName = category.categoryData?.name;
      if (!categoryName) return;

      const existing = categoriesByName.get(categoryName);
      const currentUpdatedAt = new Date(category.updatedAt || 0).getTime();
      const existingUpdatedAt = existing ? new Date(existing.updatedAt || 0).getTime() : 0;

      if (!existing || currentUpdatedAt > existingUpdatedAt) {
        categoriesByName.set(categoryName, category);
      }
    });

    const categories = Array.from(categoriesByName.values());

    // Serialize objects to handle BigInt values
    return NextResponse.json(
      {
        items: serializeCatalogObject(items),
        categories: serializeCatalogObject(categories),
        images: serializeCatalogObject(images),
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
