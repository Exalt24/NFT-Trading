import { network } from 'hardhat';
import { writeFileSync, readFileSync, existsSync } from 'fs';
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
  const { ethers } = await network.connect();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  console.log('🚀 Deploying NFT Trading Game Contracts...\n');
  
  const [deployer] = await ethers.getSigners();
  console.log('📝 Deploying with account:', deployer.address);
  console.log('💰 Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH');
  console.log('⛓️  Chain ID:', chainId.toString(), '\n');

  console.log('⏳ Deploying GameNFT...');
  const GameNFTFactory = await ethers.getContractFactory('GameNFT');
  const gameNFT = await GameNFTFactory.deploy(deployer.address);
  await gameNFT.waitForDeployment();
  const gameNFTAddress = await gameNFT.getAddress();
  console.log('✅ GameNFT deployed to:', gameNFTAddress);

  console.log('\n⏳ Deploying Marketplace...');
  const MarketplaceFactory = await ethers.getContractFactory('Marketplace');
  const marketplace = await MarketplaceFactory.deploy(deployer.address);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log('✅ Marketplace deployed to:', marketplaceAddress);

  const deploymentInfo = {
    chainId: chainId.toString(),
    deployer: deployer.address,
    contracts: {
      GameNFT: gameNFTAddress,
      Marketplace: marketplaceAddress,
    },
    timestamp: new Date().toISOString(),
  };

  const outputPath = join(process.cwd(), 'deployments.json');
  writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log('\n📄 Deployment info saved to deployments.json');
  console.log('\n📋 Contract Addresses:');
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

  console.log('\n✨ Deployment complete!\n');
  console.log('📋 Next steps:');
  console.log('   1. Keep Hardhat node running in Terminal 1');
  console.log('   2. Start backend: cd ../backend && npm run dev');
  console.log('   3. Start marketplace: cd ../marketplace-frontend && npm run dev');
  console.log('   4. Start creator dashboard: cd ../creator-dashboard && npm run dev\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });