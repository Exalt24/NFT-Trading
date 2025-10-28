import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTradingVolume } from '../../hooks/useAnalytics';
import { formatPriceFromDB } from '../../utils/formatters';
import type { WebSocketEvent } from '../../types';

type TimeRange = 7 | 30 | 90;

interface TradingVolumeChartProps {
  lastEvent?: WebSocketEvent | null;
}

export function TradingVolumeChart({ lastEvent }: TradingVolumeChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const { data, loading, error, refresh } = useTradingVolume(timeRange);

  // ✅ Auto-refresh on sales
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'nftSold') {
      console.log(`[TradingVolume] Auto-refreshing due to sale`);
      
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

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4">Trading Volume Over Time</h3>
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📉</div>
          <p className="text-slate-400">No trading volume data available</p>
        </div>
      </div>
    );
  }

  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    volume: parseFloat(item.volume),
    sales: item.salesCount
  }));

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Trading Volume Over Time</h3>
        <div className="flex space-x-2">
          {([7, 30, 90] as TimeRange[]).map(days => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                timeRange === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="date" 
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8' }}
          />
          <YAxis 
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8' }}
            tickFormatter={(value) => `${formatPriceFromDB(value.toString())} ETH`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#e2e8f0'
            }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(value: number) => [`${formatPriceFromDB(value.toString())} ETH`, 'Volume']}
          />
          <Legend 
            wrapperStyle={{ color: '#94a3b8' }}
          />
          <Line
            type="monotone"
            dataKey="volume"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Volume (ETH)"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-slate-700/50 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Total Volume</p>
          <p className="text-xl font-bold text-blue-400">
            {formatPriceFromDB(chartData.reduce((sum, d) => sum + d.volume, 0).toString())} ETH
          </p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Total Sales</p>
          <p className="text-xl font-bold text-green-400">
            {chartData.reduce((sum, d) => sum + d.sales, 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}