import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { MintedNFT, TradingHistory, WebSocketEvent } from '../types';

interface MintingDataPoint {
  date: string;
  count: number;
  timestamp: number;
}

interface SalesDataPoint {
  date: string;
  volume: number;
  count: number;
  timestamp: number;
}

interface RoyaltyDataPoint {
  date: string;
  amount: number;
  count: number;
  timestamp: number;
}

interface NFTSalesData {
  tokenId: number;
  name: string;
  salesCount: number;
  totalVolume: number;
}

interface CreatorAnalytics {
  mintingActivity: MintingDataPoint[];
  salesActivity: SalesDataPoint[];
  royaltyEarnings: RoyaltyDataPoint[];
  topNFTs: NFTSalesData[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface UseCreatorAnalyticsProps {
  creatorAddress: string | null;
  events?: WebSocketEvent[];
}

export function useCreatorAnalytics({ 
  creatorAddress, 
  events = [] 
}: UseCreatorAnalyticsProps): CreatorAnalytics {
  const [mintingActivity, setMintingActivity] = useState<MintingDataPoint[]>([]);
  const [salesActivity, setSalesActivity] = useState<SalesDataPoint[]>([]);
  const [royaltyEarnings, setRoyaltyEarnings] = useState<RoyaltyDataPoint[]>([]);
  const [topNFTs, setTopNFTs] = useState<NFTSalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
  if (!creatorAddress) {
    setLoading(false);
    return;
  }

  setLoading(true);
  setError(null);

  try {
    console.log('📊 Fetching creator analytics from backend...');
    
    // ✅ Get ALL data from backend (includes sold NFTs)
    const creatorStats = await api.getCreatorStats(creatorAddress);
    const nfts = await api.getNFTsByOwner(creatorAddress);

    console.log('📦 Backend data:', {
      totalSold: creatorStats.totalSold,
      salesRecords: creatorStats.salesHistory.length,
      royaltyRecords: creatorStats.royaltyHistory.length,
    });

    // Process data for charts using backend sales history
    const mintingData = processMintingActivity(nfts);
    const salesData = processSalesActivityFromHistory(creatorStats.salesHistory);
    const royaltyData = processRoyaltyEarningsFromHistory(creatorStats.royaltyHistory);
    const topNFTsData = processTopNFTsFromHistory(creatorStats.salesHistory, nfts);

    setMintingActivity(mintingData);
    setSalesActivity(salesData);
    setRoyaltyEarnings(royaltyData);
    setTopNFTs(topNFTsData);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
    setError(message);
    console.error('❌ Analytics error:', err);
  } finally {
    setLoading(false);
  }
}, [creatorAddress]);

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh on relevant WebSocket events
  useEffect(() => {
    if (!events || events.length === 0) return;

    const relevantEvents = events.filter(e =>
      e.type === 'nftMinted' ||
      e.type === 'nftSold' ||
      e.type === 'priceUpdated'
    );

    if (relevantEvents.length > 0) {
      const latestEvent = relevantEvents[0];
      
      if (!latestEvent) return;
      
      console.log('📊 Analytics event detected, refreshing data...', latestEvent.type);
      
      // Delay refresh to ensure backend has processed the event
      setTimeout(() => {
        fetchAnalytics();
      }, 2000);
    }
  }, [events, fetchAnalytics]);

  return {
    mintingActivity,
    salesActivity,
    royaltyEarnings,
    topNFTs,
    loading,
    error,
    refresh: fetchAnalytics
  };
}

function processSalesActivityFromHistory(salesHistory: TradingHistory[]): SalesDataPoint[] {
  const salesByDate = new Map<string, { volume: number; count: number }>();

  salesHistory.forEach(sale => {
    const soldAt = sale.soldAt || (sale as any).sold_at;
    if (!soldAt) return;

    try {
      const date = new Date(soldAt).toISOString().split('T')[0];
      if (!date) return;
      
      const current = salesByDate.get(date) || { volume: 0, count: 0 };
      
      let priceNum = 0;
      try {
        if (sale.price.includes('.')) {
          priceNum = parseFloat(sale.price);
        } else {
          priceNum = Number(sale.price) / 1e18;
        }
      } catch (e) {
        console.error('Price parse error:', e);
      }

      salesByDate.set(date, {
        volume: current.volume + priceNum,
        count: current.count + 1
      });
    } catch (e) {
      console.error('Date parse error:', e);
    }
  });

  const sortedDates = Array.from(salesByDate.keys()).sort();
  
  return sortedDates.map(date => {
    const data = salesByDate.get(date)!;
    return {
      date,
      volume: data.volume,
      count: data.count,
      timestamp: new Date(date).getTime()
    };
  });
}

