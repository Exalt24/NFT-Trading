import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '4000'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432'),
  DB_NAME: process.env.DB_NAME || 'nft_marketplace',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  
  RPC_URL: process.env.RPC_URL || 'http://127.0.0.1:8545',
  NFT_CONTRACT_ADDRESS: process.env.NFT_CONTRACT_ADDRESS || '',
  MARKETPLACE_CONTRACT_ADDRESS: process.env.MARKETPLACE_CONTRACT_ADDRESS || '',
  CHAIN_ID: parseInt(process.env.CHAIN_ID || '31338'),
  START_BLOCK: parseInt(process.env.START_BLOCK || '0'),
  
  PINATA_JWT: process.env.PINATA_JWT || '',
  PINATA_GATEWAY: process.env.PINATA_GATEWAY || '',
};