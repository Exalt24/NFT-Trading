import { JsonRpcProvider, Contract } from 'ethers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';

// Get __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate environment variables
if (!env.NFT_CONTRACT_ADDRESS) {
  throw new Error('NFT_CONTRACT_ADDRESS not set in environment');
}

if (!env.MARKETPLACE_CONTRACT_ADDRESS) {
  throw new Error('MARKETPLACE_CONTRACT_ADDRESS not set in environment');
}

// Create provider
export const provider = new JsonRpcProvider(env.RPC_URL);

// Load ABI from backend/abis/ folder (copied by deployment script)
function loadABI(contractName: string): any[] {
  const artifactPath = join(__dirname, '..', '..', 'abis', `${contractName}.json`);
  
  try {
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
    // Handle both full artifact format and ABI-only format
    return artifact.abi || artifact;
  } catch (error: any) {
    console.error(`❌ Failed to load ABI for ${contractName} from ${artifactPath}:`, error.message);
    throw new Error(`Could not load ABI for ${contractName}. Make sure contracts are deployed and ABIs are copied.`);
  }
}

// Load ABIs
const gameNFTABI = loadABI('GameNFT');
const marketplaceABI = loadABI('Marketplace');

// Create contract instances
export const nftContract = new Contract(
  env.NFT_CONTRACT_ADDRESS,
  gameNFTABI,
  provider
);

export const marketplaceContract = new Contract(
  env.MARKETPLACE_CONTRACT_ADDRESS,
  marketplaceABI,
  provider
);

// Test blockchain connection
export async function testBlockchainConnection(): Promise<boolean> {
  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
   
    if (Number(network.chainId) !== env.CHAIN_ID) {
      console.error(`❌ Chain ID mismatch: expected ${env.CHAIN_ID}, got ${network.chainId}`);
      return false;
    }
   
    console.log(`✅ Blockchain connected: Chain ID ${network.chainId}, Block #${blockNumber}`);
   
    const nftName = await nftContract.name();
    const nftSymbol = await nftContract.symbol();
    console.log(`✅ GameNFT contract connected: ${nftName} (${nftSymbol})`);
   
    return true;
  } catch (error) {
    console.error('❌ Blockchain connection failed:', error);
    return false;
  }
}

export { env as blockchainEnv };