function processRoyaltyEarningsFromHistory(royaltyHistory: any[]): RoyaltyDataPoint[] {
  const royaltiesByDate = new Map<string, { amount: number; count: number }>();

  royaltyHistory.forEach(royalty => {
    const soldAt = royalty.soldAt || royalty.sold_at;
    if (!soldAt) return;

    try {
      const date = new Date(soldAt).toISOString().split('T')[0];
      if (!date) return;
      
      const current = royaltiesByDate.get(date) || { amount: 0, count: 0 };
      
      let royaltyNum = 0;
      try {
        if (royalty.royaltyFee.includes('.')) {
          royaltyNum = parseFloat(royalty.royaltyFee);
        } else {
          royaltyNum = Number(royalty.royaltyFee) / 1e18;
        }
      } catch (e) {
        console.error('Royalty parse error:', e);
      }

      royaltiesByDate.set(date, {
        amount: current.amount + royaltyNum,
        count: current.count + 1
      });
    } catch (e) {
      console.error('Date parse error:', e);
    }
  });

  const sortedDates = Array.from(royaltiesByDate.keys()).sort();
  
  return sortedDates.map(date => {
    const data = royaltiesByDate.get(date)!;
    return {
      date,
      amount: data.amount,
      count: data.count,
      timestamp: new Date(date).getTime()
    };
  });
}

function processTopNFTsFromHistory(salesHistory: TradingHistory[], nfts: MintedNFT[]): NFTSalesData[] {
  const salesByToken = new Map<number, { count: number; volume: number }>();

  salesHistory.forEach(sale => {
    const current = salesByToken.get(sale.tokenId) || { count: 0, volume: 0 };
    
    let priceNum = 0;
    try {
      if (sale.price.includes('.')) {
        priceNum = parseFloat(sale.price);
      } else {
        priceNum = Number(sale.price) / 1e18;
      }
    } catch (e) {
      console.error('Price parse error:', e);
    }

    salesByToken.set(sale.tokenId, {
      count: current.count + 1,
      volume: current.volume + priceNum
    });
  });

  const result: NFTSalesData[] = [];
  
  salesByToken.forEach((data, tokenId) => {
    const nft = nfts.find(n => n.tokenId === tokenId);
    result.push({
      tokenId,
      name: nft?.metadata?.name || `NFT #${tokenId}`,
      salesCount: data.count,
      totalVolume: data.volume
    });
  });

  return result.sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 10);
}

// ✅ FIXED: Handle both snake_case and camelCase properties
function processMintingActivity(nfts: MintedNFT[]): MintingDataPoint[] {
  const mintsByDate = new Map<string, number>();
  
  console.log('🎨 Processing minting activity for', nfts.length, 'NFTs');

  nfts.forEach((nft, index) => {
    // ✅ Handle both snake_case (minted_at) and camelCase (mintedAt)
    const mintedAt = (nft as any).mintedAt || nft.minted_at;
    
    if (mintedAt) {
      try {
        const date = new Date(mintedAt).toISOString().split('T')[0];
        if (date) {
          mintsByDate.set(date, (mintsByDate.get(date) || 0) + 1);
          console.log(`  ✅ NFT #${nft.tokenId}: Minted on ${date}`);
        }
      } catch (e) {
        console.error(`  ❌ Invalid date for NFT #${nft.tokenId}:`, mintedAt, e);
      }
    } else {
      console.warn(`  ⚠️ NFT #${nft.tokenId}: No minted_at/mintedAt timestamp`);
      // Debug: Log the entire NFT object to see what properties exist
      if (index === 0) {
        console.log('  🔍 Full NFT object:', nft);
      }
    }
  });

  const sortedDates = Array.from(mintsByDate.keys()).sort();
  
  const result = sortedDates.map(date => ({
    date,
    count: mintsByDate.get(date) || 0,
    timestamp: new Date(date).getTime()
  }));
  
  console.log('📊 Minting activity result:', result);
  return result;
}