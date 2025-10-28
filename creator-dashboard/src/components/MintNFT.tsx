import { useState, useCallback } from 'react';
import { useIPFS } from '../hooks/useIPFS';
import { useMinting } from '../hooks/useMinting';
import { NFTAttribute } from '../types';
import { formatFileSize, validateEthAddress } from '../utils/formatters';
import { FILE_UPLOAD, MAX_ATTRIBUTES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';

interface MintNFTProps {
  walletAddress: string;
  onSuccess?: (tokenId: number) => void;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

export function MintNFT({ walletAddress, onSuccess, onShowToast }: MintNFTProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [attributes, setAttributes] = useState<NFTAttribute[]>([]);
  const [recipient, setRecipient] = useState(walletAddress);
  const [currentStep, setCurrentStep] = useState<'upload' | 'metadata' | 'ipfs' | 'mint' | 'success'>('upload');

  const { uploadImageAndMetadata, isUploading, uploadProgress } = useIPFS();
  const { mint, mintProgress, txStatus, isMinting, reset: resetMinting } = useMinting();

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > FILE_UPLOAD.MAX_SIZE) {
      onShowToast?.(ERROR_MESSAGES.FILE_TOO_LARGE, 'error');
      return;
    }

    if (!FILE_UPLOAD.ACCEPTED_TYPES.includes(file.type as any)) {
      onShowToast?.(ERROR_MESSAGES.INVALID_FILE_TYPE, 'error');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setCurrentStep('metadata');
  }, [onShowToast]);

  const handleAddAttribute = useCallback(() => {
    if (attributes.length >= MAX_ATTRIBUTES) {
      onShowToast?.(`Maximum ${MAX_ATTRIBUTES} attributes allowed`, 'error');
      return;
    }
    setAttributes([...attributes, { trait_type: '', value: '' }]);
  }, [attributes, onShowToast]);

  const handleRemoveAttribute = useCallback((index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  }, [attributes]);

  const handleAttributeChange = useCallback((index: number, field: 'trait_type' | 'value', value: string) => {
    const newAttributes = [...attributes];
    const currentAttr = newAttributes[index];
    if (currentAttr) {
      newAttributes[index] = { 
        trait_type: field === 'trait_type' ? value : currentAttr.trait_type,
        value: field === 'value' ? value : currentAttr.value
      };
      setAttributes(newAttributes);
    }
  }, [attributes]);

  const handleMint = useCallback(async () => {
    if (!imageFile || !name || !description) {
      onShowToast?.('Please fill in all required fields', 'error');
      return;
    }

    if (!validateEthAddress(recipient)) {
      onShowToast?.('Invalid recipient address', 'error');
      return;
    }

    const validAttributes = attributes.filter(attr => attr.trait_type && attr.value);

    try {
      setCurrentStep('ipfs');
      
      const { tokenURI } = await uploadImageAndMetadata(imageFile, {
        name,
        description,
        attributes: validAttributes
      });

      setCurrentStep('mint');

      const tokenId = await mint(recipient, tokenURI);

      setCurrentStep('success');
      onShowToast?.(SUCCESS_MESSAGES.MINT_SUCCESS, 'success');
      onSuccess?.(tokenId);

      setTimeout(() => {
        handleReset();
      }, 5000);
    } catch (err: any) {
      onShowToast?.(err.message || ERROR_MESSAGES.MINT_FAILED, 'error');
      setCurrentStep('metadata');
    }
  }, [imageFile, name, description, recipient, attributes, uploadImageAndMetadata, mint, onSuccess, onShowToast]);

  const handleReset = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setName('');
    setDescription('');
    setAttributes([]);
    setRecipient(walletAddress);
    setCurrentStep('upload');
    resetMinting();
  }, [walletAddress, resetMinting]);

  const renderUploadStep = () => (
    <div className="text-center">
      <div className="border-2 border-dashed border-slate-600 rounded-xl p-12 hover:border-purple-500 transition-colors">
        <input
          type="file"
          id="image-upload"
          accept={FILE_UPLOAD.ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleImageSelect}
          className="hidden"
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Upload NFT Image</h3>
          <p className="text-slate-400 mb-4">
            Click to select or drag and drop
          </p>
          <p className="text-sm text-slate-500">
            JPG, PNG, GIF, WebP (Max {formatFileSize(FILE_UPLOAD.MAX_SIZE)})
          </p>
        </label>
      </div>
    </div>
  );

  const renderMetadataStep = () => (
    <div className="space-y-6">
      {imagePreview && (
        <div className="flex items-start gap-4">
          <img src={imagePreview} alt="Preview" className="w-32 h-32 rounded-lg object-cover" />
          <div className="flex-1">
            <h3 className="text-white font-medium mb-1">{imageFile?.name}</h3>
            <p className="text-slate-400 text-sm">{imageFile && formatFileSize(imageFile.size)}</p>
            <button
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
                setCurrentStep('upload');
              }}
              className="text-red-400 text-sm hover:text-red-300 mt-2"
            >
              Change Image
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-white font-medium mb-2">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Awesome NFT"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      <div>
        <label className="block text-white font-medium mb-2">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your NFT..."
          rows={4}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-white font-medium mb-2">Recipient Address</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-white font-medium">Attributes (Optional)</label>
          <button
            onClick={handleAddAttribute}
            disabled={attributes.length >= MAX_ATTRIBUTES}
            className="text-sm text-purple-400 hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Attribute
          </button>
        </div>

        {attributes.length > 0 && (
          <div className="space-y-3">
            {attributes.map((attr, index) => (
              <div key={index} className="flex gap-3">
                <input
                  type="text"
                  value={attr.trait_type}
                  onChange={(e) => handleAttributeChange(index, 'trait_type', e.target.value)}
                  placeholder="Trait (e.g., Color)"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <input
                  type="text"
                  value={attr.value}
                  onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                  placeholder="Value (e.g., Blue)"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => handleRemoveAttribute(index)}
                  className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleReset}
          className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleMint}
          disabled={!name || !description || isUploading || isMinting}
          className="flex-1 px-6 py-3 bg-linear-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Mint NFT
        </button>
      </div>
    </div>
  );

  const renderProgressStep = () => {
    let message = '';
    let stage = '';

    if (currentStep === 'ipfs') {
      stage = 'Uploading to IPFS';
      if (uploadProgress) {
        message = `${uploadProgress.percentage}% uploaded`;
      } else {
        message = 'Preparing upload...';
      }
    } else if (currentStep === 'mint') {
      stage = 'Minting NFT';
      message = mintProgress?.message || 'Submitting transaction...';
    }

    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <h3 className="text-xl font-semibold text-white mb-2">{stage}</h3>
        <p className="text-slate-400 mb-4">{message}</p>
        {txStatus.hash && (
          <p className="text-sm text-slate-500 font-mono">
            Tx: {txStatus.hash.slice(0, 10)}...{txStatus.hash.slice(-8)}
          </p>
        )}
      </div>
    );
  };

  const renderSuccessStep = () => (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">NFT Minted Successfully!</h3>
      <p className="text-slate-400 mb-4">
        Token ID: #{mintProgress?.tokenId}
      </p>
      {txStatus.hash && (
        <p className="text-sm text-slate-500 font-mono mb-6">
          {txStatus.hash}
        </p>
      )}
      <button
        onClick={handleReset}
        className="px-6 py-3 bg-linear-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all"
      >
        Mint Another NFT
      </button>
    </div>
  );

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Mint Single NFT</h2>

      {currentStep === 'upload' && renderUploadStep()}
      {currentStep === 'metadata' && renderMetadataStep()}
      {(currentStep === 'ipfs' || currentStep === 'mint') && renderProgressStep()}
      {currentStep === 'success' && renderSuccessStep()}
    </div>
  );
}