import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { NFT } from '../types';

export function useNFT(tokenId: number | null) {
  const [nft, setNFT] = useState<NFT | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNFT = useCallback(async () => {
    if (tokenId === null) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.getNFT(tokenId);
      setNFT(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch NFT';
      setError(message);
      console.error('Error fetching NFT:', err);
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    fetchNFT();
  }, [fetchNFT]);

  return {
    nft,
    loading,
    error,
    refresh: fetchNFT,
  };
}

export function useNFTsByOwner(address: string | null) {
  const [nfts, setNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNFTs = useCallback(async () => {
    if (!address) {
      setNFTs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.getNFTsByOwner(address);
      console.log('NFTs received from API:', data);
      setNFTs(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch NFTs';
      setError(message);
      console.error('Error fetching NFTs by owner:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return {
    nfts,
    loading,
    error,
    refresh: fetchNFTs,
  };
}

export function useRecentNFTs(limit: number = 20) {
  const [nfts, setNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentNFTs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getRecentNFTs(limit);
      setNFTs(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch recent NFTs';
      setError(message);
      console.error('Error fetching recent NFTs:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecentNFTs();
  }, [fetchRecentNFTs]);

  return {
    nfts,
    loading,
    error,
    refresh: fetchRecentNFTs,
  };
}

export function useSearchNFTs(query: string, limit: number = 20) {
  const [nfts, setNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchNFTs = useCallback(async () => {
    if (!query || query.trim().length === 0) {
      setNFTs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.searchNFTs(query, limit);
      setNFTs(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search NFTs';
      setError(message);
      console.error('Error searching NFTs:', err);
    } finally {
      setLoading(false);
    }
  }, [query, limit]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchNFTs();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchNFTs]);

  return {
    nfts,
    loading,
    error,
    refresh: searchNFTs,
  };
}

export function useTotalSupply() {
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTotal = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getTotalSupply();
      setTotal(data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch total supply';
      setError(message);
      console.error('Error fetching total supply:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTotal();
  }, [fetchTotal]);

  return {
    total,
    loading,
    error,
    refresh: fetchTotal,
  };
}