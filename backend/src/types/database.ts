export type { NFTMetadata } from './nft.js';

/** A row of `nfts` (migrations/001_nft_tables.sql). */
export interface NFTRow {
  token_id: number;
  owner: string;
  token_uri: string;
  ipfs_cid: string | null;
  metadata: Record<string, unknown> | null;
  royalty_receiver: string | null;
  royalty_amount: number | null;
  minted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** A row of `marketplace_listings`. Prices are TEXT in the database so large wei values never lose precision. */
export interface MarketplaceListingRow {
  id: number;
  nft_contract: string;
  token_id: number;
  seller: string;
  price: string;
  active: boolean;
  listed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** A row of `trading_history`. */
export interface TradingHistoryRow {
  id: number;
  nft_contract: string;
  token_id: number;
  seller: string;
  buyer: string;
  price: string;
  platform_fee: string;
  royalty_fee: string;
  transaction_hash: string | null;
  sold_at: Date | null;
  created_at: Date;
}

export interface PlatformStats {
  totalSales: number;
  totalVolume: string;
  uniqueTraders: number;
  avgPrice: string;
  floorPrice: string;
  highestSale: string;
}

export interface Trader {
  address: string;
  tradesCount: number;
  totalVolume: string;
  avgPrice: string;
}

export interface VolumeData {
  date: string;
  volume: string;
  salesCount: number;
}

export interface Sale {
  tokenId: number;
  price: string;
  seller: string;
  buyer: string;
  soldAt: Date | null;
  transactionHash: string;
}
