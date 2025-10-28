import { useState } from 'react';
import type { JsonRpcSigner } from 'ethers';
import { useMarketplaceActions } from '../../hooks/useMarketplace';
import TransactionStatus from '../TransactionStatus';
import { NFTImage } from '../NFTImage';

interface CancelListingModalProps {
  nft: {
    tokenId: number;
    name?: string;
    image?: string;
  };
  price: string;
  signer: JsonRpcSigner;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'confirm' | 'canceling' | 'success' | 'error';

export default function CancelListingModal({ nft, price, signer, onClose, onSuccess }: CancelListingModalProps) {
  const [step, setStep] = useState<Step>('confirm');
  const [error, setError] = useState<string | null>(null);
  const { cancelListing, txState } = useMarketplaceActions(signer);

  const handleCancel = async () => {
    try {
      setStep('canceling');
      setError(null);
      
      await cancelListing(nft.tokenId);
      
      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Cancel listing error:', err);
      if (err.code === 'CALL_EXCEPTION') {
        setError('Cannot cancel: This listing does not exist or you are not the seller.');
      } else if (err.code === 'ACTION_REJECTED') {
        setError('Transaction rejected by user.');
      } else {
        setError(err.message || 'Cancellation failed');
      }
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Cancel Listing</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
            disabled={step === 'canceling'}
          >
            ×
          </button>
        </div>

        {nft.image && (
          <div className="mb-4">
            <NFTImage
              imageUri={nft.image}
              tokenId={nft.tokenId}
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}

        {(step === 'confirm' || step === 'error') && (
          <div className="space-y-4">
            <div>
              <p className="text-slate-300 mb-2">
                <span className="font-semibold">{nft.name || `NFT #${nft.tokenId}`}</span>
              </p>
              <div className="bg-slate-700 rounded-lg p-3 mb-4">
                <p className="text-sm text-slate-400">Current Price</p>
                <p className="text-xl font-bold text-white">{price} ETH</p>
              </div>
            </div>

            <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-200 text-sm">
                ⚠️ Are you sure you want to cancel this listing? Your NFT will be removed from the marketplace.
              </p>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Keep Listing
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Cancel Listing
              </button>
            </div>
          </div>
        )}

        {step === 'canceling' && (
          <TransactionStatus
            status={txState.status}
            txHash={txState.hash}
            message="Canceling listing..."
          />
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✓</div>
            <p className="text-xl font-semibold text-green-400 mb-2">Listing Canceled!</p>
            <p className="text-slate-300">Your NFT has been removed from the marketplace</p>
          </div>
        )}
      </div>
    </div>
  );
}