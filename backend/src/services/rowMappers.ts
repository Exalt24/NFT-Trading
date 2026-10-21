import type { Nft, MarketplaceListing, TradingHistory } from '../generated/prisma/client.js';
import type { NFTRow, MarketplaceListingRow, TradingHistoryRow } from '../types/database.js';

// Prisma returns camelCase models. The services keep returning the snake_case row types their callers (the REST routes and
// the indexer) were written against, so these three functions are the only place the two shapes meet.
// created_at and updated_at are nullable columns with DEFAULT NOW() that no code path ever sets to NULL, which is why the row
// types can keep calling them Date.

export function toNFTRow(nft: Nft): NFTRow {
  return {
    token_id: nft.tokenId,
    owner: nft.owner,
    token_uri: nft.tokenUri,
    ipfs_cid: nft.ipfsCid,
    metadata: nft.metadata as Record<string, unknown> | null,
    royalty_receiver: nft.royaltyReceiver,
    royalty_amount: nft.royaltyAmount,
    minted_at: nft.mintedAt,
    created_at: nft.createdAt as Date,
    updated_at: nft.updatedAt as Date,
  };
}

export function toListingRow(listing: MarketplaceListing): MarketplaceListingRow {
  return {
    id: listing.id,
    nft_contract: listing.nftContract,
    token_id: listing.tokenId,
    seller: listing.seller,
    price: listing.price,
    active: listing.active as boolean,
    listed_at: listing.listedAt,
    created_at: listing.createdAt as Date,
    updated_at: listing.updatedAt as Date,
  };
}

export function toHistoryRow(sale: TradingHistory): TradingHistoryRow {
  return {
    id: sale.id,
    nft_contract: sale.nftContract,
    token_id: sale.tokenId,
    seller: sale.seller,
    buyer: sale.buyer,
    price: sale.price,
    platform_fee: sale.platformFee,
    royalty_fee: sale.royaltyFee,
    transaction_hash: sale.transactionHash,
    sold_at: sale.soldAt,
    created_at: sale.createdAt as Date,
  };
}
