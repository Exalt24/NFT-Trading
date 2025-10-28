import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: join(process.cwd(), '..', 'backend', '.env') });

interface VerificationResult {
  check: string;
  status: 'pass' | 'fail';
  details: string;
}

async function loadABI(contractName: string): Promise<any[]> {
  const artifactPath = join(process.cwd(), '..', 'contracts', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as any;
  return artifact.abi;
}

async function verifyContracts(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';
  const nftAddress = process.env.NFT_CONTRACT_ADDRESS;
  const marketplaceAddress = process.env.MARKETPLACE_CONTRACT_ADDRESS;

  if (!nftAddress || !marketplaceAddress) {
    results.push({
      check: 'Contract Addresses',
      status: 'fail',
      details: 'NFT_CONTRACT_ADDRESS or MARKETPLACE_CONTRACT_ADDRESS not set in environment'
    });
    return results;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const nftCode = await provider.getCode(nftAddress);
    if (nftCode !== '0x') {
      results.push({
        check: 'GameNFT Contract',
        status: 'pass',
        details: `Deployed at ${nftAddress}`
      });

      const nftABI = await loadABI('GameNFT');
      const nftContract = new ethers.Contract(nftAddress, nftABI, provider);
      
      try {
        const name = await nftContract.name();
        const symbol = await nftContract.symbol();
        const owner = await nftContract.owner();
        
        results.push({
          check: 'GameNFT Properties',
          status: 'pass',
          details: `Name: ${name}, Symbol: ${symbol}, Owner: ${owner}`
        });
      } catch (error) {
        results.push({
          check: 'GameNFT Properties',
          status: 'fail',
          details: error instanceof Error ? error.message : 'Failed to read contract properties'
        });
      }
    } else {
      results.push({
        check: 'GameNFT Contract',
        status: 'fail',
        details: `No code at address ${nftAddress}`
      });
    }

    const marketplaceCode = await provider.getCode(marketplaceAddress);
    if (marketplaceCode !== '0x') {
      results.push({
        check: 'Marketplace Contract',
        status: 'pass',
        details: `Deployed at ${marketplaceAddress}`
      });

      const marketplaceABI = await loadABI('Marketplace');
      const marketplaceContract = new ethers.Contract(marketplaceAddress, marketplaceABI, provider);
      
      try {
        const owner = await marketplaceContract.owner();
        const platformFee = await marketplaceContract.platformFee();
        
        results.push({
          check: 'Marketplace Properties',
          status: 'pass',
          details: `Owner: ${owner}, Platform Fee: ${platformFee} basis points`
        });
      } catch (error) {
        results.push({
          check: 'Marketplace Properties',
          status: 'fail',
          details: error instanceof Error ? error.message : 'Failed to read contract properties'
        });
      }
    } else {
      results.push({
        check: 'Marketplace Contract',
        status: 'fail',
        details: `No code at address ${marketplaceAddress}`
      });
    }

  } catch (error) {
    results.push({
      check: 'Blockchain Connection',
      status: 'fail',
      details: error instanceof Error ? error.message : 'Failed to connect'
    });
  }

  return results;
}

async function verifyDatabase(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  let client;

  try {
    const { Client } = await import('pg');
    client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'nft_marketplace',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    });

    await client.connect();

    const tables = ['nfts', 'marketplace_listings', 'trading_history', 'ipfs_metadata_cache', 'sync_status'];
    
    for (const table of tables) {
      const result = await client.query(
        `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = $1`,
        [table]
      ) as any;
      
      if (result.rows[0].count === '1') {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`) as any;
        results.push({
          check: `Table: ${table}`,
          status: 'pass',
          details: `${countResult.rows[0].count} rows`
        });
      } else {
        results.push({
          check: `Table: ${table}`,
          status: 'fail',
          details: 'Table does not exist'
        });
      }
    }

    const indexResult = await client.query(`
      SELECT COUNT(*) 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `) as any;
    
    results.push({
      check: 'Database Indexes',
      status: 'pass',
      details: `${indexResult.rows[0].count} indexes created`
    });

  } catch (error) {
    results.push({
      check: 'Database Connection',
      status: 'fail',
      details: error instanceof Error ? error.message : 'Failed to connect'
    });
  } finally {
    if (client) {
      await client.end();
    }
  }

  return results;
}

async function verifyAPI(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  const apiUrl = process.env.API_URL || 'http://localhost:4000/api';

  const endpoints = [
    '/nft/total',
    '/marketplace/listings',
    '/analytics/stats'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${apiUrl}${endpoint}`);
      
      if (response.ok) {
        const data = await response.json() as any;
        results.push({
          check: `API: ${endpoint}`,
          status: 'pass',
          details: `HTTP ${response.status}, responded with data`
        });
      } else {
        results.push({
          check: `API: ${endpoint}`,
          status: 'fail',
          details: `HTTP ${response.status}`
        });
      }
    } catch (error) {
      results.push({
        check: `API: ${endpoint}`,
        status: 'fail',
        details: error instanceof Error ? error.message : 'Request failed'
      });
    }
  }

  return results;
}

async function main() {
  console.log('\n🔍 NFT Trading Game - Deployment Verification');
  console.log('='.repeat(60));
  console.log();

  const contractResults = await verifyContracts();
  const databaseResults = await verifyDatabase();
  const apiResults = await verifyAPI();

  const allResults = [
    ...contractResults,
    ...databaseResults,
    ...apiResults
  ];

  let passCount = 0;
  let failCount = 0;

  for (const result of allResults) {
    const icon = result.status === 'pass' ? '✅' : '❌';
    console.log(`${icon} ${result.check}`);
    console.log(`   ${result.details}`);
    console.log();

    if (result.status === 'pass') {
      passCount++;
    } else {
      failCount++;
    }
  }

  console.log('='.repeat(60));
  console.log(`📊 Results: ${passCount} passed, ${failCount} failed`);
  console.log();

  if (failCount === 0) {
    console.log('✅ Deployment verified successfully');
    setTimeout(() => process.exit(0), 100);
  } else {
    console.log('❌ Deployment verification failed');
    console.log('\n💡 Tips:');
    console.log('  - Ensure all services are running (Hardhat, Backend, PostgreSQL)');
    console.log('  - Check environment variables are set correctly');
    console.log('  - Run database migrations: cd backend && npm run migrate');
    console.log('  - Deploy contracts: cd contracts && npm run deploy');
    setTimeout(() => process.exit(1), 100);
  }
}

main().catch(error => {
  console.error('Verification failed:', error);
  setTimeout(() => process.exit(1), 100);
});