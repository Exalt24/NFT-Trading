import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verifying contract ABIs and configuration...\n');

const checks = [];

const gameNFTPath = join(__dirname, '..', 'src', 'abis', 'GameNFT.json');
const marketplacePath = join(__dirname, '..', 'src', 'abis', 'Marketplace.json');

if (existsSync(gameNFTPath)) {
  const gameNFT = JSON.parse(readFileSync(gameNFTPath, 'utf8'));
  if (gameNFT.abi && gameNFT.abi.length > 0) {
    console.log(`✅ GameNFT.json found with ${gameNFT.abi.length} ABI entries`);
    checks.push(true);
  } else {
    console.log('❌ GameNFT.json missing ABI data');
    checks.push(false);
  }
} else {
  console.log('❌ GameNFT.json not found at src/abis/');
  console.log('   Run: copy ..\\contracts\\artifacts\\contracts\\GameNFT.sol\\GameNFT.json src\\abis\\GameNFT.json');
  checks.push(false);
}

if (existsSync(marketplacePath)) {
  const marketplace = JSON.parse(readFileSync(marketplacePath, 'utf8'));
  if (marketplace.abi && marketplace.abi.length > 0) {
    console.log(`✅ Marketplace.json found with ${marketplace.abi.length} ABI entries`);
    checks.push(true);
  } else {
    console.log('❌ Marketplace.json missing ABI data');
    checks.push(false);
  }
} else {
  console.log('❌ Marketplace.json not found at src/abis/');
  console.log('   Run: copy ..\\contracts\\artifacts\\contracts\\Marketplace.sol\\Marketplace.json src\\abis\\Marketplace.json');
  checks.push(false);
}

const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  const nftAddress = envContent.match(/VITE_NFT_CONTRACT_ADDRESS=(0x[a-fA-F0-9]{40})/);
  const marketplaceAddress = envContent.match(/VITE_MARKETPLACE_CONTRACT_ADDRESS=(0x[a-fA-F0-9]{40})/);
  
  if (nftAddress && marketplaceAddress) {
    console.log('✅ Contract addresses configured in .env');
    checks.push(true);
  } else {
    console.log('❌ Contract addresses missing or invalid in .env');
    console.log('   Run contract deployment: cd ..\\contracts && npm run deploy');
    checks.push(false);
  }
} else {
  console.log('❌ .env file not found');
  checks.push(false);
}

console.log('\n' + '='.repeat(50));

if (checks.every(check => check)) {
  console.log('✨ All checks passed! Ready for wallet connection.\n');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Fix the issues above.\n');
  process.exit(1);
}