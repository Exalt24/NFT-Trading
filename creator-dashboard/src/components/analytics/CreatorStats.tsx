import { useEffect } from 'react'; // ADD THIS
import { useCreatorStats } from '../../hooks/useCreatorStats';
import { useCreatorNFTs } from '../../hooks/useCreatorNFTs';
import { formatEther, formatTimestamp } from '../../utils/formatters';
import type { WebSocketEvent } from '../../types'; // ADD THIS

interface CreatorStatsProps {
  walletAddress: string;
  events?: WebSocketEvent[];
}

export function CreatorStats({ walletAddress, events = [] }: CreatorStatsProps) {
  const { nfts, listings, refetch } = useCreatorNFTs(walletAddress);
  const { stats, loading, error } = useCreatorStats({
    nfts,
    listings,
    creatorAddress: walletAddress
  });

  useEffect(() => {
    if (!events || events.length === 0) return;

    const relevantEvents = events.filter(e =>
      e.type === 'nftMinted' ||
      e.type === 'nftSold' ||
      e.type === 'nftListed' ||
      e.type === 'nftCancelled'
    );

    if (relevantEvents.length > 0) {
      const latestEvent = relevantEvents[0];
      
      if (!latestEvent) return;
      
      console.log('📊 Stats event detected, refreshing...', latestEvent.type);
      
      setTimeout(() => {
        refetch();
      }, 2000);
    }
  }, [events, refetch]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="h-4 bg-slate-700 rounded animate-pulse mb-3" />
            <div className="h-8 bg-slate-700 rounded animate-pulse mb-2" />
            <div className="h-3 bg-slate-700 rounded animate-pulse w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-xl p-6 text-center">
        <p className="text-red-400">Failed to load statistics</p>
        <p className="text-sm text-red-300 mt-2">{error}</p>
      </div>
    );
  }

const parsePrice = (price: string): number => {
  try {
    if (!price || price === '0') return 0;
    
    // ✅ FIX: Use toFixed to avoid floating point errors
    if (price.includes('.')) {
      return parseFloat(parseFloat(price).toFixed(4));
    }
    const wei = Number(price);
    return parseFloat((wei / 1e18).toFixed(4));
  } catch {
    return 0;
  }
};

  const avgPrice = parsePrice(stats.avgPrice);
  const floorPriceNum = parsePrice(stats.floorPrice);

  const metrics = [
  {
    label: 'Total Minted',
    value: stats.totalMinted.toString(),
    icon: '🎨',
    color: 'text-purple-400'
  },
  {
    label: 'Total Listed',
    value: stats.totalListed.toString(),
    icon: '📋',
    color: 'text-blue-400'
  },
  {
    label: 'Total Sold',
    value: stats.totalSold.toString(),
    icon: '✅',
    color: 'text-green-400'
  },
  {
    label: 'Total Revenue',
    value: `${parsePrice(stats.totalRevenue).toFixed(4)} ETH`, // ✅ Fixed precision
    icon: '💰',
    color: 'text-yellow-400'
  },
  {
    label: 'Total Royalties',
    value: `${parsePrice(stats.totalRoyalties).toFixed(4)} ETH`,
    icon: '👑',
    color: 'text-pink-400'
  },
  {
    label: 'Average Sale Price',
    value: avgPrice > 0 ? `${avgPrice.toFixed(4)} ETH` : 'No sales',
    icon: '📊',
    color: 'text-cyan-400'
  },
  {
    label: 'Floor Price',
    value: floorPriceNum > 0 ? `${floorPriceNum.toFixed(4)} ETH` : 'No listings',
    icon: '📉',
    color: 'text-orange-400'
  },
  {
    label: 'Total Earnings',
    value: `${(parsePrice(stats.totalRevenue) + parsePrice(stats.totalRoyalties)).toFixed(4)} ETH`,
    icon: '🚀',
    color: 'text-emerald-400'
  }
];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Creator Statistics</h2>
        <div className="text-sm text-slate-400">
          Last updated: {formatTimestamp(Date.now())}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{metric.icon}</span>
              <span className={`text-sm font-medium ${metric.color}`}>
                {metric.label}
              </span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {stats.totalSold > 0 && (
        <div className="bg-linear-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Congratulations!
              </h3>
              <p className="text-slate-300">
                You've successfully sold {stats.totalSold} NFT{stats.totalSold !== 1 ? 's' : ''} and earned{' '}
                {(parsePrice(stats.totalRevenue) + parsePrice(stats.totalRoyalties)).toFixed(4)} ETH in total.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}