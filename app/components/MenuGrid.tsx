import type { CatalogItem } from '../lib/types';
import { formatMoney } from '../lib/utils';

interface MenuGridProps {
  items: CatalogItem[];
  onItemClick: (item: CatalogItem) => void;
}

export default function MenuGrid({ items, onItemClick }: MenuGridProps) {
  if (items.length === 0) {
    return (
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
          This location doesn&apos;t have any menu items. Try selecting a different location or category.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {items.map((item) => {
        const firstVariation = item.itemData.variations?.[0];
        const price = firstVariation?.itemVariationData?.priceMoney?.amount
          ? Number(firstVariation.itemVariationData.priceMoney.amount)
          : 0;
        const variationCount = item.itemData.variations?.length || 0;

        return (
          <article
            key={item.id}
            onClick={() => onItemClick(item)}
            className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 cursor-pointer"
          >
            {/* Item Image Placeholder */}
            <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
            </div>

            {/* Item Details */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                {item.itemData.name}
              </h3>
              <p className="text-sm text-slate-600 mb-4 line-clamp-2 min-h-[2.5rem]">
                {item.itemData.description || 'No description available'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-slate-900">{formatMoney(price)}</span>
                {variationCount > 1 && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    +{variationCount - 1} more
                  </span>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
