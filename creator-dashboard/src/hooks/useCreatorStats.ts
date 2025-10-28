import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { MintedNFT, CreatorStats } from '../types'; 

interface UseCreatorStatsOptions {
  nfts: MintedNFT[];
  listings: Map<number, any>;
  creatorAddress: string | null;
}

export function useCreatorStats({
  nfts,
  listings,
  creatorAddress,
}: UseCreatorStatsOptions): {
  stats: CreatorStats;
  loading: boolean;
  error: string | null;
} {
const [stats, setStats] = useState<CreatorStats>({
  totalMinted: 0,
  totalListed: 0,
  totalSold: 0,
  totalRevenue: '0',
  totalRoyalties: '0',
  avgPrice: '0',  // ✅ Changed from averageSalePrice
  floorPrice: '0',
});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const calculateStats = async () => {
    if (!creatorAddress) {
      setStats({
        totalMinted: 0,
        totalListed: 0,
        totalSold: 0,
        totalRevenue: '0',
        totalRoyalties: '0',
        avgPrice: '0',
        floorPrice: '0',
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 CREATOR STATS (Backend-Driven)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📍 Creator Address:', creatorAddress);

      // ✅ ONE API CALL gets everything!
      const creatorStats = await api.getCreatorStats(creatorAddress);
      
      console.log('📊 Backend Stats:', {
        totalMinted: creatorStats.totalMinted,
        totalSold: creatorStats.totalSold,
        salesHistory: creatorStats.salesHistory.length,
        royaltyHistory: creatorStats.royaltyHistory.length,
      });

      // Current frontend state
      const totalListed = listings.size;

      // Parse values
      const parseToWei = (value: string): bigint => {
        if (!value || value === '0') return 0n;
        try {
          if (value.includes('.')) {
            return BigInt(Math.floor(parseFloat(value) * 1e18));
          }
          return BigInt(value);
        } catch {
          return 0n;
        }
      };

      const totalRevenue = parseToWei(creatorStats.totalRevenue);
const totalRoyalties = parseToWei(creatorStats.totalRoyalties);
const avgPrice = parseToWei(creatorStats.avgPrice);
const floorPrice = parseToWei(creatorStats.floorPrice);


      setStats({
        totalMinted: creatorStats.totalMinted,
        totalListed,
        totalSold: creatorStats.totalSold,
        totalRevenue: totalRevenue.toString(),
        totalRoyalties: totalRoyalties.toString(),
        avgPrice: avgPrice.toString(),
        floorPrice: floorPrice.toString(),
      });

    } catch (err) {
      console.error('❌ Failed to calculate creator stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate stats');
    } finally {
      setLoading(false);
    }
  };

  calculateStats();
}, [listings, creatorAddress]); // ✅ Removed 'nfts' dependency - we don't need it!

  return { stats, loading, error };
}

export function formatStatsForDisplay(stats: CreatorStats) {
  const formatEther = (wei: string): string => {
    if (wei === '0') return '0';
    const value = BigInt(wei);
    const eth = Number(value) / 1e18;
    if (eth < 0.01) return '<0.01';
    if (eth < 1) return eth.toFixed(3);
    if (eth < 10) return eth.toFixed(2);
    return eth.toFixed(1);
  };

  return {
    totalMinted: stats.totalMinted.toString(),
    totalListed: stats.totalListed.toString(),
    totalSold: stats.totalSold.toString(),
    totalRevenue: `${formatEther(stats.totalRevenue)} ETH`,
    totalRoyalties: `${formatEther(stats.totalRoyalties)} ETH`,
    avgPrice: `${formatEther(stats.avgPrice)} ETH`,
    floorPrice: stats.floorPrice !== '0' ? `${formatEther(stats.floorPrice)} ETH` : 'No listings',
  };
}