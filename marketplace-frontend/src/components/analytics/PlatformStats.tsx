import { useEffect } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { formatPriceFromDB } from '../../utils/formatters';
import type { WebSocketEvent } from '../../types';

interface PlatformStatsProps {
  lastEvent?: WebSocketEvent | null;
}

export function PlatformStats({ lastEvent }: PlatformStatsProps) {
  const { stats, loading, error, refresh } = useAnalytics();

  // ✅ Auto-refresh on relevant events
  useEffect(() => {
    if (!lastEvent) return;

    // Refresh on events that affect platform stats
    if (['nftSold', 'nftListed', 'nftCancelled', 'priceUpdated'].includes(lastEvent.type)) {
      console.log(`[PlatformStats] Auto-refreshing due to ${lastEvent.type}`);
      
      // Debounce: wait 2 seconds after event
      const timeoutId = setTimeout(() => {
        refresh();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [lastEvent, refresh]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-slate-800 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-slate-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border-l-4 border-red-500 p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-200 mb-2">Failed to Load Statistics</h3>
            <p className="text-red-300">{error}</p>
          </div>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-2xl font-bold mb-2">No Statistics Available</h3>
        <p className="text-slate-400">Start trading to see platform statistics</p>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total Sales',
      value: stats.totalSales.toLocaleString(),
      icon: '💰',
      color: 'text-green-400'
    },
    {
      label: 'Total Volume',
      value: `${formatPriceFromDB(stats.totalVolume)} ETH`,
      icon: '📈',
      color: 'text-blue-400'
    },
    {
      label: 'Unique Traders',
      value: stats.uniqueTraders.toLocaleString(),
      icon: '👥',
      color: 'text-purple-400'
    },
    {
      label: 'Average Sale Price',
      value: `${formatPriceFromDB(stats.avgPrice)} ETH`,
      icon: '💎',
      color: 'text-cyan-400'
    },
    {
      label: 'Floor Price',
      value: stats.floorPrice ? `${formatPriceFromDB(stats.floorPrice)} ETH` : 'N/A',
      icon: '🏷️',
      color: 'text-yellow-400'
    },
    {
      label: 'Highest Sale',
      value: stats.highestSale ? `${formatPriceFromDB(stats.highestSale)} ETH` : 'N/A',
      icon: '🚀',
      color: 'text-red-400'
    }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Platform Statistics</h2>
        <div className="flex items-center space-x-3">
          {/* ✅ Show last event type */}
          {lastEvent && (
            <span className="text-xs text-green-400">
              Last: {lastEvent.type}
            </span>
          )}
          <button
            onClick={refresh}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-all hover:shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{metric.icon}</span>
              <span className="text-sm text-slate-400 uppercase tracking-wide">
                {metric.label}
              </span>
            </div>
            <div className={`text-3xl font-bold ${metric.color}`}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
        <p className="text-sm text-slate-400 text-center">
          💡 Statistics update automatically when marketplace events occur
        </p>
      </div>
    </div>
  );
}