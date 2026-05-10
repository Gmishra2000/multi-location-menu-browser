import type { Location } from '../lib/types';

interface LocationSwitcherProps {
  locations: Location[];
  selectedLocationId: string;
  onLocationChange: (locationId: string) => void;
}

export default function LocationSwitcher({
  locations,
  selectedLocationId,
  onLocationChange,
}: LocationSwitcherProps) {
  return (
    <div className="relative w-64">
      <label htmlFor="location-select" className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
        Location
      </label>
      <div className="relative">
        <select
          id="location-select"
          value={selectedLocationId}
          onChange={(e) => onLocationChange(e.target.value)}
          className="w-full appearance-none bg-white border-2 border-blue-500 rounded-lg px-4 py-3 pr-10 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer shadow-sm"
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
  );
}
