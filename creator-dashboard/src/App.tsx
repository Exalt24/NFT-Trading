import { useState, useCallback, useEffect } from 'react';
import { useWallet } from './hooks/useWallet';
import { useIPFS } from './hooks/useIPFS';
import { useCreatorAnalytics } from './hooks/useCreatorAnalytics';
import { useWebSocket } from './hooks/useWebSocket'; // ← ADD THIS IMPORT
import { MintNFT } from './components/MintNFT';
import { BatchMint } from './components/BatchMint';
import { MyCreations } from './components/MyCreations';
import { CreatorStats } from './components/analytics/CreatorStats';
import { MintingActivityChart } from './components/analytics/MintingActivityChart';
import { RoyaltyEarningsChart } from './components/analytics/RoyaltyEarningsChart';
import { SalesByNFTChart } from './components/analytics/SalesByNFTChart';
import { Toast } from './components/Toast';
import { formatAddress } from './utils/formatters';
import type { WebSocketEvent } from './types'; // ← ADD THIS IMPORT

type View = 'dashboard' | 'mint' | 'batch' | 'creations' | 'analytics';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const navigationItems = [
  { id: 'dashboard' as View, label: 'Overview', icon: '🏠' },
  { id: 'mint' as View, label: 'Mint NFT', icon: '✨' },
  { id: 'batch' as View, label: 'Batch Mint', icon: '📦' },
  { id: 'creations' as View, label: 'My Collection', icon: '🖼️' },
  { id: 'analytics' as View, label: 'Analytics', icon: '📊' },
];

