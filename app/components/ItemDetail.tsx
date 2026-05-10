import type { CatalogItem, Location } from '../lib/types';
import { formatMoney } from '../lib/utils';

interface ItemDetailProps {
  item: CatalogItem | null;
  locations: Location[];
  getCategoryForItem: (item: CatalogItem) => string;
  onClose: () => void;
}

export default function ItemDetail({
  item,
  locations,
  getCategoryForItem,
  onClose,
}: ItemDetailProps) {
  if (!item) {
    return null;
  }

  const categoryName = getCategoryForItem(item);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header with Close Button */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            {item.itemData.name}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Item Image Placeholder */}
          <div className="aspect-video bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl mb-6 flex items-center justify-center">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-16 h-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
          </div>

          {/* Description */}
          {item.itemData.description && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Description</h3>
              <p className="text-slate-600 leading-relaxed">{item.itemData.description}</p>
            </div>
          )}

          {/* Variations/Pricing */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
              {item.itemData.variations && item.itemData.variations.length > 1 ? 'Pricing Options' : 'Price'}
            </h3>
            <div className="space-y-3">
              {item.itemData.variations?.map((variation) => {
                const price = variation.itemVariationData?.priceMoney?.amount
                  ? Number(variation.itemVariationData.priceMoney.amount)
                  : 0;
                const variationName = variation.itemVariationData?.name || variation.name || 'Regular';

                return (
                  <div key={variation.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-900">{variationName}</span>
                    <span className="text-2xl font-bold text-slate-900">{formatMoney(price)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category */}
          {categoryName && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Category</h3>
              <span className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                {categoryName}
              </span>
            </div>
          )}

          {/* Availability Info */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Availability</h3>
            <div className="space-y-2">
              {item.presentAtAllLocations ? (
                <div className="flex items-center gap-2 text-green-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Available at all locations</span>
                </div>
              ) : item.presentAtLocationIds && item.presentAtLocationIds.length > 0 ? (
                <div>
                  <p className="text-slate-600 mb-2">Available at:</p>
                  <ul className="space-y-1">
                    {item.presentAtLocationIds.map((locId) => {
                      const location = locations.find(l => l.id === locId);
                      return location ? (
                        <li key={locId} className="flex items-center gap-2 text-slate-700">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {location.name}
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-slate-600">Availability information not available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
