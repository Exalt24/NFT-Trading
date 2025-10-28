import { useState, useEffect } from 'react';
import { useRoyalty, basisPointsToPercentage, percentageToBasisPoints, formatRoyalty } from '../../hooks/useRoyalty';
import { MintedNFT } from '../../types';
import { formatAddress } from '../../utils/formatters';

interface RoyaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft?: MintedNFT;
  walletAddress: string;
  onSuccess: () => void;
}

export function RoyaltyModal({ isOpen, onClose, nft, walletAddress, onSuccess }: RoyaltyModalProps) {
  const { loading, error, getTokenRoyalty, getDefaultRoyalty, setTokenRoyalty, setDefaultRoyalty } = useRoyalty();
  const [percentage, setPercentage] = useState<string>('2.5');
  const [receiver, setReceiver] = useState<string>(walletAddress);
  const [currentRoyalty, setCurrentRoyalty] = useState<{ receiver: string; amount: number } | null>(null);
  const [step, setStep] = useState<'form' | 'confirming' | 'success'>('form');

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setReceiver(walletAddress);
      setPercentage('2.5');
      loadCurrentRoyalty();
    }
  }, [isOpen, nft, walletAddress]);

  const loadCurrentRoyalty = async () => {
    if (nft) {
      const royalty = await getTokenRoyalty(nft.tokenId);
      if (royalty) {
        setCurrentRoyalty(royalty);
        setPercentage(basisPointsToPercentage(royalty.amount).toString());
        setReceiver(royalty.receiver);
      }
    } else {
      const royalty = await getDefaultRoyalty();
      if (royalty) {
        setCurrentRoyalty(royalty);
        setPercentage(basisPointsToPercentage(royalty.amount).toString());
        setReceiver(royalty.receiver);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const percentValue = parseFloat(percentage);
    if (isNaN(percentValue) || percentValue < 0 || percentValue > 10) {
      return;
    }

    setStep('confirming');

    try {
      const basisPoints = percentageToBasisPoints(percentValue);
      
      if (nft) {
        await setTokenRoyalty(nft.tokenId, receiver, basisPoints);
      } else {
        await setDefaultRoyalty(receiver, basisPoints);
      }
      
      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to set royalty:', err);
      setStep('form');
    }
  };

  const handleClose = () => {
    if (step !== 'confirming') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {nft ? `Set Royalty for NFT #${nft.tokenId}` : 'Set Default Royalty'}
          </h2>
          <button
            title="Close"
            onClick={handleClose}
            disabled={step === 'confirming'}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {currentRoyalty && (
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <p className="text-sm text-slate-400 mb-2">Current Royalty</p>
                <div className="space-y-1">
                  <p className="text-white font-medium">
                    {formatRoyalty(currentRoyalty.amount)}
                  </p>
                  <p className="text-sm text-slate-400 font-mono">
                    {formatAddress(currentRoyalty.receiver)}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Royalty Percentage
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 pr-12"
                  placeholder="2.5"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Maximum 10% (1000 basis points)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Receiver Address
              </label>
              <input
                type="text"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                placeholder="0x..."
                required
                pattern="^0x[a-fA-F0-9]{40}$"
              />
              <p className="text-xs text-slate-400 mt-1">Address that will receive royalties</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="text-blue-400 font-medium mb-2">About Royalties</h4>
              <p className="text-sm text-slate-300">
                {nft 
                  ? 'Set a custom royalty for this specific NFT. This will override the default royalty.'
                  : 'Set the default royalty percentage for all newly minted NFTs. You can override this for individual tokens later.'}
              </p>
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
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting...' : 'Set Royalty'}
              </button>
            </div>
          </form>
        )}

        {step === 'confirming' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Updating Royalty...</h3>
            <p className="text-slate-400">Please confirm the transaction in MetaMask</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Royalty Updated!</h3>
            <p className="text-slate-400">
              {nft 
                ? `NFT #${nft.tokenId} now has ${percentage}% royalty`
                : `Default royalty set to ${percentage}%`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}