import { useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { usePriceDistribution } from '../../hooks/useAnalytics';
import type { WebSocketEvent } from '../../types';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

interface PriceDistributionChartProps {
  lastEvent?: WebSocketEvent | null;
}

export function PriceDistributionChart({ lastEvent }: PriceDistributionChartProps) {
  const { distribution, loading, error, refresh } = usePriceDistribution();

  // ✅ Auto-refresh on listing/price changes
  useEffect(() => {
    if (!lastEvent) return;

    if (['nftListed', 'priceUpdated', 'nftCancelled'].includes(lastEvent.type)) {
      console.log(`[PriceDistribution] Auto-refreshing due to ${lastEvent.type}`);
      
      const timeoutId = setTimeout(() => {
        refresh();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [lastEvent, refresh]);

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="h-4 bg-slate-700 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="h-80 bg-slate-700 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border-l-4 border-red-500 p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-200 mb-2">Failed to Load Chart</h3>
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

  if (!distribution || distribution.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4">Price Distribution</h3>
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-slate-400">No price distribution data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Price Distribution</h3>
        <button
          onClick={refresh}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={distribution}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="range"
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8' }}
            label={{ value: 'Price Range (ETH)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8' }}
            label={{ value: 'Number of NFTs', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#e2e8f0'
            }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(value: number) => [value, 'NFTs']}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {distribution.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
        <p className="text-sm text-slate-400 text-center">
          💡 Distribution shows how NFT prices are spread across different ranges
        </p>
      </div>
    </div>
  );
}