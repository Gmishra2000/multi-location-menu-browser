'use client';

import { useEffect, useState } from 'react';
import type { Location, CatalogItem, CatalogCategory } from './lib/types';
import { isAvailableAtLocation } from './lib/utils';
import { isCategoryAvailableNow, getCurrentTime } from './lib/availability';
import LocationSwitcher from './components/LocationSwitcher';
import CategoryFilter from './components/CategoryFilter';
import MenuGrid from './components/MenuGrid';
import ItemDetail from './components/ItemDetail';
import LoadingState from './components/LoadingState';

export default function Home() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [allItems, setAllItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [showUnavailableItems, setShowUnavailableItems] = useState(false); // Time-based filter toggle
  const [currentTime, setCurrentTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const [locationsRes, catalogRes] = await Promise.all([
          fetch('/api/locations'),
          fetch('/api/catalog'),
        ]);

        if (!locationsRes.ok || !catalogRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const locationsData = await locationsRes.json();
        const catalogData = await catalogRes.json();

        setLocations(locationsData || []);
        setAllItems(catalogData.items || []);
        setCategories(catalogData.categories || []); // API now handles deduplication

        // Auto-select first location
        if (locationsData?.length > 0) {
          setSelectedLocationId(locationsData[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Update current time for display
  useEffect(() => {
    const updateTime = () => setCurrentTime(getCurrentTime());
    updateTime(); // Set immediately
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Helper: Map item names to categories
  // NOTE: Square updated their Catalog API in Dec 2023 - categoryId (singular) is deprecated.
  // The current API uses categories (plural, array) to support items in multiple categories.
  const getCategoryForItem = (item: CatalogItem): string => {
    // First, try the current API (categories array) - introduced Dec 2023
    if (item.itemData.categories && item.itemData.categories.length > 0) {
      const categoryId = item.itemData.categories[0].id;
      const category = categories.find(c => c.id === categoryId);
      if (category?.categoryData?.name) {
        return category.categoryData.name;
      }
    }

    // Fallback to deprecated categoryId (for backwards compatibility)
    if (item.itemData.categoryId) {
      const category = categories.find(c => c.id === item.itemData.categoryId);
      if (category?.categoryData?.name) {
        return category.categoryData.name;
      }
    }

    // Last resort: Pattern matching for demo/sandbox environment
    // This could be extended to parse from item descriptions or other metadata
    const itemName = item.itemData.name?.toLowerCase() || '';
    const description = item.itemData.description?.toLowerCase() || '';

    // Breakfast indicators
    if (itemName.includes('pancake') || itemName.includes('egg') ||
        itemName.includes('toast') || itemName.includes('breakfast') ||
        description.includes('morning') || description.includes('breakfast')) {
      return 'Breakfast';
    }

    // Lunch indicators
    if (itemName.includes('burger') || itemName.includes('salad') ||
        itemName.includes('sandwich') || itemName.includes('lunch') ||
        description.includes('lunch')) {
      return 'Lunch';
    }

    // Beverage indicators
    if (itemName.includes('coffee') || itemName.includes('latte') ||
        itemName.includes('tea') || itemName.includes('espresso') ||
        itemName.includes('drink') || description.includes('beverage')) {
      return 'Beverages';
    }

    // Dessert indicators
    if (itemName.includes('cake') || itemName.includes('dessert') ||
        itemName.includes('sweet') || itemName.includes('brownie') ||
        description.includes('dessert') || description.includes('sweet')) {
      return 'Desserts';
    }

    return '';
  };

  // Get selected location for timezone
  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  // Filter items based on selected location, category, and time-based availability
  const filteredItems = allItems.filter((item) => {
    // Filter by location
    const availableAtLocation = selectedLocationId
      ? isAvailableAtLocation(item, selectedLocationId)
      : true;

    // Filter by category
    const matchesCategory = selectedCategoryId === 'all'
      ? true
      : (() => {
          const selectedCategory = categories.find(c => c.id === selectedCategoryId);
          const itemCategoryName = getCategoryForItem(item);
          return itemCategoryName === selectedCategory?.categoryData?.name;
        })();

    // Filter by time-based availability (if toggle is OFF, hide unavailable items)
    const itemCategoryName = getCategoryForItem(item);
    const availableByTime = showUnavailableItems
      ? true  // Show all items when toggle is ON
      : isCategoryAvailableNow(itemCategoryName);

    return availableAtLocation && matchesCategory && availableByTime;
  });

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-12 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Oops! Something went wrong</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Menu Browser</h1>
                <p className="text-sm text-slate-600">Powered by Square Catalog API</p>
              </div>
            </div>

            {/* Location Switcher */}
            <LocationSwitcher
              locations={locations}
              selectedLocationId={selectedLocationId}
              onLocationChange={setSelectedLocationId}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Location Info Bar */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {selectedLocation?.name || 'All Locations'}
              </h2>
              {selectedLocation?.address && (
                <p className="text-sm text-slate-600">
                  {selectedLocation.address.locality}, {selectedLocation.address.administrativeDistrictLevel1}
                </p>
              )}
            </div>
          </div>

          <div className="inline-flex items-center px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg font-semibold">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {filteredItems.length} {filteredItems.length === 1 ? 'Item' : 'Items'}
          </div>
        </div>

        {/* Time-Based Availability Toggle ⭐ Bonus Feature */}
        <div className="mb-8 flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-slate-900">Time-Based Filtering</h3>
              <p className="text-sm text-slate-600">
                {showUnavailableItems
                  ? 'Showing all items regardless of time'
                  : `Only showing items available right now (${currentTime})`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowUnavailableItems(!showUnavailableItems)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showUnavailableItems ? 'bg-slate-400' : 'bg-amber-600'
            }`}
            aria-label="Toggle time-based filtering"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showUnavailableItems ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Category Filter */}
        <CategoryFilter
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={setSelectedCategoryId}
          isTimeFilterActive={!showUnavailableItems}
        />

        {/* Menu Grid */}
        <MenuGrid
          items={filteredItems}
          onItemClick={setSelectedItem}
        />
      </main>

      {/* Item Detail Modal */}
      <ItemDetail
        item={selectedItem}
        locations={locations}
        getCategoryForItem={getCategoryForItem}
        onClose={() => setSelectedItem(null)}
      />

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 bg-white">
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-slate-500">
            Built with Square Catalog API • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
