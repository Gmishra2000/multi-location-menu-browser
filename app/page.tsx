'use client';

import { useEffect, useState } from 'react';
import type { Location, CatalogItem } from './lib/types';
import { formatMoney, isAvailableAtLocation } from './lib/utils';

export default function Home() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [allItems, setAllItems] = useState<CatalogItem[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch locations and catalog in parallel
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

  // Filter items based on selected location
  const filteredItems = allItems.filter((item) =>
    selectedLocationId ? isAvailableAtLocation(item, selectedLocationId) : true
  );

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header Skeleton */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-7 bg-slate-200 rounded w-48 animate-pulse"></div>
                  <div className="h-4 bg-slate-200 rounded w-32 animate-pulse"></div>
                </div>
              </div>
              <div className="h-12 w-48 bg-slate-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </header>

        {/* Content Skeleton */}
        <main className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
              <div className="space-y-2">
                <div className="h-6 bg-slate-200 rounded w-48"></div>
                <div className="h-4 bg-slate-200 rounded w-32"></div>
              </div>
            </div>
            <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="aspect-[4/3] bg-slate-200"></div>
                <div className="p-5 space-y-3">
                  <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-8 bg-slate-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-12 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Professional Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Menu Browser</h1>
                <p className="text-sm text-slate-500 mt-0.5">Powered by Square Catalog API</p>
              </div>
            </div>

            {/* Location Selector */}
            <div className="relative">
              <label htmlFor="location-select" className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                Location
              </label>
              <div className="relative">
                <select
                  id="location-select"
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="appearance-none bg-white border-2 border-slate-300 text-slate-900 px-4 py-3 pr-10 rounded-lg font-medium hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer min-w-[240px]"
                >
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
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

        {/* Menu Grid */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              No items available
            </h3>
            <p className="text-slate-600 text-lg max-w-md mx-auto">
              This location doesn&apos;t have any menu items. Try selecting a different location.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredItems.map((item) => {
              const firstVariation = item.itemData.variations?.[0];
              // Price is nested in itemVariationData.priceMoney.amount
              const price = firstVariation?.itemVariationData?.priceMoney?.amount
                ? Number(firstVariation.itemVariationData.priceMoney.amount)
                : 0;
              const variationCount = item.itemData.variations?.length || 0;

              return (
                <article
                  key={item.id}
                  className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-pointer"
                >
                  {/* Item Image */}
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Item Details */}
                  <div className="p-6">
                    <h3 className="font-bold text-lg text-slate-900 mb-3 line-clamp-2 min-h-[3.5rem] group-hover:text-blue-600 transition-colors">
                      {item.itemData.name || 'Untitled Item'}
                    </h3>

                    {item.itemData.description && (
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2 min-h-[2.5rem] leading-relaxed">
                        {item.itemData.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
                      <span className="text-2xl font-bold text-slate-900">
                        {formatMoney(price)}
                      </span>

                      {variationCount > 1 && (
                        <span className="inline-flex items-center text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full">
                          {variationCount} options
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

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
