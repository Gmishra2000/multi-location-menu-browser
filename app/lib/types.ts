/**
 * TypeScript Type Definitions for Square API Data
 *
 * These types ensure type safety at the boundaries between Square API
 * and our application. We define only the fields we actually use to
 * keep types maintainable.
 */

// Location Types
export interface Location {
  id: string;
  name?: string;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    locality?: string;
    administrativeDistrictLevel1?: string;
    postalCode?: string;
  };
  timezone?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

// Money Types (Square uses smallest currency unit - cents for USD)
export interface Money {
  amount?: bigint;
  currency?: string;
}

// Catalog Item Variation (represents a specific SKU/price point)
export interface CatalogItemVariation {
  id: string;
  type?: 'ITEM_VARIATION';
  itemId?: string;
  name?: string;
  priceMoney?: Money;
  ordinal?: number;
  // Square SDK v44 nests variation data inside itemVariationData
  itemVariationData?: {
    itemId?: string;
    name?: string;
    ordinal?: number;
    pricingType?: string;
    priceMoney?: Money;
    sellable?: boolean;
    stockable?: boolean;
  };
}

// Catalog Item
export interface CatalogItem {
  id: string;
  type: 'ITEM';
  itemData: {
    name?: string;
    description?: string;
    categoryId?: string;
    variations?: CatalogItemVariation[];
    imageIds?: string[];
    // Location availability fields - critical for filtering
    availableForPickup?: boolean;
    availableOnline?: boolean;
  };
  // Location-based availability
  presentAtAllLocations?: boolean;
  presentAtLocationIds?: string[];
  absentAtLocationIds?: string[];
}

// Catalog Category
export interface CatalogCategory {
  id: string;
  type: 'CATEGORY';
  categoryData: {
    name?: string;
  };
  // Availability scheduling (for time-based filtering bonus)
  presentAtAllLocations?: boolean;
  presentAtLocationIds?: string[];
  absentAtLocationIds?: string[];
}

// Catalog Image
export interface CatalogImage {
  id: string;
  type: 'IMAGE';
  imageData: {
    url?: string;
    caption?: string;
  };
}

// Union type for all catalog objects
export type CatalogObject = CatalogItem | CatalogCategory | CatalogImage;

// Parsed/processed types for UI consumption
export interface ProcessedItem {
  id: string;
  name: string;
  description: string;
  categoryId?: string;
  categoryName?: string;
  price: number; // In cents
  currency: string;
  imageUrl?: string;
  availableAtLocationIds: string[];
  availableAtAllLocations: boolean;
}

export interface ProcessedCategory {
  id: string;
  name: string;
  itemCount: number;
}
