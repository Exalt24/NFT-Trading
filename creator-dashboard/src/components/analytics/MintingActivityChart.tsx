import { useState, useEffect } from 'react'; // ADD useEffect
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatChartDate, getChartColors, fillMissingDates } from '../../utils/chartHelpers';
import { exportMintingActivity } from '../../utils/export';
import type { WebSocketEvent } from '../../types'; // ADD THIS

interface MintingActivityChartProps {
  data: Array<{ date: string; count: number; timestamp: number }>;
  events?: WebSocketEvent[]; // ADD THIS
}

export function MintingActivityChart({ data, events = [] }: MintingActivityChartProps) {
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);
  const [refreshKey, setRefreshKey] = useState(0); // ADD THIS for forcing re-render
  const colors = getChartColors();

  useEffect(() => {
    if (!events || events.length === 0) return;

    const mintEvents = events.filter(e => e.type === 'nftMinted');

    if (mintEvents.length > 0) {
      const latestEvent = mintEvents[0];

      if (!latestEvent) return;

      console.log('🎨 Mint event detected, chart will update...', latestEvent.tokenId);

      // Force re-render when new data arrives
      setRefreshKey(prev => prev + 1);
    }
  }, [events]);

  const filteredData = (() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange);

    const filtered = data.filter(d => d.timestamp >= cutoffDate.getTime());
    return fillMissingDates(filtered, timeRange);
  })();

  const totalMints = filteredData.reduce((sum, d) => sum + d.count, 0);

  const handleExport = () => {
    exportMintingActivity(filteredData);
  };

  return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700" key={refreshKey}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Minting Activity</h3>
          <p className="text-sm text-slate-400 mt-1">
            {totalMints} NFT{totalMints !== 1 ? 's' : ''} minted in the last {timeRange} days
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 rounded-lg p-1">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days as 7 | 30 | 90)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${timeRange === days
                    ? 'bg-purple-600 text-white'
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

      {filteredData.length === 0 || totalMints === 0 ? (
        <div className="h-80 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <span className="text-4xl mb-2 block">📊</span>
            <p>No minting activity in the last {timeRange} days</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={filteredData}>
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
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#fff'
              }}
              labelFormatter={(label) => formatChartDate(label as string)}
              formatter={(value: number) => [`${value} NFT${value !== 1 ? 's' : ''}`, 'Minted']}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={colors.primary}
              strokeWidth={2}
              dot={{ fill: colors.primary, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}