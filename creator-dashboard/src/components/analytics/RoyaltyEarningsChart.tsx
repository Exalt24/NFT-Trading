import { useState, useEffect } from 'react'; // ADD useEffect
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatChartDate, formatETHValue, getChartColors, fillMissingDates } from '../../utils/chartHelpers';
import { exportRoyaltyEarnings } from '../../utils/export';
import type { WebSocketEvent } from '../../types'; // ADD THIS

interface RoyaltyEarningsChartProps {
  data: Array<{ date: string; amount: number; count: number; timestamp: number }>;
   events?: WebSocketEvent[]; // ADD THIS
}

export function RoyaltyEarningsChart({ data, events = [] }: RoyaltyEarningsChartProps) {
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);
  const [refreshKey, setRefreshKey] = useState(0); // ADD THIS
  const colors = getChartColors();

  useEffect(() => {
    if (!events || events.length === 0) return;

    const saleEvents = events.filter(e => e.type === 'nftSold');

    if (saleEvents.length > 0) {
      const latestEvent = saleEvents[0];
      
      if (!latestEvent) return;
      
      console.log('👑 Sale event detected, royalties may have updated...', latestEvent.tokenId);
      
      setRefreshKey(prev => prev + 1);
    }
  }, [events]);


  const filteredData = (() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange);
    
    const filtered = data.filter(d => d.timestamp >= cutoffDate.getTime());
    return fillMissingDates(filtered, timeRange);
  })();

  const totalRoyalties = filteredData.reduce((sum, d) => sum + d.amount, 0);
  const totalTransactions = filteredData.reduce((sum, d) => sum + d.count, 0);

  const handleExport = () => {
    exportRoyaltyEarnings(filteredData);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700" key={refreshKey}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Royalty Earnings</h3>
          <p className="text-sm text-slate-400 mt-1">
            {formatETHValue(totalRoyalties)} ETH from {totalTransactions} transaction{totalTransactions !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 rounded-lg p-1">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days as 7 | 30 | 90)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  timeRange === days
                    ? 'bg-pink-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            title="Export to CSV"
          >
            📥 Export
          </button>
        </div>
      </div>

      {filteredData.length === 0 || totalRoyalties === 0 ? (
        <div className="h-80 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <span className="text-4xl mb-2 block">👑</span>
            <p>No royalty earnings in the last {timeRange} days</p>
            <p className="text-sm mt-2">Royalties are earned when your NFTs are resold</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              stroke={colors.text}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke={colors.text}
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `${formatETHValue(value)} ETH`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#fff'
              }}
              labelFormatter={(label) => formatChartDate(label as string)}
              formatter={(value: number) => [
                `${formatETHValue(value)} ETH`,
                'Royalties'
              ]}
            />
            <Bar
              dataKey="amount"
              fill={colors.warning}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      {totalRoyalties > 0 && (
        <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-yellow-400">💡</span>
            <span className="text-yellow-200">
              Average royalty per transaction: <strong>{formatETHValue(totalRoyalties / totalTransactions)} ETH</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}