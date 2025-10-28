import { useState } from 'react';
import { parseEther } from 'ethers';
import type { JsonRpcSigner } from 'ethers';
import { useMarketplaceActions } from '../../hooks/useMarketplace';
import TransactionStatus from '../TransactionStatus';
import { NFTImage } from '../NFTImage';

interface UpdatePriceModalProps {
  nft: {
    tokenId: number;
    name?: string;
    image?: string;
  };
  currentPrice: string;
  signer: JsonRpcSigner;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'input' | 'updating' | 'success' | 'error';

const MAX_PRICE_ETH = 1000000;
const MIN_PRICE_ETH = 0.000001;

export default function UpdatePriceModal({ nft, currentPrice, signer, onClose, onSuccess }: UpdatePriceModalProps) {
  const [newPrice, setNewPrice] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState<string | null>(null);
  const { updatePrice, txState } = useMarketplaceActions(signer);

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

    if (parseFloat(value) === parseFloat(currentPrice)) {
      return 'New price must be different from current price';
    }

    return null;
  };

  const handleUpdate = async () => {
    const validationError = validatePrice(newPrice);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setStep('updating');
      setError(null);
      
      const priceWei = parseEther(newPrice);
      await updatePrice(nft.tokenId, priceWei.toString());
      
      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Update price error:', err);
      if (err.code === 'CALL_EXCEPTION') {
        setError('Cannot update: This listing does not exist or you are not the seller.');
      } else if (err.code === 'ACTION_REJECTED') {
        setError('Transaction rejected by user.');
      } else {
        setError(err.message || 'Price update failed');
      }
      setStep('error');
    }
  };

  const priceValidationError = newPrice ? validatePrice(newPrice) : null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Update Price</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
            disabled={step === 'updating'}
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
          <div className="bg-slate-700 rounded-lg p-3">
            <p className="text-sm text-slate-400">Current Price</p>
            <p className="text-xl font-bold text-white">{currentPrice} ETH</p>
          </div>
        </div>

        {(step === 'input' || step === 'error') && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                New Price (ETH)
              </label>
              <input
                type="text"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder={currentPrice}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Min: {MIN_PRICE_ETH} ETH • Max: {MAX_PRICE_ETH.toLocaleString()} ETH
              </p>
              {priceValidationError && newPrice && (
                <p className="text-sm text-red-400 mt-1">
                  {priceValidationError}
                </p>
              )}
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
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={!newPrice || !!priceValidationError}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
              >
                Update Price
              </button>
            </div>
          </div>
        )}

        {step === 'updating' && (
          <TransactionStatus
            status={txState.status}
            txHash={txState.hash}
            message="Updating price..."
          />
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✓</div>
            <p className="text-xl font-semibold text-green-400 mb-2">Price Updated!</p>
            <p className="text-slate-300">
              New price: {newPrice} ETH
            </p>
          </div>
        )}
      </div>
    </div>
  );
}