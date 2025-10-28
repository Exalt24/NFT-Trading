export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const WS_URL = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:4000';

export const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;
export const MARKETPLACE_CONTRACT_ADDRESS = import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS;

export const CHAIN_ID = 31338;
export const CHAIN_NAME = 'Localhost';

export const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
export const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

export const ITEMS_PER_PAGE = 20;
export const MAX_PRICE_DIGITS = 18;

export const STATUS_COLORS = {
  listed: 'text-green-400',
  unlisted: 'text-gray-400',
  sold: 'text-blue-400',
} as const;

export const EVENT_TYPES = {
  MINTED: 'nftMinted',
  TRANSFERRED: 'nftTransferred',
  LISTED: 'nftListed',
  SOLD: 'nftSold',
  CANCELLED: 'nftCancelled',
  PRICE_UPDATED: 'priceUpdated',
} as const;

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Listed' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'token-asc', label: 'Token ID: Low to High' },
  { value: 'token-desc', label: 'Token ID: High to Low' },
] as const;

export const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under 0.1 ETH', min: 0, max: 0.1 },
  { label: '0.1 - 0.5 ETH', min: 0.1, max: 0.5 },
  { label: '0.5 - 1 ETH', min: 0.5, max: 1 },
  { label: '1 - 5 ETH', min: 1, max: 5 },
  { label: 'Over 5 ETH', min: 5, max: Infinity },
] as const;

export const TX_STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet',
  INSUFFICIENT_FUNDS: 'Insufficient funds',
  USER_REJECTED: 'Transaction rejected by user',
  NETWORK_ERROR: 'Network error, please try again',
  INVALID_PRICE: 'Invalid price',
  NOT_OWNER: 'You are not the owner of this NFT',
  NOT_APPROVED: 'NFT not approved for marketplace',
  ALREADY_LISTED: 'NFT is already listed',
  NOT_LISTED: 'NFT is not listed',
} as const;