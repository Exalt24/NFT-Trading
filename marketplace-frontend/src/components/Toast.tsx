import { useEffect, useState } from 'react';
import { formatAddress, formatEther } from '../utils/formatters';
import type { WebSocketEvent } from '../types';

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  timestamp: number;
}

interface ToastProps {
  lastEvent: WebSocketEvent | null;
}

const TOAST_DURATION = 5000;
const MAX_TOASTS = 3;

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

export function Toast({ lastEvent }: ToastProps) {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  useEffect(() => {
    if (!lastEvent) return;

    console.log('Toast received event:', lastEvent);

    const message = getEventMessage(lastEvent);
    if (!message) {
      console.log('No message generated for event:', lastEvent.type);
      return;
    }

    const type = getEventType(lastEvent.type);

    const notification: ToastNotification = {
      id: `${lastEvent.type}-${lastEvent.tokenId}-${lastEvent.timestamp}`,
      message,
      type,
      timestamp: Date.now(),
    };

    setNotifications(prev => {
      const updated = [notification, ...prev];
      return updated.slice(0, MAX_TOASTS);
    });

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, TOAST_DURATION);
  }, [lastEvent]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`
            p-4 rounded-lg shadow-lg border animate-slide-in
            ${notification.type === 'success' ? 'bg-green-900/90 border-green-500 text-green-100' : ''}
            ${notification.type === 'info' ? 'bg-blue-900/90 border-blue-500 text-blue-100' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-900/90 border-yellow-500 text-yellow-100' : ''}
          `}
        >
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              className="text-current opacity-70 hover:opacity-100 transition-opacity ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function getEventMessage(event: WebSocketEvent): string | null {
  const data = event.data || {};
  console.log(`Formatting ${event.type} with data:`, data);

  try {
    switch (event.type) {
      case 'nftMinted':
        return `🎨 NFT #${event.tokenId} minted!`;

      case 'nftListed':
        if (!isValidPrice(data.price)) {
          console.warn('Invalid price for nftListed:', data.price);
          return `🏷 NFT #${event.tokenId} listed for sale`;
        }
        return `🏷 NFT #${event.tokenId} listed for ${formatEther(data.price as string)} ETH`;

      case 'nftSold':
        if (!isValidPrice(data.price)) {
          console.warn('Invalid price for nftSold:', data.price);
          return `💰 NFT #${event.tokenId} sold!`;
        }
        return `💰 NFT #${event.tokenId} sold for ${formatEther(data.price as string)} ETH!`;

      case 'nftCancelled':
        return `❌ NFT #${event.tokenId} listing cancelled`;

      case 'priceUpdated':
        if (!isValidPrice(data.newPrice)) {
          console.warn('Invalid newPrice for priceUpdated:', data.newPrice);
          return `📝 NFT #${event.tokenId} price updated`;
        }
        return `📝 NFT #${event.tokenId} price updated to ${formatEther(data.newPrice as string)} ETH`;

      case 'nftTransferred':
        if (!isValidAddress(data.to)) {
          console.warn('Invalid to address for nftTransferred:', data.to);
          return `↔️ NFT #${event.tokenId} transferred`;
        }
        return `↔️ NFT #${event.tokenId} transferred to ${formatAddress(data.to as string)}`;

      // ✅ NEW: Royalty Events
      case 'defaultRoyaltyUpdated':
        if (typeof data.feeNumerator === 'number') {
          return `👑 Default royalty updated to ${(data.feeNumerator / 100).toFixed(2)}%`;
        }
        return `👑 Default royalty updated`;

      case 'tokenRoyaltyUpdated':
        if (typeof data.feeNumerator === 'number') {
          return `💎 NFT #${event.tokenId} royalty updated to ${(data.feeNumerator / 100).toFixed(2)}%`;
        }
        return `💎 NFT #${event.tokenId} royalty updated`;

      default:
        return `NFT #${event.tokenId} updated`;
    }
  } catch (error) {
    console.error('Error formatting event message:', error, event);
    return null;
  }
}

function getEventType(type: WebSocketEvent['type']): ToastNotification['type'] {
  switch (type) {
    case 'nftMinted':
    case 'nftSold':
    case 'defaultRoyaltyUpdated': // ✅ NEW
    case 'tokenRoyaltyUpdated': // ✅ NEW
      return 'success';
    case 'nftCancelled':
      return 'warning';
    default:
      return 'info';
  }
}