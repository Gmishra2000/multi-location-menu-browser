/**
 * POST /api/webhooks/square
 *
 * Receives Square webhook notifications for catalog/location updates.
 * Invalidates Next.js cache to keep data in sync.
 *
 * Security: Verifies Square webhook signature.
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import crypto from 'crypto';

// Square webhook signature verification
function verifySquareSignature(
  body: string,
  signature: string | null,
  signatureKey: string,
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', signatureKey);
  hmac.update(body);
  const expectedSignature = hmac.digest('base64');

  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-square-hmacsha256-signature');
    const body = await request.text();

    // Verify webhook signature (production security)
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '';
    if (
      process.env.NODE_ENV === 'production' &&
      !verifySquareSignature(body, signature, signatureKey)
    ) {
      console.error('❌ Invalid Square webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log('📨 Square webhook received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'catalog.version.updated':
        console.log('🔄 Catalog updated - invalidating cache');
        revalidateTag('catalog');
        break;

      case 'location.updated':
      case 'location.created':
        console.log('📍 Location updated - invalidating cache');
        revalidateTag('locations');
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
