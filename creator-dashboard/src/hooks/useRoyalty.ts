import { useState, useCallback } from 'react';
import { getNFTContract } from '../services/contracts';
import { RoyaltyInfo } from '../types';
import { parseTransactionError } from '../utils/errors';

interface UseRoyaltyResult {
  loading: boolean;
  error: string | null;
  getDefaultRoyalty: () => Promise<RoyaltyInfo | null>;
  getTokenRoyalty: (tokenId: number) => Promise<RoyaltyInfo | null>;
  setDefaultRoyalty: (receiver: string, basisPoints: number) => Promise<void>;
  setTokenRoyalty: (tokenId: number, receiver: string, basisPoints: number) => Promise<void>;
  resetTokenRoyalty: (tokenId: number) => Promise<void>;
}

export function useRoyalty(): UseRoyaltyResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDefaultRoyalty = useCallback(async (): Promise<RoyaltyInfo | null> => {
    try {
      setError(null);
      const contract = await getNFTContract(false);
      
      const salePrice = 10000n;
      const result = await (contract as any).royaltyInfo(0, salePrice);
      
      return {
        receiver: result[0],
        amount: Number(result[1])
      };
    } catch (err) {
      console.error('Failed to get default royalty:', err);
      setError('Failed to fetch default royalty');
      return null;
    }
  }, []);

  const getTokenRoyalty = useCallback(async (tokenId: number): Promise<RoyaltyInfo | null> => {
    try {
      setError(null);
      const contract = await getNFTContract(false);
      
      const salePrice = 10000n;
      const result = await (contract as any).royaltyInfo(tokenId, salePrice);
      
      return {
        receiver: result[0],
        amount: Number(result[1])
      };
    } catch (err) {
      console.error(`Failed to get royalty for token ${tokenId}:`, err);
      setError('Failed to fetch token royalty');
      return null;
    }
  }, []);

  const setDefaultRoyalty = useCallback(async (receiver: string, basisPoints: number): Promise<void> => {
    if (basisPoints < 0 || basisPoints > 1000) {
      throw new Error('Royalty must be between 0% and 10% (0-1000 basis points)');
    }

    setLoading(true);
    setError(null);

    try {
      const contract = await getNFTContract(true);
      
      const tx = await (contract as any).setDefaultRoyalty(receiver, basisPoints);
      await tx.wait();
      
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      const errorMessage = parseTransactionError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const setTokenRoyalty = useCallback(async (
    tokenId: number,
    receiver: string,
    basisPoints: number
  ): Promise<void> => {
    if (basisPoints < 0 || basisPoints > 1000) {
      throw new Error('Royalty must be between 0% and 10% (0-1000 basis points)');
    }

    setLoading(true);
    setError(null);

    try {
      const contract = await getNFTContract(true);
      
      const tx = await (contract as any).setTokenRoyalty(tokenId, receiver, basisPoints);
      await tx.wait();
      
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      const errorMessage = parseTransactionError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const resetTokenRoyalty = useCallback(async (tokenId: number): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const contract = await getNFTContract(true);
      
      const tx = await (contract as any).resetTokenRoyalty(tokenId);
      await tx.wait();
      
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      const errorMessage = parseTransactionError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    loading,
    error,
    getDefaultRoyalty,
    getTokenRoyalty,
    setDefaultRoyalty,
    setTokenRoyalty,
    resetTokenRoyalty,
  };
}

export function basisPointsToPercentage(basisPoints: number): number {
  return basisPoints / 100;
}

export function percentageToBasisPoints(percentage: number): number {
  return Math.round(percentage * 100);
}

export function formatRoyalty(basisPoints: number): string {
  const percentage = basisPointsToPercentage(basisPoints);
  return `${percentage.toFixed(2)}%`;
}