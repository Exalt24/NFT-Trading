import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

interface DeploymentAddresses {
  gameNFT: string;
  marketplace: string;
}

async function deployContracts(): Promise<void> {
  console.log('🚀 Deploying contracts inside Hardhat container using Ignition...\n');

  try {
    const { stdout, stderr } = await execAsync(
      'docker exec nft-marketplace-hardhat sh -c "echo y | npx hardhat ignition deploy ignition/modules/DeployAll.ts --network localhost"',
      { maxBuffer: 1024 * 1024 * 10 }
    );

    console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('✅ Contracts deployed successfully\n');

  } catch (error: any) {
    console.error('❌ Contract deployment failed:', error.message);
    throw error;
  }
}

async function copyABIsFromContainer(): Promise<void> {
  console.log('📋 Copying fresh ABIs from Hardhat container...\n');

  const abis = [
    { contract: 'GameNFT', path: '/app/artifacts/contracts/GameNFT.sol/GameNFT.json' },
    { contract: 'Marketplace', path: '/app/artifacts/contracts/Marketplace.sol/Marketplace.json' },
  ];

  const frontendPaths = [
    join(process.cwd(), 'marketplace-frontend', 'src', 'abis'),
    join(process.cwd(), 'creator-dashboard', 'src', 'abis'),
    join(process.cwd(), 'backend', 'abis'),  // Backend will see this via volume mount
  ];

  // Ensure ABI directories exist on HOST
  frontendPaths.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });

  for (const abi of abis) {
    try {
      // Copy ABI from Hardhat container
      const { stdout } = await execAsync(
        `docker exec nft-marketplace-hardhat cat ${abi.path}`
      );

      // Save to HOST folders (backend will see via volume mount)
      for (const frontendPath of frontendPaths) {
        const destPath = join(frontendPath, `${abi.contract}.json`);
        writeFileSync(destPath, stdout);
        console.log(`✅ Copied ${abi.contract}.json to ${frontendPath}`);
      }

      // REMOVED: docker cp logic - not needed with volume mount

    } catch (error: any) {
      console.warn(`⚠️  Could not copy ${abi.contract} ABI: ${error.message}`);
    }
  }

  console.log('');
}

async function getDeployedAddresses(): Promise<DeploymentAddresses> {
  console.log('📝 Reading deployment addresses from Ignition artifacts...\n');

  try {
    const { stdout } = await execAsync(
      'docker exec nft-marketplace-hardhat cat /app/ignition/deployments/chain-31338/deployed_addresses.json'
    );

    const deployedAddresses = JSON.parse(stdout);

    const gameNFTAddress = 
      deployedAddresses['DeployAllModule#GameNFT'] ||
      deployedAddresses['GameNFTModule#GameNFT'];
      
    const marketplaceAddress = 
      deployedAddresses['DeployAllModule#Marketplace'] ||
      deployedAddresses['MarketplaceModule#Marketplace'];

    if (!gameNFTAddress || !marketplaceAddress) {
      console.error('Available keys:', Object.keys(deployedAddresses));
      throw new Error('Contract addresses not found in deployment artifacts');
    }

    console.log('📍 Contract addresses:');
    console.log(`   GameNFT:     ${gameNFTAddress}`);
    console.log(`   Marketplace: ${marketplaceAddress}\n`);

    return {
      gameNFT: gameNFTAddress,
      marketplace: marketplaceAddress,
    };

  } catch (error: any) {
    console.error('❌ Failed to read deployment addresses:', error.message);
    throw error;
  }
}

function updateEnvFile(path: string, name: string, nftAddress: string, marketplaceAddress: string, prefix: string = ''): void {
  try {
    let content = readFileSync(path, 'utf8');
    
    const nftVar = `${prefix}NFT_CONTRACT_ADDRESS`;
    const marketplaceVar = `${prefix}MARKETPLACE_CONTRACT_ADDRESS`;

    const nftPattern = new RegExp(`${nftVar}=.*`, 'g');
    const marketplacePattern = new RegExp(`${marketplaceVar}=.*`, 'g');

    if (content.includes(`${nftVar}=`)) {
      content = content.replace(nftPattern, `${nftVar}=${nftAddress}`);
    } else {
      content += `\n${nftVar}=${nftAddress}`;
    }

    if (content.includes(`${marketplaceVar}=`)) {
      content = content.replace(marketplacePattern, `${marketplaceVar}=${marketplaceAddress}`);
    } else {
      content += `\n${marketplaceVar}=${marketplaceAddress}`;
    }

    writeFileSync(path, content);
    console.log(`✅ Updated ${name}`);
  } catch (error: any) {
    console.warn(`⚠️  Could not update ${name}: ${error.message}`);
  }
}

async function updateHostEnvFiles(addresses: DeploymentAddresses): Promise<void> {
  console.log('🔄 Updating .env files on host machine...\n');

  const rootEnvPath = join(process.cwd(), '.env');
  const backendEnvPath = join(process.cwd(), 'backend', '.env');
  const marketplaceEnvPath = join(process.cwd(), 'marketplace-frontend', '.env');
  const creatorEnvPath = join(process.cwd(), 'creator-dashboard', '.env');

  updateEnvFile(rootEnvPath, '.env (root)', addresses.gameNFT, addresses.marketplace);
  updateEnvFile(backendEnvPath, 'backend/.env', addresses.gameNFT, addresses.marketplace);
  updateEnvFile(marketplaceEnvPath, 'marketplace-frontend/.env', addresses.gameNFT, addresses.marketplace, 'VITE_');
  updateEnvFile(creatorEnvPath, 'creator-dashboard/.env', addresses.gameNFT, addresses.marketplace, 'VITE_');
}

async function main() {
  console.log('🎯 Docker Contract Deployment Script\n');

  await deployContracts();
  await copyABIsFromContainer();
  const addresses = await getDeployedAddresses();
  await updateHostEnvFiles(addresses);

  // Restart backend to pick up new ABIs and .env
  console.log('\n🔄 Restarting backend container...\n');
  await execAsync('docker-compose restart backend');
  console.log('✅ Backend restarted\n');

  console.log('\n✨ Deployment complete!\n');
  console.log('📋 Contract Addresses:');
  console.log(`   NFT Contract: ${addresses.gameNFT}`);
  console.log(`   Marketplace: ${addresses.marketplace}`);
  console.log('\n💡 Fresh ABIs copied to frontends and backend container.');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});