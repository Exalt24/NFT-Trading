import { useState, useEffect } from 'react';
import type { FilterState, SortOption } from '../types';

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'recent', label: 'Recently Listed' },
  { value: 'tokenId-asc', label: 'Token ID: Low to High' },
  { value: 'tokenId-desc', label: 'Token ID: High to Low' },
];

export function AdvancedFilters({ filters, onFiltersChange }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(filters.priceRange.min?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(filters.priceRange.max?.toString() || '');

  useEffect(() => {
    setMinPrice(filters.priceRange.min?.toString() || '');
    setMaxPrice(filters.priceRange.max?.toString() || '');
  }, [filters.priceRange]);

  const handlePriceApply = () => {
    const min = minPrice ? parseFloat(minPrice) : undefined;
    const max = maxPrice ? parseFloat(maxPrice) : undefined;
    
    if (min !== undefined && min < 0) return;
    if (max !== undefined && max < 0) return;
    if (min !== undefined && max !== undefined && min > max) return;

    onFiltersChange({
      ...filters,
      priceRange: { min, max }
    });
  };

  const handleSortChange = (sort: SortOption) => {
    onFiltersChange({ ...filters, sortBy: sort });
  };

  const handleReset = () => {
    setMinPrice('');
    setMaxPrice('');
    onFiltersChange({
      priceRange: { min: undefined, max: undefined },
      statuses: new Set(['listed']),
      traits: new Map(),
      sortBy: 'recent'
    });
  };

  const handleSavePreset = () => {
    const presetName = prompt('Enter preset name:');
    if (presetName) {
      saveFilterPreset(presetName, filters);
      alert('Filter preset saved!');
    }
  };

  const handleLoadPreset = () => {
    const presets = getFilterPresets();
    if (presets.length === 0) {
      alert('No saved presets');
      return;
    }

    const presetName = prompt(`Available presets:\n${presets.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}\n\nEnter preset name:`);
    if (presetName) {
      const preset = presets.find(p => p.name === presetName);
      if (preset) {
        onFiltersChange(preset.filters);
        alert('Preset loaded!');
      }
    }
  };

  const activeFilterCount = 
    (filters.priceRange.min !== undefined || filters.priceRange.max !== undefined ? 1 : 0) +
    (filters.sortBy !== 'recent' ? 1 : 0);

  return (
    <div className="w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="font-medium">Sort & Filter</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <svg 
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 p-4 bg-slate-800 border border-slate-700 rounded-lg space-y-6">
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3">
            <p className="text-sm text-blue-200">
              💡 <strong>Tip:</strong> Use the search bar above to find NFTs by Token ID or Name
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
            <select
              title='Sort By'
              value={filters.sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Price Range (ETH)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <span className="text-slate-400">to</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handlePriceApply}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-slate-700">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
            >
              Reset All
            </button>
            <button
              onClick={handleSavePreset}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              title="Save preset"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </button>
            <button
              onClick={handleLoadPreset}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              title="Load preset"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function saveFilterPreset(name: string, filters: FilterState): void {
  try {
    const presets = getFilterPresets();
    const serialized = {
      name,
      filters: {
        priceRange: filters.priceRange,
        statuses: Array.from(filters.statuses),
        traits: Array.from(filters.traits.entries()).map(([k, v]) => [k, Array.from(v)]),
        sortBy: filters.sortBy
      }
    };
    const updated = [serialized, ...presets.filter(p => p.name !== name)].slice(0, 5);
    localStorage.setItem('nft_filter_presets', JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save filter preset:', error);
  }
}

function getFilterPresets(): Array<{ name: string; filters: FilterState }> {
  try {
    const presets = localStorage.getItem('nft_filter_presets');
    if (!presets) return [];
    
    const parsed = JSON.parse(presets);
    return parsed.map((p: any) => ({
      name: p.name,
      filters: {
        priceRange: p.filters.priceRange,
        statuses: new Set(p.filters.statuses),
        traits: new Map(p.filters.traits.map(([k, v]: [string, string[]]) => [k, new Set(v)])),
        sortBy: p.filters.sortBy
      }
    }));
  } catch {
    return [];
  }
}