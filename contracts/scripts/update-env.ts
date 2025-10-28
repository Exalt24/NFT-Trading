import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function updateEnvFile(
  envPath: string,
  contractAddress: string,
  envName: string,
  variableName: string
): void {
  if (existsSync(envPath)) {
    let envContent = readFileSync(envPath, 'utf8');
    
    const pattern = new RegExp(`${variableName}=.*`);
    if (envContent.includes(`${variableName}=`)) {
      envContent = envContent.replace(pattern, `${variableName}=${contractAddress}`);
    } else {
      envContent += `\n${variableName}=${contractAddress}\n`;
    }
    
    writeFileSync(envPath, envContent);
    console.log(`   ✅ Updated ${envName} -> ${variableName}`);
  } else {
    console.warn(`   ⚠️  ${envName} not found, creating from template...`);
    const templatePath = join(dirname(envPath), '.env.example');
    let envContent = '';
    
    if (existsSync(templatePath)) {
      envContent = readFileSync(templatePath, 'utf8');
      const pattern = new RegExp(`${variableName}=.*`);
      if (envContent.includes(`${variableName}=`)) {
        envContent = envContent.replace(pattern, `${variableName}=${contractAddress}`);
      } else {
        envContent += `\n${variableName}=${contractAddress}\n`;
      }
    } else {
      envContent = `${variableName}=${contractAddress}\n`;
    }
    
    writeFileSync(envPath, envContent);
    console.log(`   ✅ Created ${envName} -> ${variableName}`);
  }
}

async function main() {
  console.log('📝 Reading Ignition deployment artifacts...\n');
  
  const deploymentPath = join(__dirname, '../ignition/deployments/chain-31338/deployed_addresses.json');
  
  if (!existsSync(deploymentPath)) {
    console.error('❌ Deployment artifacts not found!');
    console.error('   Run: npm run deploy');
    console.error('   Then run this script again.\n');
    process.exit(1);
  }

  const deployedAddresses = JSON.parse(readFileSync(deploymentPath, 'utf8'));
  
  // Try multiple possible key patterns
  let gameNFTAddress = 
    deployedAddresses['DeployAllModule#GameNFT'] ||
    deployedAddresses['GameNFTModule#GameNFT'];
    
  let marketplaceAddress = 
    deployedAddresses['DeployAllModule#Marketplace'] ||
    deployedAddresses['MarketplaceModule#Marketplace'];
  
  if (!gameNFTAddress || !marketplaceAddress) {
    console.error('❌ Contract addresses not found in deployment artifacts!');
    console.error('   Available keys:', Object.keys(deployedAddresses));
    console.error('   Looking for:');
    console.error('     - DeployAllModule#GameNFT or GameNFTModule#GameNFT');
    console.error('     - DeployAllModule#Marketplace or MarketplaceModule#Marketplace');
    process.exit(1);
  }

  console.log('📍 Found contract addresses:');
  console.log('   GameNFT:     ', gameNFTAddress);
  console.log('   Marketplace: ', marketplaceAddress);
  console.log('\n🔄 Updating environment files...\n');

  const backendEnvPath = join(__dirname, '../../backend/.env');
  const marketplaceFrontendEnvPath = join(__dirname, '../../marketplace-frontend/.env');
  const creatorDashboardEnvPath = join(__dirname, '../../creator-dashboard/.env');

  updateEnvFile(backendEnvPath, gameNFTAddress, 'backend/.env', 'NFT_CONTRACT_ADDRESS');
  updateEnvFile(backendEnvPath, marketplaceAddress, 'backend/.env', 'MARKETPLACE_CONTRACT_ADDRESS');

  updateEnvFile(marketplaceFrontendEnvPath, gameNFTAddress, 'marketplace-frontend/.env', 'VITE_NFT_CONTRACT_ADDRESS');
  updateEnvFile(marketplaceFrontendEnvPath, marketplaceAddress, 'marketplace-frontend/.env', 'VITE_MARKETPLACE_CONTRACT_ADDRESS');

  updateEnvFile(creatorDashboardEnvPath, gameNFTAddress, 'creator-dashboard/.env', 'VITE_NFT_CONTRACT_ADDRESS');
  updateEnvFile(creatorDashboardEnvPath, marketplaceAddress, 'creator-dashboard/.env', 'VITE_MARKETPLACE_CONTRACT_ADDRESS');

  console.log('\n✅ All environment files updated!\n');
  console.log('📋 Next steps:');
  console.log('   1. Keep Hardhat node running');
  console.log('   2. Restart backend if running: cd ../backend && npm run dev');
  console.log('   3. Start marketplace: cd ../marketplace-frontend && npm run dev');
  console.log('   4. Start creator dashboard: cd ../creator-dashboard && npm run dev\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });