/**
 * Square API Client Configuration
 *
 * This server-side module initializes the Square SDK client.
 * NEVER expose this client or access tokens to the client-side code.
 * All Square API calls MUST go through Next.js API routes.
 */

import { SquareClient, SquareEnvironment } from 'square';

// Validate required environment variables at runtime
if (!process.env.SQUARE_ACCESS_TOKEN) {
  throw new Error('SQUARE_ACCESS_TOKEN is required in environment variables');
}

if (!process.env.SQUARE_ENVIRONMENT) {
  throw new Error('SQUARE_ENVIRONMENT is required in environment variables');
}

// Initialize Square client with sandbox credentials
export const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox,
});
