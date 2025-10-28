import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { MintedNFT } from '../types';

interface UseCreatorNFTsResult {
  nfts: MintedNFT[];
  listings: Map<number, any>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCreatorNFTs(creatorAddress: string | null): UseCreatorNFTsResult {
  const [nfts, setNfts] = useState<MintedNFT[]>([]);
  const [listings, setListings] = useState<Map<number, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNFTs = useCallback(async () => {
    if (!creatorAddress) {
      setNfts([]);
      setListings(new Map());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const ownerNFTs = await api.getNFTsByOwner(creatorAddress);
      
      const listingsMap = new Map<number, any>();
      const activeListingsResponse = await api.getActiveListings();
      
      for (const listing of activeListingsResponse) {
        if (listing.nftContract.toLowerCase() === import.meta.env.VITE_NFT_CONTRACT_ADDRESS.toLowerCase()) {
          listingsMap.set(listing.tokenId, listing);
        }
      }

      setNfts(ownerNFTs);
      setListings(listingsMap);
    } catch (err) {
      console.error('Failed to fetch creator NFTs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  }, [creatorAddress]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return {
    nfts,
    listings,
    loading,
    error,
    refetch: fetchNFTs,
  };
}

interface FilteredNFTsOptions {
  searchQuery: string;
  statusFilter: 'all' | 'listed' | 'unlisted';
}

export function useFilteredNFTs(
  nfts: MintedNFT[],
  listings: Map<number, any>,
  options: FilteredNFTsOptions
): MintedNFT[] {
  const { searchQuery, statusFilter } = options;

  return nfts.filter((nft) => {
    const isListed = listings.has(nft.tokenId);

    if (statusFilter === 'listed' && !isListed) return false;
    if (statusFilter === 'unlisted' && isListed) return false;

    if (searchQuery.trim() === '') return true;

    const query = searchQuery.toLowerCase();
    
    if (nft.tokenId.toString().includes(query)) return true;
    
    if (nft.metadata) {
      if (nft.metadata.name?.toLowerCase().includes(query)) return true;
      if (nft.metadata.description?.toLowerCase().includes(query)) return true;
      
      if (nft.metadata.attributes) {
        for (const attr of nft.metadata.attributes) {
          if (attr.trait_type?.toLowerCase().includes(query)) return true;
          if (attr.value?.toString().toLowerCase().includes(query)) return true;
        }
      }
    }

    return false;
  });
}

interface UsePaginationResult {
  currentPage: number;
  totalPages: number;
  paginatedItems: MintedNFT[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
}

export function usePagination(
  items: MintedNFT[],
  itemsPerPage: number = 12
): UsePaginationResult {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
  };
}

export function useNFTActions(
  refetch: () => Promise<void>,
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
) {
  const [actionLoading, setActionLoading] = useState(false);

  const handleListSuccess = useCallback(async () => {
    setActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await refetch();
      showToast('NFT listed successfully!', 'success');
    } catch (error) {
      console.error('Failed to refresh after listing:', error);
    } finally {
      setActionLoading(false);
    }
  }, [refetch, showToast]);

  const handleRoyaltySuccess = useCallback(async () => {
    setActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await refetch();
      showToast('Royalty updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to refresh after royalty update:', error);
    } finally {
      setActionLoading(false);
    }
  }, [refetch, showToast]);

  return {
    actionLoading,
    handleListSuccess,
    handleRoyaltySuccess,
  };
}