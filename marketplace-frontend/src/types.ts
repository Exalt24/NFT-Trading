/** Shapes the API returns after `toCamelCase` in services/api.ts, plus the UI-only state types. */

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

export interface NFTMetadata {
  name: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: NFTAttribute[];
  [key: string]: unknown;
}

/**
 * An NFT as the API returns it. Only `tokenId` and `owner` are always present: App.tsx builds a
 * placeholder (tokenURI, nftContract) for a listing whose NFT has not loaded yet.
 */
export interface NFT {
  tokenId: number;
  owner: string;
  tokenUri?: string;
  tokenURI?: string;
  nftContract?: string;
  ipfsCid?: string | null;
  metadata?: NFTMetadata | null;
  image?: string;
  name?: string;
  royaltyReceiver?: string | null;
  royaltyAmount?: number | null;
  mintedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Listing {
  id: number;
  nftContract: string;
  tokenId: number;
  seller: string;
  price: string;
  active: boolean;
  listedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TradingHistory {
  id: number;
  nftContract: string;
  tokenId: number;
  seller: string;
  buyer: string;
  price: string;
  platformFee: string;
  royaltyFee: string;
  transactionHash: string | null;
  soldAt: string | null;
  createdAt: string;
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

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  balance: string | null;
}

export type WebSocketEventType =
  | 'nftMinted'
  | 'nftTransferred'
  | 'nftListed'
  | 'nftSold'
  | 'nftCancelled'
  | 'priceUpdated'
  | 'defaultRoyaltyUpdated'
  | 'tokenRoyaltyUpdated';

export interface WebSocketEvent {
  type: WebSocketEventType;
  tokenId: number;
  timestamp: number;
  blockNumber: number;
  data: any;
}

export type SortOption = 'price-asc' | 'price-desc' | 'recent' | 'tokenId-asc' | 'tokenId-desc';

export interface FilterState {
  priceRange: { min?: number | undefined; max?: number | undefined };
  statuses: Set<string>;
  traits: Map<string, Set<string>>;
  sortBy: SortOption;
}

export type TransactionStatus = 'idle' | 'pending' | 'success' | 'error';

export interface TransactionState {
  status: TransactionStatus;
  hash?: string | undefined;
  error?: string | undefined;
}
