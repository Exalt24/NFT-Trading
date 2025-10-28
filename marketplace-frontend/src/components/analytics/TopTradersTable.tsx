import { useState, useEffect } from 'react';
import { useTopTraders } from '../../hooks/useAnalytics';
import { formatAddress, formatPriceFromDB } from '../../utils/formatters';
import { downloadCSV } from '../../utils/export';
import type { WebSocketEvent } from '../../types';

type SortField = 'tradesCount' | 'totalVolume' | 'avgPrice';
type SortOrder = 'asc' | 'desc';

interface TopTradersTableProps {
  lastEvent?: WebSocketEvent | null;
}

export function TopTradersTable({ lastEvent }: TopTradersTableProps) {
  const [limit, setLimit] = useState(10);
  const [sortField, setSortField] = useState<SortField>('totalVolume');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const { traders, loading, error, refresh } = useTopTraders(limit);

  // ✅ Auto-refresh on sales
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'nftSold') {
      console.log(`[TopTraders] Auto-refreshing due to sale`);
      
      const timeoutId = setTimeout(() => {
        refresh();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [lastEvent, refresh]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedTraders = [...traders].sort((a, b) => {
    const aVal = parseFloat(a[sortField] as string);
    const bVal = parseFloat(b[sortField] as string);
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const handleExport = () => {
    const exportData = sortedTraders.map((trader, index) => ({
      Rank: index + 1,
      Address: trader.address,
      'Trades Count': trader.tradesCount,
      'Total Volume (ETH)': formatPriceFromDB(trader.totalVolume),
      'Average Price (ETH)': formatPriceFromDB(trader.avgPrice)
    }));
    downloadCSV(exportData, 'top_traders');
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="h-4 bg-slate-700 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-slate-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border-l-4 border-red-500 p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-200 mb-2">Failed to Load Traders</h3>
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

  if (!traders || traders.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4">Top Traders</h3>
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-slate-400">No trading activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Top Traders Leaderboard</h3>
        <div className="flex items-center space-x-2">
          <select
            title="Select number of top traders to display"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-1 bg-slate-700 text-white rounded-lg text-sm"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
          </select>
          <button
            onClick={handleExport}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors flex items-center space-x-1"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Rank</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Address</th>
              <th 
                className="text-right py-3 px-4 text-sm font-semibold text-slate-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('tradesCount')}
              >
                Trades {sortField === 'tradesCount' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-right py-3 px-4 text-sm font-semibold text-slate-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('totalVolume')}
              >
                Volume {sortField === 'totalVolume' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-right py-3 px-4 text-sm font-semibold text-slate-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('avgPrice')}
              >
                Avg Price {sortField === 'avgPrice' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTraders.map((trader, index) => (
              <tr 
                key={trader.address}
                className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
              >
                <td className="py-3 px-4">
                  <span className={`font-bold ${
                    index === 0 ? 'text-yellow-400' :
                    index === 1 ? 'text-gray-400' :
                    index === 2 ? 'text-orange-400' :
                    'text-slate-400'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-sm">
                  {formatAddress(trader.address)}
                </td>
                <td className="py-3 px-4 text-right font-semibold">
                  {trader.tradesCount}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-blue-400">
                  {formatPriceFromDB(trader.totalVolume)} ETH
                </td>
                <td className="py-3 px-4 text-right font-semibold text-green-400">
                  {formatPriceFromDB(trader.avgPrice)} ETH
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
        <p className="text-sm text-slate-400 text-center">
          🏆 Rankings based on total trading volume
        </p>
      </div>
    </div>
  );
}