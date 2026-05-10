/**
 * Utility Functions
 *
 * Shared helper functions used across the application.
 */

/**
 * Format money from Square's smallest currency unit (cents) to display format
 *
 * Square returns all monetary values in the smallest currency unit:
 * - USD: cents (100 cents = $1.00)
 * - JPY: yen (no decimal places)
 *
 * @param amount - Amount in smallest currency unit (e.g., cents)
 * @param currency - ISO 4217 currency code (default: USD)
 * @returns Formatted currency string (e.g., "$12.50")
 */
export function formatMoney(amount: number | bigint, currency: string = 'USD'): string {
  const numericAmount = typeof amount === 'bigint' ? Number(amount) : amount;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(numericAmount / 100);
}

/**
 * Check if an item is available at a specific location
 *
 * Square uses three fields to determine location availability:
 * 1. present_at_all_locations: true = available everywhere
 * 2. present_at_location_ids: explicit list of locations where available
 * 3. absent_at_location_ids: explicit list of locations where NOT available
 *
 * @param item - Catalog item or category
 * @param locationId - Location ID to check
 * @returns true if item is available at the location
 */
export function isAvailableAtLocation(
  item: {
    presentAtAllLocations?: boolean;
    presentAtLocationIds?: string[];
    absentAtLocationIds?: string[];
  },
  locationId: string
): boolean {
  // If explicitly absent, not available
  if (item.absentAtLocationIds?.includes(locationId)) {
    return false;
  }

  // If present at all locations (and not explicitly absent), available
  if (item.presentAtAllLocations) {
    return true;
  }

  // Check if explicitly present at this location
  return item.presentAtLocationIds?.includes(locationId) ?? false;
}

/**
 * Safely extract error message from unknown error type
 *
 * @param error - Error object (type unknown for safety)
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
