/** Shapes shared across the creator dashboard. API data passes through `snakeToCamel` in services/api.ts. */

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image?: string;
  external_url?: string;
  attributes?: NFTAttribute[];
}

export interface MintedNFT {
  tokenId: number;
  owner: string;
  tokenUri?: string;
  tokenURI?: string;
  ipfsCid?: string | null;
  metadata?: NFTMetadata | null;
  royaltyReceiver?: string | null;
  royaltyAmount?: number | null;
  royalty_amount?: number | null;
  mintedAt?: string | null;
  minted_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TradingHistory {
  id?: number;
  nftContract?: string;
  tokenId: number;
  seller: string;
  buyer: string;
  price: string;
  platformFee?: string;
  royaltyFee?: string;
  transactionHash?: string | null;
  soldAt?: string | null;
  sold_at?: string | null;
}

export interface CreatorStats {
  totalMinted: number;
  totalListed: number;
  totalSold: number;
  totalRevenue: string;
  totalRoyalties: string;
  avgPrice: string;
  floorPrice: string;
}

export interface MintingActivity {
  date: string;
  count: number;
}

export interface RoyaltyEarning {
  date: string;
  amount: string;
}

export interface SaleByNFT {
  tokenId: number;
  name?: string;
  sales: number;
  revenue: string;
}

export interface RoyaltyInfo {
  receiver: string;
  amount: number;
}

export interface IPFSUploadResult {
  cid: string;
  url: string;
  gateway_url: string;
}

export interface ImageUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface MintProgress {
  stage: 'idle' | 'uploading' | 'minting' | 'complete' | 'error';
  message: string;
  tokenId?: number;
  error?: string;
}

export interface TransactionStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  hash?: string;
  error?: string;
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isOwner: boolean;
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
