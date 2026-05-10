import type { CatalogCategory } from '../lib/types';
import { getCategoryAvailability } from '../lib/availability';

interface CategoryFilterProps {
  categories: CatalogCategory[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  isTimeFilterActive?: boolean; // Only show time indicators when actively filtering
}

export default function CategoryFilter({
  categories,
  selectedCategoryId,
  onCategoryChange,
  isTimeFilterActive = false,
}: CategoryFilterProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
        Filter by Category
      </h3>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => onCategoryChange('all')}
          className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
            selectedCategoryId === 'all'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          All Items
        </button>
        {categories.map((category) => {
          const categoryName = category.categoryData?.name || 'Untitled';
          const availability = getCategoryAvailability(categoryName);
          const isAvailable = availability.available;
          const showUnavailable = isTimeFilterActive && !isAvailable;

          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`group relative px-5 py-2.5 rounded-lg font-medium transition-all ${
                selectedCategoryId === category.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : showUnavailable
                  ? 'bg-slate-50 text-slate-400 border-2 border-slate-100 opacity-60'
                  : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                {categoryName}
                {showUnavailable && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </span>
              {/* Tooltip - only show time info when time filter is active */}
              {isTimeFilterActive && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {availability.message}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
