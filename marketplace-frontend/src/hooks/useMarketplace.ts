import { useState, useEffect, useCallback } from 'react';
import { parseEther } from 'ethers';
import { api } from '../services/api';
import { getMarketplaceContract, getNFTContract, checkApproval, approveNFT } from '../services/contracts';
import { NFT_CONTRACT_ADDRESS } from '../utils/constants';
import type { Listing, TradingHistory, TransactionState } from '../types';
import type { JsonRpcSigner } from 'ethers';

export function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getActiveListings();
      console.log('Listings received from API:', data);
      setListings(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch listings';
      setError(message);
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return {
    listings,
    loading,
    error,
    refresh: fetchListings,
  };
}

export function useListing(tokenId: number | null) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListing = useCallback(async () => {
    if (tokenId === null || !NFT_CONTRACT_ADDRESS) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.getListing(tokenId, NFT_CONTRACT_ADDRESS);
      setListing(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch listing';
      setError(message);
      setListing(null);
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  return {
    listing,
    loading,
    error,
    refresh: fetchListing,
  };
}

export function useListingsBySeller(address: string | null) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    if (!address) {
      setListings([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.getListingsBySeller(address);
      setListings(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch seller listings';
      setError(message);
      console.error('Error fetching seller listings:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return {
    listings,
    loading,
    error,
    refresh: fetchListings,
  };
}

export function usePriceHistory(tokenId: number | null) {
  const [history, setHistory] = useState<TradingHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (tokenId === null || !NFT_CONTRACT_ADDRESS) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.getPriceHistory(tokenId, NFT_CONTRACT_ADDRESS);
      setHistory(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch price history';
      setError(message);
      console.error('Error fetching price history:', err);
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    refresh: fetchHistory,
  };
}

export function useMarketplaceActions(signer: JsonRpcSigner | null) {
  const [txState, setTxState] = useState<TransactionState>({
    status: 'idle',
  });

  /**
   * List NFT for sale
   * @param tokenId - NFT token ID
   * @param priceInWei - Price already converted to wei (as string)
   */
  const listNFT = useCallback(async (tokenId: number, priceInWei: string) => {
    if (!signer || !NFT_CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }

    setTxState({ status: 'pending' });

    try {
      const isApproved = await checkApproval(tokenId, signer);
      
      if (!isApproved) {
        setTxState({ status: 'pending', hash: undefined });
        await approveNFT(tokenId, signer);
      }

      const marketplace = getMarketplaceContract(signer);
      
      // ✅ Price is already in wei - no conversion needed!
      const listFunc = marketplace.getFunction('listNFT');
      const tx = await listFunc(NFT_CONTRACT_ADDRESS, tokenId, priceInWei);
      
      setTxState({ status: 'pending', hash: tx.hash });
      
      await tx.wait();
      
      setTxState({ status: 'success', hash: tx.hash });
      return tx.hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setTxState({ status: 'error', error: message });
      throw err;
    }
  }, [signer]);

  /**
   * Buy NFT
   * @param tokenId - NFT token ID
   * @param priceInWei - Price already converted to wei (as string)
   */
  const buyNFT = useCallback(async (tokenId: number, priceInWei: string) => {
    if (!signer || !NFT_CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }

    setTxState({ status: 'pending' });

    try {
      const marketplace = getMarketplaceContract(signer);
      
      // ✅ Price is already in wei - no conversion needed!
      const buyFunc = marketplace.getFunction('buyNFT');
      const tx = await buyFunc(NFT_CONTRACT_ADDRESS, tokenId, { value: priceInWei });
      
      setTxState({ status: 'pending', hash: tx.hash });
      
      await tx.wait();
      
      setTxState({ status: 'success', hash: tx.hash });
      return tx.hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setTxState({ status: 'error', error: message });
      throw err;
    }
  }, [signer]);

  const cancelListing = useCallback(async (tokenId: number) => {
    if (!signer || !NFT_CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }

    setTxState({ status: 'pending' });

    try {
      const marketplace = getMarketplaceContract(signer);
      
      const cancelFunc = marketplace.getFunction('cancelListing');
      const tx = await cancelFunc(NFT_CONTRACT_ADDRESS, tokenId);
      
      setTxState({ status: 'pending', hash: tx.hash });
      
      await tx.wait();
      
      setTxState({ status: 'success', hash: tx.hash });
      return tx.hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setTxState({ status: 'error', error: message });
      throw err;
    }
  }, [signer]);

  /**
   * Update listing price
   * @param tokenId - NFT token ID
   * @param newPriceInWei - New price already converted to wei (as string)
   */
  const updatePrice = useCallback(async (tokenId: number, newPriceInWei: string) => {
    if (!signer || !NFT_CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }

    setTxState({ status: 'pending' });

    try {
      const marketplace = getMarketplaceContract(signer);
      
      // ✅ Price is already in wei - no conversion needed!
      const updateFunc = marketplace.getFunction('updatePrice');
      const tx = await updateFunc(NFT_CONTRACT_ADDRESS, tokenId, newPriceInWei);
      
      setTxState({ status: 'pending', hash: tx.hash });
      
      await tx.wait();
      
      setTxState({ status: 'success', hash: tx.hash });
      return tx.hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setTxState({ status: 'error', error: message });
      throw err;
    }
  }, [signer]);

  const resetTxState = useCallback(() => {
    setTxState({ status: 'idle' });
  }, []);

  return {
    listNFT,
    buyNFT,
    cancelListing,
    updatePrice,
    txState,
    resetTxState,
  };
}

export function useFloorPrice() {
  const [floorPrice, setFloorPrice] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFloorPrice = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getFloorPrice();
      setFloorPrice(data.floorPrice);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch floor price';
      setError(message);
      console.error('Error fetching floor price:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFloorPrice();
  }, [fetchFloorPrice]);

  return {
    floorPrice,
    loading,
    error,
    refresh: fetchFloorPrice,
  };
}