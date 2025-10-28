import { useState, useEffect } from 'react';
import { NFTCard } from './NFTCard';
import { NFTDetail } from './NFTDetail';
import { SearchBar } from './SearchBar';
import { useNFTsByOwner } from '../hooks/useNFT';
import { useListingsBySeller } from '../hooks/useMarketplace';
import { useNFTFilters } from '../hooks/useNFTFilters';
import { formatAddress } from '../utils/formatters';
import ListNFTModal from './modals/ListNFTModal';
import UpdatePriceModal from './modals/UpdatePriceModal';
import CancelListingModal from './modals/CancelListingModal';
import type { JsonRpcSigner } from 'ethers';
import type { SortOption, WebSocketEvent } from '../types';

interface MyNFTsProps {
  address: string;
  balance: string | null;
  signer: JsonRpcSigner | null;
  onListingsChange?: () => void;
  lastEvent?: WebSocketEvent | null;
}

type FilterType = 'all' | 'listed' | 'unlisted';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'tokenId-asc', label: 'Token ID: Low to High' },
  { value: 'tokenId-desc', label: 'Token ID: High to Low' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'recent', label: 'Recently Listed' },
];

export function MyNFTs({ address, balance, signer, onListingsChange, lastEvent }: MyNFTsProps) {
  const { nfts, loading, error, refresh } = useNFTsByOwner(address);
  const { listings, refresh: refreshListings } = useListingsBySeller(address);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('tokenId-asc');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [priceFilter, setPriceFilter] = useState<{ min?: number; max?: number }>({});
  const [actionNFT, setActionNFT] = useState<{
    tokenId: number;
    action: 'list' | 'update' | 'cancel';
    currentPrice?: string;
    name?: string;
    image?: string;
  } | null>(null);

  // ✅ FIXED: Auto-refresh when relevant WebSocket events occur
  useEffect(() => {
    if (!lastEvent) return;

    const data = lastEvent.data || {};
    const eventAddress = data.owner || 
                        data.to || 
                        data.from || 
                        data.seller ||
                        data.buyer;
    
    const isRelevantToUser = eventAddress && 
      typeof eventAddress === 'string' && 
      eventAddress.toLowerCase() === address.toLowerCase();

    // Refresh on events that affect this user's NFTs
    if (
      (lastEvent.type === 'nftMinted' && isRelevantToUser) ||
      (lastEvent.type === 'nftTransferred' && isRelevantToUser) ||
      (lastEvent.type === 'nftListed' && isRelevantToUser) ||
      (lastEvent.type === 'nftSold' && isRelevantToUser) ||
      (lastEvent.type === 'nftCancelled' && isRelevantToUser) ||
      (lastEvent.type === 'priceUpdated' && isRelevantToUser) ||
      (lastEvent.type === 'tokenRoyaltyUpdated' && lastEvent.tokenId)
    ) {
      console.log(`[MyNFTs] Auto-refreshing due to ${lastEvent.type} event`);
      
      // Small delay to ensure backend has processed the event
      setTimeout(() => {
        refresh();
        refreshListings();
      }, 1000);
    }
  }, [lastEvent, address, refresh, refreshListings]);

  const listingMap = new Map(
    listings.map(listing => [listing.tokenId, listing])
  );

  const {
    searchQuery,
    setSearchQuery,
    filteredNFTs
  } = useNFTFilters(nfts, listingMap, {
    statusFilter,
    sortBy,
    priceFilter,
    searchQuery: ''
  });

  const listedCount = nfts.filter(nft => 
    listingMap.has(nft.tokenId) && listingMap.get(nft.tokenId)?.active
  ).length;

  const handleActionSuccess = async () => {
    await refresh();
    await refreshListings();
    setActionNFT(null);
    
    if (onListingsChange) {
      onListingsChange();
    }
  };

  const handlePriceApply = () => {
    const min = minPrice ? parseFloat(minPrice) : undefined;
    const max = maxPrice ? parseFloat(maxPrice) : undefined;
    
    if (min !== undefined && min < 0) return;
    if (max !== undefined && max < 0) return;
    if (min !== undefined && max !== undefined && min > max) return;

    setPriceFilter({ min, max });
  };

  const handlePriceReset = () => {
    setMinPrice('');
    setMaxPrice('');
    setPriceFilter({});
  };

  const activeFilterCount = 
    (searchQuery ? 1 : 0) +
    (priceFilter.min !== undefined || priceFilter.max !== undefined ? 1 : 0) +
    (sortBy !== 'tokenId-asc' ? 1 : 0);

  const NFTWithActions = ({ nft }: { nft: any }) => {
    const listing = listingMap.get(nft.tokenId);
    const isListed = listing?.active;

    return (
      <div className="flex flex-col gap-2">
        <div onClick={() => nft.tokenId && setSelectedTokenId(nft.tokenId)}>
          <NFTCard
            nft={nft}
            listing={listing}
            onClick={() => {}}
          />
        </div>
        
        <div className="flex gap-2">
          {!isListed ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActionNFT({
                  tokenId: nft.tokenId,
                  action: 'list',
                  name: nft.metadata?.name,
                  image: nft.metadata?.image
                });
              }}
              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              List
            </button>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActionNFT({
                    tokenId: nft.tokenId,
                    action: 'update',
                    currentPrice: listing.price,
                    name: nft.metadata?.name,
                    image: nft.metadata?.image
                  });
                }}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                Update
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActionNFT({
                    tokenId: nft.tokenId,
                    action: 'cancel',
                    currentPrice: listing.price,
                    name: nft.metadata?.name,
                    image: nft.metadata?.image
                  });
                }}
                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">My NFT Collection</h2>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>Connected: {formatAddress(address)}</span>
          {balance && <span>Balance: {balance} ETH</span>}
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <SearchBar 
          onSearch={setSearchQuery}
          placeholder="Search your NFTs by Token ID, Name, or Description"
        />

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
              <select
                title='Sort By'
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Price Range (ETH) - Listed Only</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <span className="text-slate-400 self-center">to</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handlePriceApply}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <span className="text-sm text-slate-400">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </span>
              <button
                onClick={() => {
                  setSearchQuery('');
                  handlePriceReset();
                  setSortBy('tokenId-asc');
                }}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            All ({nfts.length})
          </button>
          <button
            onClick={() => setStatusFilter('listed')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === 'listed'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Listed ({listedCount})
          </button>
          <button
            onClick={() => setStatusFilter('unlisted')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === 'unlisted'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Unlisted ({nfts.length - listedCount})
          </button>
        </div>

        <button
          onClick={() => {
            refresh();
            refreshListings();
            if (onListingsChange) {
              onListingsChange();
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-md mb-6">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => {
                refresh();
                refreshListings();
                if (onListingsChange) {
                  onListingsChange();
                }
              }}
              className="text-sm underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 animate-pulse">
              <div className="aspect-square bg-slate-700" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNFTs.length > 0 ? (
        <>
          <div className="mb-4 text-sm text-slate-400">
            Showing {filteredNFTs.length} of {nfts.length} NFTs
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredNFTs.map((nft, index) => (
              <NFTWithActions key={nft.tokenId ?? `nft-${index}`} nft={nft} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
          <div className="text-4xl mb-4">
            {statusFilter === 'all' ? '📦' : statusFilter === 'listed' ? '🏷️' : '🖼️'}
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {searchQuery || activeFilterCount > 0
              ? 'No NFTs Match Your Filters'
              : statusFilter === 'all' 
              ? 'No NFTs Yet' 
              : statusFilter === 'listed' 
              ? 'No Listed NFTs' 
              : 'No Unlisted NFTs'}
          </h3>
          <p className="text-slate-400 mb-4">
            {searchQuery || activeFilterCount > 0
              ? 'Try adjusting your search or filters'
              : statusFilter === 'all'
              ? 'You don\'t own any NFTs yet. Visit the Creator Dashboard to mint your first NFT!'
              : statusFilter === 'listed'
              ? 'You have no NFTs listed for sale.'
              : 'All your NFTs are currently listed for sale.'}
          </p>
          {(searchQuery || activeFilterCount > 0) ? (
            <button
              onClick={() => {
                setSearchQuery('');
                handlePriceReset();
                setSortBy('tokenId-asc');
                setStatusFilter('all');
              }}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Clear All Filters
            </button>
          ) : statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-md text-sm font-medium transition-colors"
            >
              View All NFTs
            </button>
          )}
        </div>
      )}

      {selectedTokenId !== null && (
        <NFTDetail
          tokenId={selectedTokenId}
          onClose={() => {
            setSelectedTokenId(null);
            refresh();
            refreshListings();
            if (onListingsChange) {
              onListingsChange();
            }
          }}
          currentAddress={address}
          signer={signer}
          lastEvent={lastEvent}
        />
      )}

      {actionNFT && signer && (
        <>
          {actionNFT.action === 'list' && (
            <ListNFTModal
              nft={{
                tokenId: actionNFT.tokenId,
                name: actionNFT.name,
                image: actionNFT.image
              }}
              signer={signer}
              onClose={() => setActionNFT(null)}
              onSuccess={handleActionSuccess}
            />
          )}

          {actionNFT.action === 'update' && actionNFT.currentPrice && (
            <UpdatePriceModal
              nft={{
                tokenId: actionNFT.tokenId,
                name: actionNFT.name,
                image: actionNFT.image
              }}
              currentPrice={actionNFT.currentPrice}
              signer={signer}
              onClose={() => setActionNFT(null)}
              onSuccess={handleActionSuccess}
            />
          )}

          {actionNFT.action === 'cancel' && actionNFT.currentPrice && (
            <CancelListingModal
              nft={{
                tokenId: actionNFT.tokenId,
                name: actionNFT.name,
                image: actionNFT.image
              }}
              price={actionNFT.currentPrice}
              signer={signer}
              onClose={() => setActionNFT(null)}
              onSuccess={handleActionSuccess}
            />
          )}
        </>
      )}
    </div>
  );
}