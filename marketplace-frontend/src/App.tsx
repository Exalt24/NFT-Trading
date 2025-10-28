import { useState, useEffect } from 'react';
import { useWallet } from './hooks/useWallet';
import { useListings } from './hooks/useMarketplace';
import { useTotalSupply } from './hooks/useNFT';
import { useFilters } from './hooks/useFilters';
import { useWebSocket } from './hooks/useWebSocket';
import { SearchBar } from './components/SearchBar';
import { AdvancedFilters } from './components/AdvancedFilters';
import { NFTCard } from './components/NFTCard';
import { NFTDetail } from './components/NFTDetail';
import { MyNFTs } from './components/MyNFTs';
import { Toast } from './components/Toast';
import { ActivityFeed } from './components/ActivityFeed';
import { PlatformStats } from './components/analytics/PlatformStats';
import { TradingVolumeChart } from './components/analytics/TradingVolumeChart';
import { PriceDistributionChart } from './components/analytics/PriceDistributionChart';
import { TopTradersTable } from './components/analytics/TopTradersTable';
import { formatAddress } from './utils/formatters';
import { api } from './services/api';
import type { NFT } from './types';

const ITEMS_PER_PAGE = 20;

function App() {
  const [currentView, setCurrentView] = useState<'marketplace' | 'mynfts' | 'activity' | 'analytics'>('marketplace');

  const { address, isConnected, balance, signer, connect, disconnect, error, isLoading } = useWallet();
  const { listings, loading: listingsLoading, error: listingsError, refresh: refreshListings } = useListings();
  const { total, loading: totalLoading, refresh: refreshTotal } = useTotalSupply();

  const {
    isConnected: wsConnected,
    events,
    lastEvent,
    connectionError: wsError,
    clearEvents,
    reconnect: wsReconnect
  } = useWebSocket({ autoConnect: true, reconnectOnMount: true });

  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [nftData, setNftData] = useState<Map<number, NFT>>(new Map());
  const [loadingNFTs, setLoadingNFTs] = useState(false);

  const {
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    filteredListings,
    resetFilters,
    activeFilterCount
  } = useFilters(listings, nftData);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  // Fetch NFT data for all listings
  useEffect(() => {
    const fetchNFTData = async () => {
      if (listings.length === 0) return;

      setLoadingNFTs(true);
      const nftMap = new Map<number, NFT>();

      try {
        await Promise.all(
          listings.map(async (listing) => {
            if (listing.tokenId) {
              try {
                const nft = await api.getNFT(listing.tokenId);
                nftMap.set(listing.tokenId, nft);
              } catch (err) {
                console.error(`Failed to fetch NFT ${listing.tokenId}:`, err);
              }
            }
          })
        );
        setNftData(nftMap);
      } catch (err) {
        console.error('Failed to fetch NFT data:', err);
      } finally {
        setLoadingNFTs(false);
      }
    };

    fetchNFTData();
  }, [listings]);

  useEffect(() => {
    if (!lastEvent) return;

    // Refresh total count when NFT is minted
    if (lastEvent.type === 'nftMinted') {
      console.log('[App] Auto-refreshing total supply due to mint event');
      setTimeout(() => {
        refreshTotal();
      }, 1000);
    }
  }, [lastEvent, refreshTotal]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');

    if (tokenParam) {
      const tokenId = parseInt(tokenParam, 10);
      if (!isNaN(tokenId)) {
        console.log(`[App] Auto-opening NFT #${tokenId} from URL`);
        setSelectedTokenId(tokenId);

        // Clean URL without reloading
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);
  // Force refresh marketplace when switching back from MyNFTs
  const handleViewChange = (view: typeof currentView) => {
    setCurrentView(view);
    if (view === 'marketplace') {
      refreshListings();
    }
  };

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  };

  const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentListings = filteredListings.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <nav className="bg-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                NFT Marketplace
              </h1>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleViewChange('marketplace')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'marketplace'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                >
                  Marketplace
                </button>

                <button
                  onClick={() => handleViewChange('mynfts')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'mynfts'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  disabled={!isConnected}
                >
                  My NFTs
                </button>

                <button
                  onClick={() => handleViewChange('activity')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'activity'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                >
                  Activity
                </button>

                <button
                  onClick={() => handleViewChange('analytics')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'analytics'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                >
                  Analytics
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {isConnected ? (
                <>
                  <div className="text-sm text-slate-300">
                    {formatAddress(address!)}
                  </div>
                  {balance && (
                    <div className="text-sm text-green-400">
                      {balance} ETH
                    </div>
                  )}
                  <button
                    onClick={disconnect}
                    className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {isLoading ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/50 border-l-4 border-red-500 p-4">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
            <p className="text-red-200">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm underline hover:no-underline"
            >
              Reload
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Marketplace View */}
        {currentView === 'marketplace' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Explore NFTs</h2>
                {!totalLoading && (
                  <p className="text-slate-400 mt-1">
                    Total NFTs Minted: {total}
                  </p>
                )}
                {isConnected && (
                  <p className="text-green-400 mt-1">
                    Connected to {formatAddress(address!)}
                  </p>
                )}
              </div>
            </div>

            <SearchBar
              onSearch={setSearchQuery}
              placeholder="Search by Token ID or NFT Name..."
            />

            <AdvancedFilters
              filters={filters}
              onFiltersChange={setFilters}
            />

            {listingsError && (
              <div className="bg-red-900/50 border-l-4 border-red-500 p-4">
                <p className="text-red-200">{listingsError}</p>
                <button
                  onClick={refreshListings}
                  className="text-sm underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-slate-400">
                {filteredListings.length === listings.length ? (
                  <>Showing all {listings.length} listings</>
                ) : (
                  <>
                    Showing {filteredListings.length} of{' '}
                    {listings.length} listings
                  </>
                )}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Clear filters
                </button>
              )}
              {totalPages > 1 && (
                <p className="text-slate-400">
                  Page {currentPage} of {totalPages}
                </p>
              )}
            </div>

            {listingsLoading || loadingNFTs ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse">
                    <div className="aspect-square bg-slate-700 rounded-lg mb-4"></div>
                    <div className="h-4 bg-slate-700 rounded mb-2"></div>
                    <div className="h-4 bg-slate-700 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : filteredListings.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {currentListings.map((listing, index) => {
                    const nft = listing.tokenId ? nftData.get(listing.tokenId) : null;

                    return (
                      <NFTCard
                        key={listing.tokenId ?? `listing-${index}`}
                        nft={nft || {
                          tokenId: listing.tokenId,
                          owner: listing.seller,
                          tokenURI: '',
                          nftContract: listing.nftContract,
                        }}
                        listing={listing}
                        onClick={() => listing.tokenId && setSelectedTokenId(listing.tokenId)}
                      />
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      Previous
                    </button>

                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 rounded-lg transition-colors ${currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-white'
                            }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">
                  {searchQuery || activeFilterCount > 0 ? '🔍' : '📦'}
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  {searchQuery || activeFilterCount > 0 ? 'No NFTs Found' : 'No Active Listings'}
                </h3>
                <p className="text-slate-400 mb-6">
                  {searchQuery || activeFilterCount > 0
                    ? searchQuery
                      ? 'No NFT found with that Token ID. Try a different number.'
                      : 'Try adjusting your price range or sort order.'
                    : total > 0
                      ? 'All minted NFTs are currently unlisted. Check back later!'
                      : 'No NFTs have been minted yet. Use the Creator Dashboard to mint your first NFT!'}
                </p>
                {(searchQuery || activeFilterCount > 0) ? (
                  <button
                    onClick={resetFilters}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Clear all filters
                  </button>
                ) : (
                  <button
                    onClick={refreshListings}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Refresh
                  </button>
                )}
              </div>
            )}

            <div className="mt-8 p-4 bg-slate-800 rounded-lg text-center">
              <p className="text-slate-400">
                {isConnected
                  ? '✅ Wallet connected! Click any NFT to view details and buy.'
                  : '👆 Connect your wallet to interact with NFTs'}
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Backend Status:{' '}
                <a
                  href="http://localhost:4000/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Check Health
                </a>
              </p>
            </div>
          </div>
        )}

        {/* My NFTs View */}
        {currentView === 'mynfts' && (
          <>
            {isConnected && address && (
              <MyNFTs
                address={address}
                signer={signer}
                balance={balance}
                onListingsChange={refreshListings}
                lastEvent={lastEvent} // NEW: Pass WebSocket events for auto-refresh
              />
            )}
          </>
        )}

        {/* Activity Feed View */}
        {currentView === 'activity' && (
          <ActivityFeed
            events={events}
            isConnected={wsConnected}
            connectionError={wsError}
            onClearEvents={clearEvents}
            onReconnect={wsReconnect}
          />
        )}

{/* Analytics View */}
{currentView === 'analytics' && (
  <div className="space-y-8">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold mb-2">Market Analytics</h2>
        <p className="text-slate-400">Comprehensive insights into marketplace performance</p>
      </div>
      
      {/* ✅ ADD: Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm">
        <span className={wsConnected ? 'text-green-400' : 'text-red-400'}>
          {wsConnected ? '🟢' : '🔴'} {wsConnected ? 'Live' : 'Disconnected'}
        </span>
        {lastEvent && (
          <span className="text-slate-400 text-xs">
            Last update: {new Date(lastEvent.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>

    {/* ✅ PASS lastEvent to all analytics components */}
    <PlatformStats lastEvent={lastEvent} />

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TradingVolumeChart lastEvent={lastEvent} />
      <PriceDistributionChart lastEvent={lastEvent} />
    </div>

    <TopTradersTable lastEvent={lastEvent} />

    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-center">
      <p className="text-slate-400">
        💡 Analytics update automatically when marketplace events occur
        {lastEvent && (
          <span className="ml-2 text-green-400">
            (Last: {lastEvent.type})
          </span>
        )}
      </p>
    </div>
  </div>
)}
      </main>

      {/* NFT Detail Modal */}
      {selectedTokenId !== null && (
        <NFTDetail
          tokenId={selectedTokenId}
          onClose={() => {
            setSelectedTokenId(null);
            refreshListings();
          }}
          currentAddress={address}
          signer={signer}
          lastEvent={lastEvent}
        />
      )}

      {/* Toast Notifications */}
      <Toast lastEvent={lastEvent} />

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p className="mb-2">NFT Marketplace - Phase 3 Complete ✅</p>
          <div className="flex justify-center space-x-4">
            <span className="text-green-400">🟢 Frontend: Running</span>
            <span>⚪ Backend: Check Port 4000</span>
            <span className={wsConnected ? 'text-green-400' : ''}>
              {wsConnected ? '🟢 WebSocket: Connected' : '⚪ WebSocket: Disconnected'}
            </span>
            <span className={isConnected ? 'text-green-400' : ''}>
              {isConnected ? '🟢 Wallet: Connected' : '⚪ Wallet: Not Connected'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;