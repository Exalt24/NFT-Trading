import { useState, useMemo, useEffect } from 'react';
import { formatAddress, formatTimestamp, formatEther } from '../utils/formatters';
import type { WebSocketEvent } from '../types';

const EVENT_LABELS: Record<WebSocketEvent['type'], string> = {
  nftMinted: '🎨 Minted',
  nftTransferred: '↔️ Transferred',
  nftListed: '🏷 Listed',
  nftSold: '💰 Sold',
  nftCancelled: '❌ Cancelled',
  priceUpdated: '📝 Price Updated',
  defaultRoyaltyUpdated: '👑 Default Royalty', // ✅ NEW
  tokenRoyaltyUpdated: '💎 Token Royalty', // ✅ NEW
};

const EVENT_COLORS: Record<WebSocketEvent['type'], string> = {
  nftMinted: 'text-green-400',
  nftTransferred: 'text-blue-400',
  nftListed: 'text-purple-400',
  nftSold: 'text-yellow-400',
  nftCancelled: 'text-red-400',
  priceUpdated: 'text-orange-400',
  defaultRoyaltyUpdated: 'text-purple-300', // ✅ NEW
  tokenRoyaltyUpdated: 'text-purple-500', // ✅ NEW
};

interface ActivityFeedProps {
  events: WebSocketEvent[];
  isConnected: boolean;
  connectionError: string | null;
  onClearEvents: () => void;
  onReconnect: () => void;
  limit?: number;
}

function isValidPrice(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '0') return false;
  try {
    BigInt(trimmed);
    return true;
  } catch {
    return false;
  }
}

function isValidAddress(value: unknown): boolean {
  return typeof value === 'string' && value.length > 10;
}

export function ActivityFeed({ 
  events, 
  isConnected, 
  connectionError, 
  onClearEvents, 
  onReconnect,
  limit = 50 
}: ActivityFeedProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<WebSocketEvent['type']>>(
    new Set([
      'nftMinted', 
      'nftListed', 
      'nftSold', 
      'nftCancelled', 
      'priceUpdated', 
      'nftTransferred',
      'defaultRoyaltyUpdated', // ✅ NEW
      'tokenRoyaltyUpdated', // ✅ NEW
    ])
  );

  useEffect(() => {
    console.log('ActivityFeed - Total events:', events.length);
    console.log('ActivityFeed - Selected types:', Array.from(selectedTypes));
  }, [events, selectedTypes]);

  const filteredEvents = useMemo(() => {
    const filtered = events
      .filter(event => selectedTypes.has(event.type))
      .slice(0, limit);
    
    console.log('ActivityFeed - Filtered events:', filtered.length);
    return filtered;
  }, [events, selectedTypes, limit]);

  const toggleEventType = (type: WebSocketEvent['type']) => {
    setSelectedTypes(prev => {
      const updated = new Set(prev);
      if (updated.has(type)) {
        updated.delete(type);
      } else {
        updated.add(type);
      }
      return updated;
    });
  };

  const getEventDetails = (event: WebSocketEvent): string => {
    const data = event.data || {};

    try {
      switch (event.type) {
        case 'nftMinted':
          return isValidAddress(data.owner)
            ? `Token #${event.tokenId} minted to ${formatAddress(data.owner as string)}`
            : `Token #${event.tokenId} minted`;

        case 'nftTransferred':
          return isValidAddress(data.from) && isValidAddress(data.to)
            ? `Token #${event.tokenId} transferred from ${formatAddress(data.from as string)} to ${formatAddress(data.to as string)}`
            : `Token #${event.tokenId} transferred`;

        case 'nftListed':
          if (isValidPrice(data.price) && isValidAddress(data.seller)) {
            return `Token #${event.tokenId} listed for ${formatEther(data.price as string)} ETH by ${formatAddress(data.seller as string)}`;
          }
          return `Token #${event.tokenId} listed for sale`;

        case 'nftSold':
          if (isValidPrice(data.price) && isValidAddress(data.buyer)) {
            return `Token #${event.tokenId} sold for ${formatEther(data.price as string)} ETH to ${formatAddress(data.buyer as string)}`;
          }
          return `Token #${event.tokenId} sold`;

        case 'nftCancelled':
          return isValidAddress(data.seller)
            ? `Token #${event.tokenId} listing cancelled by ${formatAddress(data.seller as string)}`
            : `Token #${event.tokenId} listing cancelled`;

        case 'priceUpdated':
          if (isValidPrice(data.oldPrice) && isValidPrice(data.newPrice)) {
            return `Token #${event.tokenId} price updated from ${formatEther(data.oldPrice as string)} to ${formatEther(data.newPrice as string)} ETH`;
          }
          return `Token #${event.tokenId} price updated`;

        // ✅ NEW: Royalty Events
        case 'defaultRoyaltyUpdated':
          if (typeof data.feeNumerator === 'number' && isValidAddress(data.receiver)) {
            return `Default royalty set to ${(data.feeNumerator / 100).toFixed(2)}% for ${formatAddress(data.receiver as string)}`;
          }
          return 'Default royalty updated';

        case 'tokenRoyaltyUpdated':
          if (typeof data.feeNumerator === 'number' && isValidAddress(data.receiver)) {
            return `Token #${event.tokenId} royalty set to ${(data.feeNumerator / 100).toFixed(2)}% for ${formatAddress(data.receiver as string)}`;
          }
          return `Token #${event.tokenId} royalty updated`;

        default:
          return `Token #${event.tokenId} event`;
      }
    } catch (error) {
      console.error('Error formatting event details:', error, event);
      return `Token #${event.tokenId} ${event.type}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-3xl font-bold">Live Activity</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-sm text-slate-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <button
          onClick={onClearEvents}
          className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={events.length === 0}
        >
          Clear History
        </button>
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="bg-red-900/50 border-l-4 border-red-500 p-4 flex items-center justify-between">
          <p className="text-red-200">{connectionError}</p>
          <button
            onClick={onReconnect}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Event Type Filters */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(EVENT_LABELS) as WebSocketEvent['type'][]).map(type => (
          <button
            key={type}
            onClick={() => toggleEventType(type)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              selectedTypes.has(type)
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {EVENT_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="text-6xl mb-4">📡</div>
            <h3 className="text-2xl font-bold mb-2">No Activity Yet</h3>
            <p className="text-slate-400 mb-4">
              {events.length === 0
                ? 'Waiting for blockchain events...'
                : 'No events match your filters. Try selecting different event types above.'}
            </p>
            {events.length > 0 && (
              <button
                onClick={() => setSelectedTypes(new Set([
                  'nftMinted', 
                  'nftListed', 
                  'nftSold', 
                  'nftCancelled', 
                  'priceUpdated', 
                  'nftTransferred',
                  'defaultRoyaltyUpdated',
                  'tokenRoyaltyUpdated'
                ]))}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Show All Event Types
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {filteredEvents.map((event, index) => (
              <div
                key={`${event.type}-${event.tokenId}-${event.timestamp}-${index}`}
                className="p-4 hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`font-medium ${EVENT_COLORS[event.type]}`}>
                        {EVENT_LABELS[event.type]}
                      </span>
                      <span className="text-sm text-slate-500">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">
                      {getEventDetails(event)}
                    </p>
                    {event.blockNumber && (
                      <p className="text-xs text-slate-500 mt-1">
                        Block #{event.blockNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-center text-sm text-slate-400">
        <p>
          Showing {filteredEvents.length} of {events.length} events
          {events.length >= limit && ` (limited to ${limit} most recent)`}
        </p>
      </div>
    </div>
  );
}