import { useState, useEffect } from 'react';
import { useCreatorNFTs, useFilteredNFTs, usePagination } from '../hooks/useCreatorNFTs';
import { useCreatorStats, formatStatsForDisplay } from '../hooks/useCreatorStats';
import { useIPFS } from '../hooks/useIPFS';
import { RoyaltyModal } from './modals/RoyaltyModal';
import { ListNFTModal } from './modals/ListNFTModal';
import { MintedNFT, WebSocketEvent } from '../types';

interface MyCreationsProps {
  walletAddress: string | null;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  events?: WebSocketEvent[]; // ← ADDED for real-time updates
  onListNFT?: (tokenId: number) => void;
  onSetRoyalty?: (tokenId: number) => void;
}

type StatusFilter = 'all' | 'listed' | 'unlisted';

export function MyCreations({ 
  walletAddress, 
  showToast, 
  events = [], // ← ADDED with default value
  onListNFT: _onListNFT,
  onSetRoyalty: _onSetRoyalty
}: MyCreationsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [royaltyModalOpen, setRoyaltyModalOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<MintedNFT | null>(null);

  const { nfts, listings, loading, error, refetch } = useCreatorNFTs(walletAddress);
  const { stats, loading: statsLoading } = useCreatorStats({
    nfts,
    listings,
    creatorAddress: walletAddress,
  });
  const { getImageUrl } = useIPFS();

  const filteredNFTs = useFilteredNFTs(nfts, listings, { searchQuery, statusFilter });
  const { currentPage, totalPages, paginatedItems, goToPage, nextPage, prevPage } = usePagination(filteredNFTs, 12);

  const displayStats = formatStatsForDisplay(stats);

  // ✅ ADDED: Auto-refresh on marketplace events
useEffect(() => {
  if (!events || events.length === 0) return;

  const relevantEvents = events.filter(e =>
    e.type === 'priceUpdated' ||
    e.type === 'nftListed' ||
    e.type === 'nftSold' ||
    e.type === 'nftCancelled'
  );

  if (relevantEvents.length > 0) {
    const latestEvent = relevantEvents[0];
    
    // Guard against undefined (TypeScript strict mode)
    if (!latestEvent) return;
    
    console.log('🔄 Marketplace event detected, refreshing NFT data...', latestEvent.type);
    
    // Delay refetch slightly to ensure backend has processed the event
    setTimeout(() => {
      refetch();
    }, 1000);
  }
}, [events, refetch]);

  const handleViewOnMarketplace = (tokenId: number) => {
    const marketplaceUrl = `http://localhost:3000?token=${tokenId}`;
    window.open(marketplaceUrl, '_blank');
  };

  const handleOpenListModal = (nft: MintedNFT) => {
    setSelectedNFT(nft);
    setListModalOpen(true);
  };

  const handleOpenRoyaltyModal = (nft: MintedNFT) => {
    setSelectedNFT(nft);
    setRoyaltyModalOpen(true);
  };

  const handleModalSuccess = async () => {
    showToast('Action completed successfully!', 'success');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await refetch();
  };

  if (!walletAddress) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-400">Connect your wallet to view your creations</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Minted"
          value={displayStats.totalMinted}
          loading={statsLoading}
          icon="🎨"
        />
        <StatCard
          title="Listed"
          value={displayStats.totalListed}
          loading={statsLoading}
          icon="🏷️"
        />
        <StatCard
          title="Sold"
          value={displayStats.totalSold}
          loading={statsLoading}
          icon="💰"
        />
        <StatCard
          title="Total Revenue"
          value={displayStats.totalRevenue}
          loading={statsLoading}
          icon="📈"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <FilterTab
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            count={nfts.length}
          >
            All
          </FilterTab>
          <FilterTab
            active={statusFilter === 'listed'}
            onClick={() => setStatusFilter('listed')}
            count={listings.size}
          >
            Listed
          </FilterTab>
          <FilterTab
            active={statusFilter === 'unlisted'}
            onClick={() => setStatusFilter('unlisted')}
            count={nfts.length - listings.size}
          >
            Unlisted
          </FilterTab>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search by ID or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredNFTs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400 mb-2">
            {searchQuery || statusFilter !== 'all'
              ? 'No NFTs match your filters'
              : 'You haven\'t minted any NFTs yet'}
          </p>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedItems.map((nft) => (
              <NFTCard
                key={nft.tokenId}
                nft={nft}
                isListed={listings.has(nft.tokenId)}
                listing={listings.get(nft.tokenId)}
                getImageUrl={getImageUrl}
                onList={() => handleOpenListModal(nft)}
                onSetRoyalty={() => handleOpenRoyaltyModal(nft)}
                onViewMarketplace={() => handleViewOnMarketplace(nft.tokenId)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={prevPage}
              onNext={nextPage}
              onGoToPage={goToPage}
            />
          )}
        </>
      )}

      {walletAddress && selectedNFT && (
        <>
          <ListNFTModal
            isOpen={listModalOpen}
            onClose={() => setListModalOpen(false)}
            nft={selectedNFT}
            onSuccess={handleModalSuccess}
          />
          <RoyaltyModal
            isOpen={royaltyModalOpen}
            onClose={() => setRoyaltyModalOpen(false)}
            nft={selectedNFT}
            walletAddress={walletAddress}
            onSuccess={handleModalSuccess}
          />
        </>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  loading: boolean;
  icon: string;
}

function StatCard({ title, value, loading, icon }: StatCardProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-sm">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      {loading ? (
        <div className="h-8 bg-slate-700 rounded animate-pulse" />
      ) : (
        <div className="text-2xl font-bold text-white">{value}</div>
      )}
    </div>
  );
}

