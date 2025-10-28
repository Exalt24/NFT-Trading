import { useState, useEffect } from 'react';
import { parseEther } from 'ethers';
import { getNFTContract, getMarketplaceContract } from '../../services/contracts';
import { MintedNFT } from '../../types';
import { parseTransactionError } from '../../utils/errors';

interface ListNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: MintedNFT;
  onSuccess: () => void;
}

type Step = 'input' | 'approving' | 'listing' | 'success';

export function ListNFTModal({ isOpen, onClose, nft, onSuccess }: ListNFTModalProps) {
  const [price, setPrice] = useState<string>('');
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [txHash, setTxHash] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setPrice('');
      setError(null);
      setIsApproved(false);
      setTxHash('');
      checkApproval();
    }
  }, [isOpen, nft]);

  const checkApproval = async () => {
    try {
      const nftContract = await getNFTContract(false);
      const marketplaceAddress = import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS;
      
      const approvedAddress = await (nftContract as any).getApproved(nft.tokenId);
      const isApprovedForAll = await (nftContract as any).isApprovedForAll(
        nft.owner,
        marketplaceAddress
      );
      
      setIsApproved(
        approvedAddress.toLowerCase() === marketplaceAddress.toLowerCase() ||
        isApprovedForAll
      );
    } catch (err) {
      console.error('Failed to check approval:', err);
    }
  };

  const handleApprove = async () => {
    setStep('approving');
    setError(null);

    try {
      const nftContract = await getNFTContract(true);
      const marketplaceAddress = import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS;
      
      const tx = await (nftContract as any).approve(marketplaceAddress, nft.tokenId);
      setTxHash(tx.hash);
      await tx.wait();
      
      setIsApproved(true);
      setStep('input');
    } catch (err: any) {
      console.error('Approval failed:', err);
      setError(parseTransactionError(err));
      setStep('input');
    }
  };

  const handleList = async () => {
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('Please enter a valid price');
      return;
    }

    if (priceValue < 0.000001) {
      setError('Minimum price is 0.000001 ETH');
      return;
    }

    if (priceValue > 1000000) {
      setError('Maximum price is 1,000,000 ETH');
      return;
    }

    setStep('listing');
    setError(null);

    try {
      const marketplaceContract = await getMarketplaceContract(true);
      const nftContractAddress = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;
      const priceWei = parseEther(price);
      
      const tx = await (marketplaceContract as any).listNFT(
        nftContractAddress,
        nft.tokenId,
        priceWei
      );
      setTxHash(tx.hash);
      await tx.wait();
      
      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Listing failed:', err);
      setError(parseTransactionError(err));
      setStep('input');
    }
  };

  const handleClose = () => {
    if (step !== 'approving' && step !== 'listing') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            List NFT #{nft.tokenId}
          </h2>
          <button
            title="Close"
            onClick={handleClose}
            disabled={step === 'approving' || step === 'listing'}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'input' && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center text-3xl">
                  🖼️
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">
                    {nft.metadata?.name || `NFT #${nft.tokenId}`}
                  </h3>
                  <p className="text-sm text-slate-400">Token #{nft.tokenId}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Listing Price (ETH)
              </label>
              <input
                type="number"
                min="0.000001"
                max="1000000"
                step="0.001"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                placeholder="0.1"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                Min: 0.000001 ETH | Max: 1,000,000 ETH
              </p>
            </div>

            {!isApproved && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-yellow-400 text-sm mb-3">
                  ⚠️ You need to approve the marketplace contract to list this NFT.
                </p>
                <button
                  onClick={handleApprove}
                  className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  Approve NFT
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="text-blue-400 font-medium mb-2">Marketplace Fees</h4>
              <div className="space-y-1 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Platform Fee:</span>
                  <span>2.5%</span>
                </div>
                <div className="flex justify-between">
                  <span>Creator Royalty:</span>
                  <span>{nft.royalty_amount ? (nft.royalty_amount / 100).toFixed(1) : '2.5'}%</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleList}
                disabled={!isApproved || !price}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                List NFT
              </button>
            </div>
          </div>
        )}

        {step === 'approving' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Approving NFT...</h3>
            <p className="text-slate-400 mb-4">Please confirm the transaction in MetaMask</p>
            {txHash && (
              <p className="text-xs text-slate-500 font-mono break-all px-4">
                {txHash}
              </p>
            )}
          </div>
        )}

        {step === 'listing' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Listing NFT...</h3>
            <p className="text-slate-400 mb-4">Please confirm the transaction in MetaMask</p>
            {txHash && (
              <p className="text-xs text-slate-500 font-mono break-all px-4">
                {txHash}
              </p>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">NFT Listed!</h3>
            <p className="text-slate-400">
              NFT #{nft.tokenId} is now listed for {price} ETH
            </p>
          </div>
        )}
      </div>
    </div>
  );
}