function App() {
  const { wallet, isConnecting, error: walletError, connect, disconnect } = useWallet();
  const { isPinataConfigured } = useIPFS();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // ✅ ADD: WebSocket integration with auto-connect
  const {
    isConnected: wsConnected,
    events: wsEvents,
    subscribe,
    connectionError: wsError
  } = useWebSocket({
    autoConnect: true,
    reconnectOnMount: true
  });

const analytics = useCreatorAnalytics({ 
  creatorAddress: wallet.address,
  events: wsEvents 
});


  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);
  // ✅ ADD: Subscribe to relevant rooms when wallet connects
  useEffect(() => {
    if (wallet.address && wsConnected) {
      console.log('🔌 WebSocket connected, subscribing to rooms...');
      subscribe('global'); // All events
      subscribe('marketplace'); // Marketplace events
      subscribe(`owner-${wallet.address.toLowerCase()}`); // Owner-specific events
    }
  }, [wallet.address, wsConnected, subscribe]);

  // ✅ ADD: Show toast notifications for WebSocket events
  useEffect(() => {
    if (wsEvents.length === 0) return;

    const latestEvent = wsEvents[0];

    // Guard against undefined
    if (!latestEvent) return;

    const eventMessages: Record<WebSocketEvent['type'], string> = {
      nftMinted: `🎨 NFT #${latestEvent.tokenId} minted`,
      nftTransferred: `📤 NFT #${latestEvent.tokenId} transferred`,
      nftListed: `🏷️ NFT #${latestEvent.tokenId} listed on marketplace`,
      nftSold: `💰 NFT #${latestEvent.tokenId} sold`,
      nftCancelled: `❌ Listing for NFT #${latestEvent.tokenId} cancelled`,
      priceUpdated: `💲 Price updated for NFT #${latestEvent.tokenId}`,
      defaultRoyaltyUpdated: `👑 Default royalty updated`,
      tokenRoyaltyUpdated: `👑 Royalty updated for NFT #${latestEvent.tokenId}`,
    };

    const message = eventMessages[latestEvent.type];
    if (message) {
      addToast(message, 'info');
    }
  }, [wsEvents, addToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-linear-to-br from-purple-900/20 via-slate-900/40 to-blue-900/20" />

        <div className="relative w-full max-w-md">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-purple-500 to-blue-500 rounded-2xl mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">NFT Creator Studio</h1>
              <p className="text-slate-400">Connect your wallet to get started</p>
            </div>

            <button
              onClick={connect}
              disabled={isConnecting}
              className="w-full py-4 bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <span>🦊</span>
                  Connect with MetaMask
                </>
              )}
            </button>

            {walletError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm text-center">{walletError}</p>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
              <p className="text-blue-300 text-sm text-center">
                <span className="font-medium">Note:</span> You must be the contract owner to access creator features
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!wallet.isOwner) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-linear-to-br from-red-900/20 via-slate-900/40 to-orange-900/20" />

        <div className="relative w-full max-w-md">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-red-900/50 rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-2xl mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
              <p className="text-slate-400 mb-4">
                This dashboard is only accessible to the NFT contract owner.
              </p>
              <div className="p-3 bg-slate-800/50 rounded-lg mb-6">
                <p className="text-xs text-slate-500 mb-1">Connected Address</p>
                <p className="text-white font-mono text-sm">{formatAddress(wallet.address)}</p>
              </div>
            </div>

            <button
              onClick={disconnect}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
            >
              Disconnect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="absolute inset-0 bg-linear-to-br from-purple-900/10 via-slate-900/50 to-blue-900/10" />

      <div className="relative">
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800/50 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">✨</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Creator Studio</h1>
                  <p className="text-xs text-slate-400">NFT Management Platform</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* ✅ ADD: WebSocket connection indicator */}
                {wsConnected ? (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-400 text-xs font-medium">Live Updates</span>
                  </div>
                ) : wsError ? (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <span className="text-red-400">⚠️</span>
                    <span className="text-red-400 text-xs font-medium">Disconnected</span>
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="w-4 h-4 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
                    <span className="text-yellow-400 text-xs font-medium">Connecting...</span>
                  </div>
                )}

                {!isPinataConfigured && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <span className="text-yellow-400">⚠️</span>
                    <span className="text-yellow-400 text-xs font-medium">IPFS Not Configured</span>
                  </div>
                )}

                <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Wallet</p>
                    <p className="text-sm text-white font-mono">{formatAddress(wallet.address)}</p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>

                <button
                  onClick={disconnect}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors border border-red-500/20 font-medium text-sm"
                >
                  Disconnect
                </button>
              </div>
            </div>

            <nav className="flex gap-1 pb-4 overflow-x-auto">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${currentView === item.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentView === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Welcome back! 👋</h2>
                <p className="text-slate-400">Manage your NFT collection and track your creative journey</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-300 cursor-pointer" onClick={() => setCurrentView('mint')}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">✨</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Mint NFT</h3>
                      <p className="text-sm text-slate-400">Create single NFT</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      IPFS metadata storage
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      Custom attributes
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      Instant deployment
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300 cursor-pointer" onClick={() => setCurrentView('batch')}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">📦</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Batch Mint</h3>
                      <p className="text-sm text-slate-400">Mint up to 20 NFTs</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      CSV metadata import
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      Bulk IPFS upload
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      Progress tracking
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6 hover:border-green-500/50 transition-all duration-300 cursor-pointer" onClick={() => setCurrentView('analytics')}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">📊</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Analytics</h3>
                      <p className="text-sm text-slate-400">Track performance</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Sales & revenue data
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Royalty tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Visual reports
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-linear-to-br from-purple-900/30 to-blue-900/30 backdrop-blur border border-purple-500/30 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Ready to create?</h3>
                    <p className="text-slate-300 text-sm">Start minting your NFT collection today</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setCurrentView('mint')}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors shadow-lg"
                    >
                      Start Minting
                    </button>
                    <button
                      onClick={() => setCurrentView('creations')}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                    >
                      View Collection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'mint' && wallet.address && (
            <div className="animate-fade-in">
              <MintNFT
                walletAddress={wallet.address}
                onShowToast={addToast}
                onSuccess={() => {
                  addToast('NFT minted successfully!', 'success');
                  setTimeout(() => setCurrentView('creations'), 2000);
                }}
              />
            </div>
          )}

          {currentView === 'batch' && (
            <div className="animate-fade-in">
              <BatchMint />
            </div>
          )}

          {/* ✅ UPDATED: Pass WebSocket events to MyCreations */}
          {currentView === 'creations' && wallet.address && (
            <div className="animate-fade-in">
              <MyCreations
                walletAddress={wallet.address}
                showToast={addToast}
                events={wsEvents} // ← PASS EVENTS HERE
                onListNFT={(tokenId) => {
                  addToast(`Marketplace listing available for NFT #${tokenId}`, 'info');
                }}
                onSetRoyalty={(tokenId) => {
                  addToast(`Royalty updated for NFT #${tokenId}`, 'success');
                }}
              />
            </div>
          )}

          {currentView === 'analytics' && wallet.address && (
            <div className="space-y-8 animate-fade-in">
              {/* Pass WebSocket events to analytics components */}
              <CreatorStats
                walletAddress={wallet.address}
                events={wsEvents} // ← ADD THIS
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MintingActivityChart
                  data={analytics.mintingActivity}
                  events={wsEvents} // ← ADD THIS
                />
                <RoyaltyEarningsChart
                  data={analytics.royaltyEarnings}
                  events={wsEvents} // ← ADD THIS
                />
              </div>

              <SalesByNFTChart
                data={analytics.topNFTs}
                events={wsEvents} // ← ADD THIS
              />

              {analytics.loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
                  <p className="text-slate-400">Loading analytics data...</p>
                </div>
              )}

              {analytics.error && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-8 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-red-500/20 rounded-xl mb-4">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-red-400 mb-2">Failed to Load Analytics</h3>
                  <p className="text-sm text-red-300 mb-4">{analytics.error}</p>
                  <button
                    onClick={analytics.refresh}
                    className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="border-t border-slate-800/50 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>NFT Creator Studio</span>
                <span>•</span>
                <span>Port 3001</span>
                <span>•</span>
                <span className="font-mono">{formatAddress(wallet.address)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-slate-500">
                  {wsConnected ? 'Connected to Local Network' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default App;