interface FilterTabProps {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}

function FilterTab({ active, onClick, count, children }: FilterTabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-purple-600 text-white'
          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
      }`}
    >
      {children} <span className="text-sm opacity-75">({count})</span>
    </button>
  );
}

interface NFTCardProps {
  nft: MintedNFT;
  isListed: boolean;
  listing?: any;
  getImageUrl: (ipfsUrl: string) => string;
  onList: () => void;
  onSetRoyalty: () => void;
  onViewMarketplace: () => void;
}

function NFTCard({ nft, isListed, listing, getImageUrl, onList, onSetRoyalty, onViewMarketplace }: NFTCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const imageUrl = nft.metadata?.image
    ? getImageUrl(nft.metadata.image)
    : '';

  const formatPrice = (priceWei: string): string => {
    try {
      if (!priceWei || priceWei === '0') return '0.000';
      
      // Check if price is already in ETH format (contains decimal point)
      if (priceWei.includes('.')) {
        const eth = parseFloat(priceWei);
        if (eth < 0.001) return eth.toFixed(6);
        if (eth < 1) return eth.toFixed(4);
        return eth.toFixed(3);
      }
      
      // Otherwise, assume it's in wei
      const priceBigInt = BigInt(priceWei);
      const eth = Number(priceBigInt) / 1e18;
      if (eth < 0.001) return eth.toFixed(6);
      if (eth < 1) return eth.toFixed(4);
      return eth.toFixed(3);
    } catch (err) {
      console.error('Failed to format price:', priceWei, err);
      return '0.000';
    }
  };

  return (
    <div
      className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-purple-500 transition-all group relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="aspect-square bg-slate-900 relative">
        {!imageError && imageUrl ? (
          <img
            src={imageUrl}
            alt={nft.metadata?.name || `NFT #${nft.tokenId}`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <span className="text-6xl">🖼️</span>
          </div>
        )}

        {isListed && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            Listed
          </div>
        )}

        {showActions && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 p-4">
            {!isListed && (
              <button
                onClick={onList}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                List on Marketplace
              </button>
            )}
            {isListed && (
              <button
                onClick={onViewMarketplace}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                View on Marketplace
              </button>
            )}
            <button
              onClick={onSetRoyalty}
              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Set Royalty
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">
              {nft.metadata?.name || `NFT #${nft.tokenId}`}
            </h3>
            <p className="text-slate-400 text-sm">Token #{nft.tokenId}</p>
          </div>
        </div>

        {isListed && listing && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Listed Price</span>
              <span className="text-purple-400 font-medium">
                {formatPrice(listing.price)} ETH
              </span>
            </div>
          </div>
        )}

        {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-slate-400 text-xs">
              {nft.metadata.attributes.length} attribute{nft.metadata.attributes.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-slate-700" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-slate-700 rounded w-3/4" />
        <div className="h-4 bg-slate-700 rounded w-1/2" />
      </div>
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPrevious, onNext, onGoToPage }: PaginationProps) {
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={onPrevious}
        disabled={currentPage === 1}
        className="px-4 py-2 rounded-lg bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
      >
        Previous
      </button>

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onGoToPage(page)}
          className={`w-10 h-10 rounded-lg transition-colors ${
            currentPage === page
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={onNext}
        disabled={currentPage === totalPages}
        className="px-4 py-2 rounded-lg bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
      >
        Next
      </button>
    </div>
  );
}