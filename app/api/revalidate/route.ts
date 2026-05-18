/**
 * POST /api/revalidate
 *
 * Manual cache invalidation endpoint for development/testing.
 * In production, use Square webhooks instead.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/revalidate
 *   curl -X POST http://localhost:3000/api/revalidate?tag=catalog
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');

    if (tag) {
      // Invalidate specific tag
      revalidateTag(tag);
      console.log(`🔄 Cache invalidated: ${tag}`);
      return NextResponse.json({
        revalidated: true,
        tag,
        now: Date.now(),
      });
    } else {
      // Invalidate all catalog-related caches
      revalidateTag('catalog');
      revalidateTag('locations');
      console.log('🔄 All caches invalidated');
      return NextResponse.json({
        revalidated: true,
        tags: ['catalog', 'locations'],
        now: Date.now(),
      });
    }
  } catch (error) {
    console.error('Error revalidating cache:', error);
    return NextResponse.json(
      { error: 'Cache revalidation failed' },
      { status: 500 },
    );
  }
}
