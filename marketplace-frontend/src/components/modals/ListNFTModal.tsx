import { useState, useEffect } from 'react';
import { parseEther } from 'ethers';
import type { JsonRpcSigner } from 'ethers';
import { useMarketplaceActions } from '../../hooks/useMarketplace';
import { checkApproval, approveNFT } from '../../services/contracts';
import TransactionStatus from '../TransactionStatus';
import { NFTImage } from '../NFTImage';

interface ListNFTModalProps {
  nft: {
    tokenId: number;
    name?: string;
    image?: string;
  };
  signer: JsonRpcSigner;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'input' | 'approve' | 'list' | 'success' | 'error';

const MAX_PRICE_ETH = 1000000;
const MIN_PRICE_ETH = 0.000001;

export default function ListNFTModal({ nft, signer, onClose, onSuccess }: ListNFTModalProps) {
  const [price, setPrice] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [isApproved, setIsApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { listNFT, txState } = useMarketplaceActions(signer);

  useEffect(() => {
    checkApprovalStatus();
  }, [signer]);

  const checkApprovalStatus = async () => {
    try {
      const approved = await checkApproval(nft.tokenId, signer);
      setIsApproved(approved);
    } catch (err: any) {
      console.error('Error checking approval:', err);
      if (err.code === 'CALL_EXCEPTION') {
        setError('This NFT does not exist. Please ensure the token has been minted.');
      }
    }
  };

  const validatePrice = (value: string): string | null => {
    if (!value || value.trim() === '') {
      return 'Price is required';
    }

    const numValue = parseFloat(value);

    if (isNaN(numValue) || numValue <= 0) {
      return 'Price must be a positive number';
    }

    if (numValue < MIN_PRICE_ETH) {
      return `Minimum price is ${MIN_PRICE_ETH} ETH`;
    }

    if (numValue > MAX_PRICE_ETH) {
      return `Maximum price is ${MAX_PRICE_ETH.toLocaleString()} ETH`;
    }

    const decimalPart = value.split('.')[1];
    if (decimalPart && decimalPart.length > 18) {
      return 'Maximum 18 decimal places allowed';
    }

    return null;
  };

  const handlePriceChange = (value: string) => {
    setPrice(value);
    if (error && error.includes('price')) {
      setError(null);
    }
  };

  const handleApprove = async () => {
    try {
      setStep('approve');
      setError(null);
      await approveNFT(nft.tokenId, signer);
      setIsApproved(true);
      setStep('input');
    } catch (err: any) {
      console.error('Approval error:', err);
      if (err.code === 'CALL_EXCEPTION') {
        setError('Cannot approve: This NFT does not exist or you do not own it.');
      } else if (err.code === 'ACTION_REJECTED') {
        setError('Transaction rejected by user.');
      } else {
        setError(err.message || 'Approval failed');
      }
      setStep('error');
    }
  };

  const handleList = async () => {
    const validationError = validatePrice(price);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setStep('list');
      setError(null);
      
      let priceWei;
      try {
        priceWei = parseEther(price);
      } catch (parseError) {
        setError('Invalid price format');
        setStep('error');
        return;
      }
      
      await listNFT(nft.tokenId, priceWei.toString());
      
      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Listing error:', err);
      if (err.code === 'CALL_EXCEPTION') {
        setError('Cannot list: This NFT does not exist or is not approved.');
      } else if (err.code === 'ACTION_REJECTED') {
        setError('Transaction rejected by user.');
      } else if (err.message?.includes('already listed')) {
        setError('NFT is already listed for sale.');
      } else {
        setError(err.message || 'Listing failed');
      }
      setStep('error');
    }
  };

  const handleSubmit = async () => {
    if (!isApproved) {
      await handleApprove();
    } else {
      await handleList();
    }
  };

  const priceValidationError = price ? validatePrice(price) : null;
  const isSubmitDisabled = !price || !!priceValidationError;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">List NFT for Sale</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
            disabled={step === 'approve' || step === 'list'}
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

        <div className="mb-4">
          <p className="text-slate-300 mb-2">
            <span className="font-semibold">{nft.name || `NFT #${nft.tokenId}`}</span>
          </p>
        </div>

        {(step === 'input' || step === 'error') && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Price (ETH)
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0.1"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Min: {MIN_PRICE_ETH} ETH • Max: {MAX_PRICE_ETH.toLocaleString()} ETH
              </p>
              {priceValidationError && price && (
                <p className="text-sm text-red-400 mt-1">
                  {priceValidationError}
                </p>
              )}
            </div>

            {!isApproved && (
              <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-3">
                <p className="text-yellow-200 text-sm">
                  ⚠️ You need to approve the marketplace contract to transfer your NFT. This is a one-time transaction.
                </p>
              </div>
            )}

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
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
              >
                {isApproved ? 'List NFT' : 'Approve & List'}
              </button>
            </div>
          </div>
        )}

        {(step === 'approve' || step === 'list') && (
          <TransactionStatus
            status={txState.status}
            txHash={txState.hash}
            message={step === 'approve' ? 'Approving NFT...' : 'Listing NFT...'}
          />
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✓</div>
            <p className="text-xl font-semibold text-green-400 mb-2">Listed Successfully!</p>
            <p className="text-slate-300">Your NFT is now listed for {price} ETH</p>
          </div>
        )}
      </div>
    </div>
  );
}