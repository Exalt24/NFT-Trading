import { useState, useEffect } from 'react';
import { NFTImage } from './NFTImage';
import { useNFT } from '../hooks/useNFT';
import { useListing, usePriceHistory, useMarketplaceActions } from '../hooks/useMarketplace';
import { formatAddress, formatTimestamp, formatPriceFromDB, formatEther, copyToClipboard } from '../utils/formatters';
import { getNFTContract, getProvider } from '../services/contracts';
import ListNFTModal from './modals/ListNFTModal';
import UpdatePriceModal from './modals/UpdatePriceModal';
import CancelListingModal from './modals/CancelListingModal';
import type { JsonRpcSigner } from 'ethers';
import type { NFT, WebSocketEvent } from '../types';

interface NFTDetailProps {
  tokenId: number;
  onClose: () => void;
  currentAddress?: string | null;
  signer?: JsonRpcSigner | null;
  lastEvent?: WebSocketEvent | null; // ✅ NEW: WebSocket events
}

export function NFTDetail({ tokenId, onClose, currentAddress, signer, lastEvent }: NFTDetailProps) {
  const { nft: apiNFT, loading, error, refresh: refreshNFT } = useNFT(tokenId);
  const { listing, refresh: refreshListing } = useListing(tokenId);
  const { history } = usePriceHistory(tokenId);
  const { buyNFT, txState } = useMarketplaceActions(signer || null);

  // ✅ Local state for live royalty data (bypasses API cache)
  const [liveRoyalty, setLiveRoyalty] = useState<{ receiver: string; amount: number } | null>(null);
  const [isRefreshingRoyalty, setIsRefreshingRoyalty] = useState(false);

  const [showBuyConfirm, setShowBuyConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // ✅ Merge API data with live royalty data
  const nft: NFT | null = apiNFT ? {
    ...apiNFT,
    royaltyReceiver: liveRoyalty?.receiver || apiNFT.royaltyReceiver,
    royaltyAmount: liveRoyalty?.amount || apiNFT.royaltyAmount,
  } : null;

  const isOwner = currentAddress && nft && nft.owner.toLowerCase() === currentAddress.toLowerCase();
  const isListed = listing && listing.active;
  const canList = isOwner && !isListed && signer;
  const canManage = isOwner && isListed && signer;
  const canBuy = isListed && !isOwner && currentAddress && signer;

  // ✅ Function to read royalty directly from contract
  const refreshRoyaltyFromContract = async () => {
    if (!tokenId) return;

    setIsRefreshingRoyalty(true);
    try {
      // ✅ Get read-only provider
      const provider = getProvider();
      if (!provider) {
        console.error('Provider not available');
        return;
      }

      // Get contract with provider (read-only)
      const contract = getNFTContract(provider);

      // Read royalty info from contract (ERC-2981 standard)
      const salePrice = 10000n; // 100 ETH in basis points for calculation

      // Call royaltyInfo - returns [receiver address, royalty amount in wei]
      const royaltyInfo = await (contract as any).royaltyInfo(tokenId, salePrice);
      const receiver = royaltyInfo[0];
      const royaltyAmount = royaltyInfo[1];

      // Convert basis points to percentage (royaltyAmount is in basis points)
      const percentage = Number(royaltyAmount * 10000n / salePrice); // basis points (e.g., 250 = 2.5%)

      console.log(`[NFTDetail] Live royalty from contract: ${percentage / 100}% to ${receiver}`);

      setLiveRoyalty({
        receiver: receiver,
        amount: percentage,
      });
    } catch (err) {
      console.error('Failed to read royalty from contract:', err);
    } finally {
      setIsRefreshingRoyalty(false);
    }
  };

  // ✅ Load initial royalty from contract on mount
  useEffect(() => {
    refreshRoyaltyFromContract();
  }, [tokenId]);

  // ✅ NEW: Listen for royalty updates via WebSocket
  useEffect(() => {
    if (!lastEvent) return;

    // Check if this event is a royalty update for THIS specific NFT
    if (lastEvent.type === 'tokenRoyaltyUpdated' && lastEvent.tokenId === tokenId) {
      console.log(`[NFTDetail] Royalty updated for token ${tokenId} via WebSocket - auto-refreshing!`);

      // Small delay to ensure contract state is confirmed
      setTimeout(() => {
        refreshRoyaltyFromContract();
      }, 500);
    }
  }, [lastEvent, tokenId]);

  const handleCopyAddress = (address: string) => {
    copyToClipboard(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBuy = async () => {
    if (!listing || !isListed) return;

    try {
      await buyNFT(tokenId, listing.price);
      setShowBuyConfirm(false);
      await Promise.all([refreshListing(), refreshNFT()]);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error('Buy failed:', err);
    }
  };

  const handleModalSuccess = async () => {
    console.log('[NFTDetail] Modal success - refreshing data...');

    // ✅ FIRST: Read fresh royalty from contract (instant, bypasses database)
    await refreshRoyaltyFromContract();

    // ✅ THEN: Refresh listing and API data (for other fields)
    await Promise.all([refreshListing(), refreshNFT()]);

    console.log('[NFTDetail] Refresh complete - modal stays open!');
    // ✅ DON'T auto-close - let user see the updated data!
  };

  const handleManualRefresh = async () => {
    console.log('[NFTDetail] Manual refresh triggered');
    await Promise.all([
      refreshRoyaltyFromContract(),
      refreshListing(),
      refreshNFT()
    ]);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-lg p-8 max-w-4xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !nft) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4">
          <h3 className="text-xl font-semibold mb-4">Error</h3>
          <p className="text-slate-400 mb-6">{error || 'NFT not found'}</p>
          <button
            onClick={onClose}
            className="w-full bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-slate-800 rounded-lg max-w-6xl w-full my-8">
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 className="text-2xl font-bold">
              {nft.metadata?.name || `NFT #${nft.tokenId}`}
            </h2>
            <div className="flex items-center gap-2">
              {/* ✅ Manual refresh button with loading state */}
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshingRoyalty}
                className="text-slate-400 hover:text-blue-400 disabled:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-700 disabled:cursor-not-allowed"
                aria-label="Refresh data"
                title="Refresh NFT data"
              >
                <svg
                  className={`w-5 h-5 ${isRefreshingRoyalty ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
            {/* Left Column - Image and Attributes */}
            <div className="space-y-6">
              <NFTImage
                imageUri={nft.metadata?.image}
                tokenId={nft.tokenId}
                className="w-full aspect-square rounded-lg"
              />

              {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Attributes</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {nft.metadata.attributes.map((attr, idx) => (
                      <div key={idx} className="bg-slate-700 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">{attr.trait_type}</div>
                        <div className="font-semibold">{attr.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Details and Actions */}
            <div className="flex flex-col space-y-6">
              {nft.metadata?.description && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-slate-300">{nft.metadata.description}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-slate-700">
                  <span className="text-slate-400">Token ID</span>
                  <span className="font-semibold">#{nft.tokenId}</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-700">
                  <span className="text-slate-400">Owner</span>
                  <button
                    onClick={() => handleCopyAddress(nft.owner)}
                    className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                  >
                    <span className="font-mono text-sm">{formatAddress(nft.owner)}</span>
                    {copied ? (
                      <span className="text-xs text-green-400">Copied!</span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>

                {isListed && listing && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Listed Price</span>
                    <span className="text-green-400 font-semibold text-xl">
                      {formatPriceFromDB(listing.price)} ETH
                    </span>
                  </div>
                )}

                {nft.royaltyReceiver && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Royalty</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {nft.royaltyAmount ? (nft.royaltyAmount / 100).toFixed(2) : '0'}%
                      </span>
                      {isRefreshingRoyalty && (
                        <svg className="w-4 h-4 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {canList && (
                  <button
                    onClick={() => setShowListModal(true)}
                    className="w-full bg-green-600 hover:bg-green-700 px-6 py-3 rounded-md font-semibold transition-colors"
                  >
                    List for Sale
                  </button>
                )}

                {canManage && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowUpdateModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-md font-semibold transition-colors"
                    >
                      Update Price
                    </button>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="bg-red-600 hover:bg-red-700 px-4 py-3 rounded-md font-semibold transition-colors"
                    >
                      Cancel Listing
                    </button>
                  </div>
                )}

                {canBuy && (
                  <div>
                    {!showBuyConfirm ? (
                      <button
                        onClick={() => setShowBuyConfirm(true)}
                        disabled={txState.status === 'pending'}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed px-6 py-3 rounded-md font-semibold transition-colors"
                      >
                        Buy Now for {formatPriceFromDB(listing.price)} ETH
                      </button>
                    ) : (
                      <div className="bg-slate-700 rounded-lg p-4">
                        <p className="text-sm mb-4">
                          Confirm purchase of this NFT for <span className="text-green-400 font-semibold">{formatPriceFromDB(listing.price)} ETH</span>?
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={handleBuy}
                            disabled={txState.status === 'pending'}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 px-4 py-2 rounded-md transition-colors"
                          >
                            {txState.status === 'pending' ? 'Processing...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setShowBuyConfirm(false)}
                            disabled={txState.status === 'pending'}
                            className="bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 px-4 py-2 rounded-md transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {txState.status === 'error' && (
                      <div className="mt-2 text-red-400 text-sm">
                        {txState.error}
                      </div>
                    )}

                    {txState.status === 'success' && (
                      <div className="mt-2 text-green-400 text-sm">
                        Purchase successful! The NFT is now yours.
                      </div>
                    )}
                  </div>
                )}

                {!isListed && !isOwner && (
                  <div className="bg-slate-700 rounded-lg p-4">
                    <p className="text-slate-300 text-sm">
                      This NFT is not currently listed for sale.
                    </p>
                  </div>
                )}

                {!currentAddress && isListed && (
                  <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4">
                    <p className="text-yellow-200 text-sm">
                      Connect your wallet to buy this NFT
                    </p>
                  </div>
                )}
              </div>

              {/* Trading History */}
              {history && history.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Trading History</h3>
                  <div className="bg-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-600">
                        <tr>
                          <th className="text-left p-3">Price</th>
                          <th className="text-left p-3">From</th>
                          <th className="text-left p-3">To</th>
                          <th className="text-left p-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.slice(0, 5).map((sale, idx) => (
                          <tr key={idx} className="border-t border-slate-600">
                            <td className="p-3 font-semibold text-green-400">
                              {formatPriceFromDB(sale.price)} ETH
                            </td>
                            <td className="p-3 font-mono text-xs">
                              {formatAddress(sale.seller)}
                            </td>
                            <td className="p-3 font-mono text-xs">
                              {formatAddress(sale.buyer)}
                            </td>
                            <td className="p-3 text-slate-400">
                              {formatTimestamp(sale.soldAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showListModal && signer && (
        <ListNFTModal
          nft={{
            tokenId,
            name: nft.metadata?.name,
            image: nft.metadata?.image
          }}
          signer={signer}
          onClose={() => setShowListModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showUpdateModal && signer && listing && (
        <UpdatePriceModal
          nft={{
            tokenId,
            name: nft.metadata?.name,
            image: nft.metadata?.image
          }}
          currentPrice={listing.price}
          signer={signer}
          onClose={() => setShowUpdateModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showCancelModal && signer && listing && (
        <CancelListingModal
          nft={{
            tokenId,
            name: nft.metadata?.name,
            image: nft.metadata?.image
          }}
          price={listing.price}
          signer={signer}
          onClose={() => setShowCancelModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}