import type { Listing, FilterState, SortOption, NFT } from '../types';

export function applyFilters(
  listings: Listing[], 
  filters: FilterState, 
  searchQuery: string,
  nftData?: Map<number, NFT>
): Listing[] {
  let filtered = [...listings];

  if (searchQuery) {
    filtered = filterBySearch(filtered, searchQuery, nftData);
  }

  if (filters.priceRange.min !== undefined || filters.priceRange.max !== undefined) {
    filtered = filterByPriceRange(filtered, filters.priceRange.min, filters.priceRange.max);
  }

  return filtered;
}

export function sortListings(listings: Listing[], sortBy: SortOption): Listing[] {
  const sorted = [...listings];

  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => {
        const priceA = parseFloat(a.price);
        const priceB = parseFloat(b.price);
        return priceA - priceB;
      });

    case 'price-desc':
      return sorted.sort((a, b) => {
        const priceA = parseFloat(a.price);
        const priceB = parseFloat(b.price);
        return priceB - priceA;
      });

    case 'tokenId-asc':
      return sorted.sort((a, b) => a.tokenId - b.tokenId);

    case 'tokenId-desc':
      return sorted.sort((a, b) => b.tokenId - a.tokenId);

    case 'recent':
    default:
      return sorted.sort((a, b) => {
        const timeA = a.listedAt || 0;
        const timeB = b.listedAt || 0;
        return timeB - timeA;
      });
  }
}

function filterBySearch(listings: Listing[], query: string, nftData?: Map<number, NFT>): Listing[] {
  const trimmedQuery = query.toLowerCase().trim();

  // Try to parse as Token ID first
  const tokenId = parseInt(query, 10);
  
  return listings.filter(listing => {
    // Search by Token ID (exact match)
    if (!isNaN(tokenId) && listing.tokenId === tokenId) {
      return true;
    }

    // Search by NFT Name (partial match, case-insensitive)
    if (nftData && listing.tokenId) {
      const nft = nftData.get(listing.tokenId);
      if (nft?.metadata?.name) {
        const nftName = nft.metadata.name.toLowerCase();
        if (nftName.includes(trimmedQuery)) {
          return true;
        }
      }
    }

    return false;
  });
}

function filterByPriceRange(listings: Listing[], min?: number, max?: number): Listing[] {
  return listings.filter(listing => {
    const price = parseFloat(listing.price);
    if (min !== undefined && price < min) return false;
    if (max !== undefined && price > max) return false;
    return true;
  });
}