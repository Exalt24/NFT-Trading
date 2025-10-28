import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { usePriceHistory } from '../../hooks/useAnalytics';
import { formatPriceFromDB } from '../../utils/formatters';

interface PriceChartProps {
  tokenId: number;
}

export function PriceChart({ tokenId }: PriceChartProps) {
  const { history, loading, error, refresh } = usePriceHistory(tokenId);

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="h-4 bg-slate-700 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="h-64 bg-slate-700 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border-l-4 border-red-500 p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-200 mb-2">Failed to Load Price History</h3>
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

  if (!history || history.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4">Price History</h3>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📈</div>
          <p className="text-slate-400">No price history available</p>
          <p className="text-sm text-slate-500 mt-2">This NFT hasn't been sold yet</p>
        </div>
      </div>
    );
  }

  const chartData = history.map((sale, index) => ({
    sale: `Sale ${index + 1}`,
    price: parseFloat(sale.price),
    date: new Date(sale.soldAt).toLocaleDateString(),
    seller: sale.seller,
    buyer: sale.buyer
  }));

  const avgPrice = chartData.reduce((sum, d) => sum + d.price, 0) / chartData.length;
  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Price History</h3>
        <button
          onClick={refresh}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="sale" 
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8' }}
          />
          <YAxis 
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8' }}
            tickFormatter={(value) => `${formatPriceFromDB(value.toString())} ETH`}
            domain={[minPrice * 0.9, maxPrice * 1.1]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#e2e8f0'
            }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(value: number) => {
              return [`${formatPriceFromDB(value.toString())} ETH`, 'Price'];
            }}
          />
          <ReferenceLine 
            y={avgPrice} 
            stroke="#f59e0b" 
            strokeDasharray="3 3"
            label={{ value: 'Avg', fill: '#f59e0b', fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 6 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-slate-700/50 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-1">Minimum Price</p>
          <p className="text-lg font-bold text-red-400">{formatPriceFromDB(minPrice.toString())} ETH</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-1">Average Price</p>
          <p className="text-lg font-bold text-yellow-400">{formatPriceFromDB(avgPrice.toString())} ETH</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-1">Maximum Price</p>
          <p className="text-lg font-bold text-green-400">{formatPriceFromDB(maxPrice.toString())} ETH</p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
        <p className="text-sm text-blue-300">
          📊 This NFT has been sold {history.length} time{history.length > 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}