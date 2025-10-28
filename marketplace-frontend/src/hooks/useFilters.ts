import { useState, useMemo } from 'react';
import type { Listing, FilterState, NFT } from '../types';
import { applyFilters, sortListings } from '../utils/filterUtils';

const DEFAULT_FILTERS: FilterState = {
  priceRange: { min: undefined, max: undefined },
  statuses: new Set(['listed']),
  traits: new Map(),
  sortBy: 'recent'
};

export function useFilters(listings: Listing[], nftData?: Map<number, NFT>) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredListings = useMemo(() => {
    let result = applyFilters(listings, filters, searchQuery, nftData);
    result = sortListings(result, filters.sortBy);
    return result;
  }, [listings, filters, searchQuery, nftData]);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
  };

  return {
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    filteredListings,
    resetFilters,
    activeFilterCount: getActiveFilterCount(filters, searchQuery)
  };
}

function getActiveFilterCount(filters: FilterState, searchQuery: string): number {
  let count = 0;
 
  if (searchQuery) count++;
  if (filters.priceRange.min !== undefined || filters.priceRange.max !== undefined) count++;
  if (filters.sortBy !== 'recent') count++;
 
  return count;
}