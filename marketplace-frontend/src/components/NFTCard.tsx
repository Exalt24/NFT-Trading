import { NFTImage } from './NFTImage';
import { formatAddress, formatPriceFromDB } from '../utils/formatters';
import type { NFT, Listing } from '../types';

interface NFTCardProps {
  nft: NFT;
  listing?: Listing | null;
  onClick?: () => void;
}

export function NFTCard({ nft, listing, onClick }: NFTCardProps) {
  const isListed = listing && listing.active;
 
  if (!nft || nft.tokenId === undefined) {
    console.warn('NFTCard received invalid nft data:', nft);
    return null;
  }

  const name = nft.metadata?.name || `NFT #${nft.tokenId}`;
  const description = nft.metadata?.description;
  const hasAttributes = nft.metadata?.attributes && nft.metadata.attributes.length > 0;

  return (
    <div
      onClick={onClick}
      className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer group flex flex-col"
      style={{ height: '480px' }}
    >
      {/* Image Section - Fixed aspect ratio */}
      <div className="aspect-square overflow-hidden shrink-0">
        <NFTImage
          imageUri={nft.metadata?.image}
          tokenId={nft.tokenId}
          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
        />
      </div>
     
      {/* Content Section */}
      <div className="p-4 flex flex-col grow">
        {/* Title and Token ID */}
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate" title={name}>
              {name}
            </h3>
          </div>
          <span className="text-xs text-slate-500 shrink-0">#{nft.tokenId}</span>
        </div>

        {/* Description - 2 lines fixed */}
        <div className="h-8 mb-2">
          {description ? (
            <p className="text-xs text-slate-400 line-clamp-2" title={description}>
              {description}
            </p>
          ) : (
            <p className="text-xs text-slate-500 italic">No description</p>
          )}
        </div>

        {/* Owner Section */}
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-400">Owner</span>
          <span className="text-slate-300 font-mono text-xs">
            {formatAddress(nft.owner)}
          </span>
        </div>

        {/* Price Section */}
        {isListed ? (
          <div className="flex items-center justify-between pt-2 border-t border-slate-700 mb-2">
            <span className="text-slate-400 text-sm">Price</span>
            <div className="flex items-center gap-1">
              <span className="text-green-400 font-semibold">
                {formatPriceFromDB(listing.price)}
              </span>
              <span className="text-green-400 text-xs">ETH</span>
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-700 mb-2">
            <span className="text-slate-500 text-sm">Not Listed</span>
          </div>
        )}

        {/* Attributes - 2 lines fixed at bottom */}
        <div className="mt-auto h-8">
          {hasAttributes && nft.metadata?.attributes ? (
            <div className="flex flex-wrap gap-1">
              {nft.metadata.attributes.slice(0, 2).map((attr, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-slate-700 px-2 py-1 rounded truncate max-w-[120px]"
                  title={`${attr.trait_type}: ${attr.value}`}
                >
                  {attr.trait_type}: {attr.value}
                </span>
              ))}
              {nft.metadata.attributes.length > 2 && (
                <span className="text-xs text-slate-500 px-2 py-1">
                  +{nft.metadata.attributes.length - 2} more
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic">No attributes</div>
          )}
        </div>
      </div>
    </div>
  );
}