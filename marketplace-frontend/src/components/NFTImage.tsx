import { useIPFSImage } from '../hooks/useIPFS';

interface NFTImageProps {
  imageUri?: string;
  tokenId: number;
  className?: string;
}

export function NFTImage({ imageUri, tokenId, className = '' }: NFTImageProps) {
  const { imageUrl, loading, error } = useIPFSImage(imageUri);

  if (loading) {
    return (
      <div className={`bg-slate-700 flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="text-xs text-slate-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`bg-linear-to-br from-slate-700 to-slate-800 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-5xl mb-2">🖼️</div>
          <div className="text-xs text-slate-400">NFT #{tokenId}</div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={`NFT #${tokenId}`}
      className={`object-cover ${className}`}
      loading="lazy"
    />
  );
}