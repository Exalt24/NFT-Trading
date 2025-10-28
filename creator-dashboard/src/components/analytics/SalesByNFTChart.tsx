import { useEffect, useState } from 'react'; // ADD THESE
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatETHValue, getChartColors } from '../../utils/chartHelpers';
import { exportTopNFTs } from '../../utils/export';
import type { WebSocketEvent } from '../../types'; // ADD THIS

interface SalesByNFTChartProps {
  data: Array<{
    tokenId: number;
    name: string;
    salesCount: number;
    totalVolume: number;
  }>;
  events?: WebSocketEvent[]; // ADD THIS
}

export function SalesByNFTChart({ data, events = [] }: SalesByNFTChartProps) {
  const [refreshKey, setRefreshKey] = useState(0); // ADD THIS
  const colors = getChartColors();
  const topNFTs = data.slice(0, 10);

  // ✅ ADD: Refresh on sales
  useEffect(() => {
    if (!events || events.length === 0) return;

    const saleEvents = events.filter(e => e.type === 'nftSold');

    if (saleEvents.length > 0) {
      const latestEvent = saleEvents[0];
      
      if (!latestEvent) return;
      
      console.log('💰 Sale event detected, updating top NFTs...', latestEvent.tokenId);
      
      setRefreshKey(prev => prev + 1);
    }
  }, [events]);

  const handleExport = () => {
    exportTopNFTs(data);
  };

  return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700" key={refreshKey}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Top NFTs by Sales Volume</h3>
          <p className="text-sm text-slate-400 mt-1">
            Top 10 best-performing NFTs in your collection
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
          title="Export to CSV"
        >
          📥 Export
        </button>
      </div>

      {topNFTs.length === 0 ? (
        <div className="h-80 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <span className="text-4xl mb-2 block">📊</span>
            <p>No sales data available yet</p>
            <p className="text-sm mt-2">Your NFT sales will appear here</p>
          </div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topNFTs} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                type="number"
                stroke={colors.text}
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `${formatETHValue(value)} ETH`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke={colors.text}
                style={{ fontSize: '12px' }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'totalVolume') {
                    return [`${formatETHValue(value)} ETH`, 'Total Volume'];
                  }
                  return [value, 'Sales Count'];
                }}
              />
              <Bar
                dataKey="totalVolume"
                fill={colors.success}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-white mb-3">Detailed Breakdown</h4>
            <div className="space-y-2">
              {topNFTs.slice(0, 5).map((nft, index) => (
                <div
                  key={nft.tokenId}
                  className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-slate-500">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-white">{nft.name}</p>
                      <p className="text-xs text-slate-400">Token #{nft.tokenId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-400">
                      {formatETHValue(nft.totalVolume)} ETH
                    </p>
                    <p className="text-xs text-slate-400">
                      {nft.salesCount} sale{nft.salesCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}