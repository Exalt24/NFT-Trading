import { useState, useMemo } from 'react';
import type { NFT, Listing, SortOption } from '../types';

type StatusFilter = 'all' | 'listed' | 'unlisted';

interface NFTFilterOptions {
  statusFilter: StatusFilter;
  sortBy: SortOption;
  priceFilter: { min?: number; max?: number };
  searchQuery: string;
}

export function useNFTFilters(
  nfts: NFT[],
  listingMap: Map<number, Listing>,
  options: NFTFilterOptions
) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNFTs = useMemo(() => {
    let result = [...nfts];

    // Apply search
    if (searchQuery) {
      result = filterBySearch(result, searchQuery);
    }

    // Apply status filter (all/listed/unlisted)
    if (options.statusFilter !== 'all') {
      result = filterByStatus(result, listingMap, options.statusFilter);
    }

    // Apply price filter (only for listed NFTs)
    if (options.priceFilter.min !== undefined || options.priceFilter.max !== undefined) {
      result = filterByPrice(result, listingMap, options.priceFilter.min, options.priceFilter.max);
    }

    // Apply sorting
    result = sortNFTs(result, listingMap, options.sortBy);

    return result;
  }, [nfts, listingMap, searchQuery, options]);

  return {
    searchQuery,
    setSearchQuery,
    filteredNFTs
  };
}

function filterBySearch(nfts: NFT[], query: string): NFT[] {
  const lowerQuery = query.toLowerCase();

  return nfts.filter(nft => {
    // Search by token ID
    if (nft.tokenId.toString() === query) return true;

    // Search by name
    if (nft.metadata?.name?.toLowerCase().includes(lowerQuery)) return true;

    // Search by description
    if (nft.metadata?.description?.toLowerCase().includes(lowerQuery)) return true;

    // Search by attributes
    if (nft.metadata?.attributes?.some(attr =>
      attr.trait_type.toLowerCase().includes(lowerQuery) ||
      String(attr.value).toLowerCase().includes(lowerQuery)
    )) return true;

    return false;
  });
}

function filterByStatus(
  nfts: NFT[],
  listingMap: Map<number, Listing>,
  status: StatusFilter
): NFT[] {
  return nfts.filter(nft => {
    const isListed = listingMap.has(nft.tokenId) && listingMap.get(nft.tokenId)?.active;

    if (status === 'listed') return isListed;
    if (status === 'unlisted') return !isListed;
    return true;
  });
}

function filterByPrice(
  nfts: NFT[],
  listingMap: Map<number, Listing>,
  min?: number,
  max?: number
): NFT[] {
  return nfts.filter(nft => {
    const listing = listingMap.get(nft.tokenId);
    if (!listing?.active) return false; // Only filter listed NFTs

    const price = parseFloat(listing.price);

    if (min !== undefined && price < min) return false;
    if (max !== undefined && price > max) return false;

    return true;
  });
}

function sortNFTs(
  nfts: NFT[],
  listingMap: Map<number, Listing>,
  sortBy: SortOption
): NFT[] {
  const sorted = [...nfts];

  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => {
        const priceA = listingMap.get(a.tokenId)?.price ? parseFloat(listingMap.get(a.tokenId)!.price) : Infinity;
        const priceB = listingMap.get(b.tokenId)?.price ? parseFloat(listingMap.get(b.tokenId)!.price) : Infinity;
        return priceA - priceB;
      });

    case 'price-desc':
      return sorted.sort((a, b) => {
        const priceA = listingMap.get(a.tokenId)?.price ? parseFloat(listingMap.get(a.tokenId)!.price) : -Infinity;
        const priceB = listingMap.get(b.tokenId)?.price ? parseFloat(listingMap.get(b.tokenId)!.price) : -Infinity;
        return priceB - priceA;
      });

    case 'tokenId-asc':
      return sorted.sort((a, b) => a.tokenId - b.tokenId);

    case 'tokenId-desc':
      return sorted.sort((a, b) => b.tokenId - a.tokenId);

    case 'recent':
      return sorted.sort((a, b) => {
        const timeA = listingMap.get(a.tokenId)?.listedAt || 0;
        const timeB = listingMap.get(b.tokenId)?.listedAt || 0;
        return timeB - timeA;
      });

    default:
      return sorted;
  }
}