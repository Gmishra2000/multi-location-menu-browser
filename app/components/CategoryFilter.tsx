import type { CatalogCategory } from '../lib/types';

interface CategoryFilterProps {
  categories: CatalogCategory[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategoryId,
  onCategoryChange,
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
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
              selectedCategoryId === category.id
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            {category.categoryData?.name || 'Untitled'}
          </button>
        ))}
      </div>
    </div>
  );
}
