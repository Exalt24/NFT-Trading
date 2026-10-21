import dotenv from 'dotenv';
import { resolveDatabaseUrl } from './databaseUrl.js';

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '4000'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  // DATABASE_URL, or the older DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD variables (see databaseUrl.ts).
  DATABASE_URL: resolveDatabaseUrl(),

  RPC_URL: process.env.RPC_URL || 'http://127.0.0.1:8545',
  NFT_CONTRACT_ADDRESS: process.env.NFT_CONTRACT_ADDRESS || '',
  MARKETPLACE_CONTRACT_ADDRESS: process.env.MARKETPLACE_CONTRACT_ADDRESS || '',
  CHAIN_ID: parseInt(process.env.CHAIN_ID || '31337'),
  START_BLOCK: parseInt(process.env.START_BLOCK || '0'),

  PINATA_JWT: process.env.PINATA_JWT || '',
  PINATA_GATEWAY: process.env.PINATA_GATEWAY || '',
};
