export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const CONTRACT_ADDRESSES = {
  NFT: import.meta.env.VITE_NFT_CONTRACT_ADDRESS,
  MARKETPLACE: import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS
} as const;

export const IPFS_CONFIG = {
  JWT: import.meta.env.VITE_PINATA_JWT,
  GATEWAY: import.meta.env.VITE_PINATA_GATEWAY || 'gateway.pinata.cloud'
} as const;

export const IPFS_GATEWAYS = [
  `https://${IPFS_CONFIG.GATEWAY}/ipfs/`,
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/'
] as const;

export const CHAIN_CONFIG = {
  CHAIN_ID: 31338,
  CHAIN_NAME: 'Hardhat Local',
  RPC_URL: 'http://127.0.0.1:8545'
} as const;

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10 MB
  ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ACCEPTED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
} as const;

export const BATCH_MINT = {
  MAX_ITEMS: 20,
  MIN_ITEMS: 1
} as const;

export const ROYALTY = {
  DEFAULT_BASIS_POINTS: 250, // 2.5%
  MIN_BASIS_POINTS: 0,
  MAX_BASIS_POINTS: 1000, // 10%
} as const;

export const PRICE_LIMITS = {
  MIN: '0.000001',
  MAX: '1000000'
} as const;

export const PAGINATION = {
  ITEMS_PER_PAGE: 20,
  MAX_ITEMS: 100
} as const;

export const DEBOUNCE_DELAY = 300; // ms

export const TRANSACTION_TIMEOUT = 300000; // 5 minutes

export const TOAST_DURATION = 5000; // ms

export const MAX_ATTRIBUTES = 20;

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All NFTs' },
  { value: 'listed', label: 'Listed' },
  { value: 'sold', label: 'Sold' },
  { value: 'owned', label: 'Owned by Me' }
] as const;

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Minted' },
  { value: 'tokenId', label: 'Token ID' },
  { value: 'price', label: 'Price' }
] as const;

export const TIME_RANGES = [
  { value: 7, label: '7 Days' },
  { value: 30, label: '30 Days' },
  { value: 90, label: '90 Days' },
  { value: 365, label: '1 Year' }
] as const;

export const CSV_TEMPLATE_HEADERS = [
  'name',
  'description',
  'trait_type_1',
  'value_1',
  'trait_type_2',
  'value_2',
  'trait_type_3',
  'value_3'
] as const;

export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet',
  WALLET_NOT_OWNER: 'Only contract owner can mint NFTs',
  INVALID_NETWORK: 'Please switch to Hardhat Local network',
  FILE_TOO_LARGE: 'File size exceeds 10 MB',
  INVALID_FILE_TYPE: 'Invalid file type. Accepted: JPG, PNG, GIF, WebP',
  IPFS_UPLOAD_FAILED: 'Failed to upload to IPFS',
  MINT_FAILED: 'Minting failed',
  BATCH_TOO_LARGE: `Maximum ${BATCH_MINT.MAX_ITEMS} NFTs per batch`,
  INVALID_PRICE: 'Invalid price value',
  TRANSACTION_FAILED: 'Transaction failed',
  APPROVAL_FAILED: 'Approval failed',
  ROYALTY_TOO_HIGH: 'Maximum royalty is 10%'
} as const;

export const SUCCESS_MESSAGES = {
  MINT_SUCCESS: 'NFT minted successfully!',
  BATCH_MINT_SUCCESS: 'Batch minting completed!',
  ROYALTY_UPDATED: 'Royalty settings updated',
  IPFS_UPLOAD_SUCCESS: 'Uploaded to IPFS'
} as const;