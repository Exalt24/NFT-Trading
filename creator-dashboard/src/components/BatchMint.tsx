import { useState, useRef, ChangeEvent } from 'react';
import { NFTMetadata } from '../types';
import { useBatchMinting } from '../hooks/useBatchMinting';
import { useWallet } from '../hooks/useWallet';
import {
  createImagePreviews,
  validateBatchImages,
  getTotalFileSize,
  formatFileSize,
  ImageFile,
} from '../utils/imageProcessor';
import {
  parseMetadataCSV,
  generateCSVTemplate,
  validateMetadataCount,
} from '../utils/csvParser';

export function BatchMint() {
  const { wallet } = useWallet();
  const { progress, batchMint, resetProgress } = useBatchMinting();

  const [step, setStep] = useState<'upload' | 'metadata' | 'review' | 'minting'>('upload');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [metadata, setMetadata] = useState<NFTMetadata[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const [metadataSource, setMetadataSource] = useState<'csv' | 'form'>('csv');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setErrors([]);

    const validation = validateBatchImages(files);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const previews = await createImagePreviews(files);
    const invalidPreviews = previews.filter((p) => !p.valid);

    if (invalidPreviews.length > 0) {
      setErrors(invalidPreviews.map((p) => p.error || 'Invalid file'));
      return;
    }

    setImages(previews);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setErrors([]);

    const validation = validateBatchImages(files);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const previews = await createImagePreviews(files);
    setImages(previews);
  };

  const handleCSVUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = parseMetadataCSV(content);

      if (!result.success) {
        setErrors(result.errors);
        return;
      }

      const validationErrors = validateMetadataCount(result.metadata, images.length);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      setMetadata(result.metadata);
      setErrors([]);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate(images.length);
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-metadata-template-${images.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateFormMetadata = () => {
    const newMetadata: NFTMetadata[] = images.map((_, index) => ({
      name: `NFT #${index + 1}`,
      description: `Batch minted NFT #${index + 1}`,
      image: '',
      attributes: [],
    }));
    setMetadata(newMetadata);
  };

  const handleProceedToMetadata = () => {
    if (images.length === 0) {
      setErrors(['Please upload at least one image']);
      return;
    }
    setStep('metadata');
    setErrors([]);
  };

  const handleProceedToReview = () => {
    if (metadata.length === 0) {
      setErrors(['Please provide metadata (upload CSV or generate from form)']);
      return;
    }

    const validationErrors = validateMetadataCount(metadata, images.length);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setStep('review');
    setErrors([]);
  };

  const handleStartMinting = async () => {
    if (!wallet.address) {
      setErrors(['Wallet not connected']);
      return;
    }

    setStep('minting');
    setErrors([]);

    try {
      const files = images.map((img) => img.file);
      await batchMint(files, metadata, wallet.address);
    } catch (error) {
      console.error('Batch mint error:', error);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setImages([]);
    setMetadata([]);
    setErrors([]);
    resetProgress();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  if (step === 'upload') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400 mb-6">
          Batch Mint NFTs
        </h2>

        <div className="bg-dark-card rounded-xl p-6 border border-dark-border mb-6">
          <h3 className="text-xl font-semibold mb-4">Step 1: Upload Images</h3>
          <p className="text-gray-400 mb-4">Upload 1-20 images (JPG, PNG, GIF, WebP, max 10MB each)</p>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center hover:border-purple-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-gray-400 mb-2">
              📁 Drag & drop images here or click to browse
            </div>
            <div className="text-sm text-gray-500">Supported: JPG, PNG, GIF, WebP (max 10MB)</div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageSelect}
            className="hidden"
            aria-label="Upload NFT images"
          />

          {images.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-400">
                  {images.length} image(s) selected ({formatFileSize(getTotalFileSize(images.map((i) => i.file)))})
                </div>
                <button
                  onClick={() => setImages([])}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    {image?.preview && (
                      <>
                        <img
                          src={image.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-700"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">#{index + 1}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded-lg">
              {errors.map((error, index) => (
                <div key={index} className="text-red-400 text-sm">{error}</div>
              ))}
            </div>
          )}

          <button
            onClick={handleProceedToMetadata}
            disabled={images.length === 0}
            className="mt-6 w-full bg-linear-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next: Add Metadata →
          </button>
        </div>
      </div>
    );
  }

  if (step === 'metadata') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400 mb-6">
          Batch Mint NFTs
        </h2>

        <div className="bg-dark-card rounded-xl p-6 border border-dark-border mb-6">
          <h3 className="text-xl font-semibold mb-4">Step 2: Add Metadata</h3>
          <p className="text-gray-400 mb-4">Provide metadata for {images.length} NFTs</p>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setMetadataSource('csv')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                metadataSource === 'csv'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📄 Upload CSV
            </button>
            <button
              onClick={() => setMetadataSource('form')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                metadataSource === 'form'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ✏️ Auto-Generate
            </button>
          </div>

          {metadataSource === 'csv' && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-all"
                >
                  ⬇️ Download CSV Template
                </button>
                <button
                  onClick={() => csvInputRef.current?.click()}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-all"
                >
                  📤 Upload CSV File
                </button>
              </div>

              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
                aria-label="Upload CSV metadata file"
              />

              <div className="text-sm text-gray-400 p-4 bg-gray-800 rounded-lg">
                <strong>CSV Format:</strong>
                <pre className="mt-2 text-xs">name,description,rarity,power,element</pre>
                <div className="mt-2">Required columns: name, description</div>
                <div>Additional columns become attributes</div>
              </div>
            </div>
          )}

          {metadataSource === 'form' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-800 rounded-lg text-sm text-gray-400">
                Auto-generate simple metadata for all {images.length} NFTs:
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Name: "NFT #1", "NFT #2", etc.</li>
                  <li>Description: "Batch minted NFT #X"</li>
                  <li>No attributes</li>
                </ul>
              </div>

              <button
                onClick={generateFormMetadata}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-all"
              >
                Generate Metadata
              </button>
            </div>
          )}

          {metadata.length > 0 && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-500 rounded-lg">
              <div className="text-green-400 font-semibold mb-3">
                ✓ Metadata loaded for {metadata.length} NFT(s)
              </div>
              {metadata[0] && (
                <div className="space-y-2 text-sm">
                  <div className="text-gray-300">
                    <span className="text-gray-500">First NFT:</span> {metadata[0].name}
                  </div>
                  <div className="text-gray-400 truncate">
                    {metadata[0].description}
                  </div>
                  {metadata[0].attributes && metadata[0].attributes.length > 0 && (
                    <div className="text-gray-500 text-xs">
                      {metadata[0].attributes.length} attribute(s)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded-lg">
              {errors.map((error, index) => (
                <div key={index} className="text-red-400 text-sm">{error}</div>
              ))}
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setStep('upload')}
              className="flex-1 bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-all"
            >
              ← Back
            </button>
            <button
              onClick={handleProceedToReview}
              disabled={metadata.length === 0}
              className="flex-1 bg-linear-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next: Review →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400 mb-6">
          Batch Mint NFTs
        </h2>

        <div className="bg-dark-card rounded-xl p-6 border border-dark-border mb-6">
          <h3 className="text-xl font-semibold mb-4">Step 3: Review & Mint</h3>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
              <span className="text-gray-400">Total NFTs:</span>
              <span className="font-semibold">{images.length}</span>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
              <span className="text-gray-400">Total File Size:</span>
              <span className="font-semibold">
                {formatFileSize(getTotalFileSize(images.map((i) => i.file)))}
              </span>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
              <span className="text-gray-400">Minting To:</span>
              <span className="font-semibold font-mono text-sm">
                {wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Not connected'}
              </span>
            </div>
          </div>

          <div className="mb-6 max-h-64 overflow-y-auto">
            <div className="text-sm text-gray-400 mb-2">Preview (first 5 NFTs):</div>
            {metadata.slice(0, 5).map((nft, index) => {
              const imagePreview = images[index];
              if (!imagePreview) return null;
              
              return (
                <div key={index} className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg mb-2">
                  <img
                    src={imagePreview.preview}
                    alt={nft.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">{nft.name}</div>
                    <div className="text-sm text-gray-400 truncate">{nft.description}</div>
                  </div>
                  <div className="text-sm text-gray-500">#{index + 1}</div>
                </div>
              );
            })}
            {metadata.length > 5 && (
              <div className="text-center text-sm text-gray-500">
                ... and {metadata.length - 5} more
              </div>
            )}
          </div>

          {errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded-lg">
              {errors.map((error, index) => (
                <div key={index} className="text-red-400 text-sm">{error}</div>
              ))}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setStep('metadata')}
              className="flex-1 bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-all"
            >
              ← Back
            </button>
            <button
              onClick={handleStartMinting}
              disabled={!wallet.address}
              className="flex-1 bg-linear-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              🚀 Start Batch Mint
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'minting') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400 mb-6">
          Batch Mint NFTs
        </h2>

        <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
          {progress.stage === 'uploading' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">⏳ Uploading to IPFS...</h3>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div
                  className="bg-linear-to-r from-purple-600 to-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.currentStep / progress.totalSteps) * 100}%` }}
                />
              </div>
              <div className="text-center text-gray-400">
                {progress.currentStep} / {progress.totalSteps} uploaded
              </div>
            </div>
          )}

          {progress.stage === 'minting' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">⛏️ Minting NFTs...</h3>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500" />
              </div>
              {progress.transactionHash && (
                <div className="text-sm text-gray-400 text-center break-all">
                  Transaction: {progress.transactionHash}
                </div>
              )}
            </div>
          )}

          {progress.stage === 'success' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-green-400">✅ Batch Mint Successful!</h3>
              <div className="p-4 bg-green-900/20 border border-green-500 rounded-lg">
                <div className="font-semibold mb-2">
                  Minted {progress.mintedTokenIds.length} NFT(s)
                </div>
                <div className="text-sm text-gray-400 space-y-1">
                  {progress.mintedTokenIds.map((tokenId, index) => (
                    <div key={index}>Token ID: #{tokenId}</div>
                  ))}
                </div>
              </div>
              <button
                onClick={handleReset}
                className="w-full bg-linear-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Mint Another Batch
              </button>
            </div>
          )}

          {progress.stage === 'error' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-red-400">❌ Batch Mint Failed</h3>
              <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
                {progress.errors.map((error, index) => (
                  <div key={index} className="text-red-400 text-sm mb-1">{error}</div>
                ))}
              </div>
              <button
                onClick={handleReset}
                className="w-full bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}