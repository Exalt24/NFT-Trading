import { ethers, Contract, JsonRpcProvider } from 'ethers';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment from backend/.env (for contracts and API)
dotenv.config({ path: resolve(__dirname, '../../backend/.env') });

// Configuration
export const config = {
  rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
  apiUrl: 'http://localhost:4000/api', // Always use localhost for tests
  wsUrl: 'http://localhost:4000',
  nftAddress: process.env.NFT_CONTRACT_ADDRESS || '',
  marketplaceAddress: process.env.MARKETPLACE_CONTRACT_ADDRESS || '',
  chainId: parseInt(process.env.CHAIN_ID || '31338'),
};

// Provider
export const provider = new JsonRpcProvider(config.rpcUrl);

// Load contract ABIs
function loadContractABI(contractName: string) {
  const artifactPath = resolve(__dirname, `../../contracts/artifacts/contracts/${contractName}.sol/${contractName}.json`);
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
  return artifact.abi;
}

const NFT_ABI = loadContractABI('GameNFT');
const MARKETPLACE_ABI = loadContractABI('Marketplace');

// Get signer
export async function getSigner(index: number = 0) {
  return await provider.getSigner(index);
}

// Get contracts
export async function getNFTContract(withSigner: boolean = false) {
  if (withSigner) {
    const signer = await getSigner();
    return new Contract(config.nftAddress, NFT_ABI, signer);
  }
  return new Contract(config.nftAddress, NFT_ABI, provider);
}

export async function getMarketplaceContract(withSigner: boolean = false) {
  if (withSigner) {
    const signer = await getSigner();
    return new Contract(config.marketplaceAddress, MARKETPLACE_ABI, signer);
  }
  return new Contract(config.marketplaceAddress, MARKETPLACE_ABI, provider);
}

// Wait for transaction confirmation
export async function waitForConfirmation(tx: any, confirmations: number = 1) {
  console.log(`  ⏳ Waiting for ${confirmations} confirmation(s)...`);
  const receipt = await tx.wait(confirmations);
  console.log(`  ✅ Confirmed in block ${receipt.blockNumber}`);
  return receipt;
}

// Extract token ID from mint receipt
export function extractTokenIdFromReceipt(receipt: any, nftContract: Contract): number {
  const mintedEvent = receipt?.logs.find((log: any) => {
    try {
      const parsed = nftContract.interface.parseLog({
        topics: [...log.topics],
        data: log.data
      });
      return parsed?.name === 'Minted';
    } catch {
      return false;
    }
  });

  if (mintedEvent) {
    const parsed = nftContract.interface.parseLog({
      topics: [...mintedEvent.topics],
      data: mintedEvent.data
    });
    return Number(parsed?.args[0]);
  }

  throw new Error('Could not extract token ID from receipt');
}

// Sleep helper
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  
  return obj;
}

// API helpers with snake_case to camelCase conversion
export async function apiGet(endpoint: string): Promise<any> {
  const url = `${config.apiUrl}${endpoint}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return toCamelCase(data); // Convert snake_case to camelCase
  } catch (error: any) {
    throw new Error(`API GET ${endpoint} failed: ${error.message}`);
  }
}

export async function apiGetWithRetry(
  endpoint: string, 
  maxRetries: number = 5, 
  delayMs: number = 4000  // INCREASED from 3000 to 4000
): Promise<any> {
  const url = `${config.apiUrl}${endpoint}`;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  🔍 Attempt ${attempt}/${maxRetries}: GET ${endpoint}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404 && attempt < maxRetries) {
          console.log(`  ⏳ Not found yet, retrying in ${delayMs}ms...`);
          await sleep(delayMs);
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Verify data is not empty/null
      if (!data) {
        if (attempt < maxRetries) {
          console.log(`  ⏳ Data not ready, retrying in ${delayMs}ms...`);
          await sleep(delayMs);
          continue;
        }
        throw new Error('Data is null or undefined after all retries');
      }
      
      console.log(`  ✅ Data retrieved successfully`);
      return toCamelCase(data); // Convert snake_case to camelCase
      
    } catch (error: any) {
      if (attempt === maxRetries) {
        throw new Error(`API GET ${endpoint} failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      console.log(`  ⚠️  Attempt ${attempt} failed: ${error.message}`);
      console.log(`  ⏳ Retrying in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }
  
  throw new Error(`API GET ${endpoint} failed after ${maxRetries} retries`);
}

// Assertion helper
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

// Logging helpers
export function logSection(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

export function logStep(step: string): void {
  console.log(`\n📍 ${step}`);
}

// Verify configuration
export function verifyConfig(): void {
  if (!config.nftAddress || !config.marketplaceAddress) {
    throw new Error('Contract addresses not configured. Run deployment first.');
  }
  
  if (!config.rpcUrl) {
    throw new Error('RPC_URL not configured');
  }
  
  console.log('✅ Configuration verified');
  console.log(`   RPC: ${config.rpcUrl}`);
  console.log(`   API: ${config.apiUrl}`);
  console.log(`   NFT: ${config.nftAddress}`);
  console.log(`   Marketplace: ${config.marketplaceAddress}`);
}