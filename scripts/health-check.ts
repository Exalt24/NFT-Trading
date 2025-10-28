import { ethers } from 'ethers';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy';
  message: string;
  responseTime?: number;
}

const services = {
  hardhat: 'http://127.0.0.1:8545',
  backend: 'http://localhost:4000/health',
  marketplace: 'http://localhost:3000',
  creator: 'http://localhost:3001',
  postgres: 'postgresql://localhost:5432'
};

async function checkHardhatNode(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const provider = new ethers.JsonRpcProvider(services.hardhat);
    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();
    
    return {
      name: 'Hardhat Node',
      status: 'healthy',
      message: `Block ${blockNumber}, Chain ID ${network.chainId}`,
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      name: 'Hardhat Node',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed',
      responseTime: Date.now() - start
    };
  }
}

async function checkBackend(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const response = await fetch(services.backend);
    
    if (response.ok) {
      const data = await response.json() as any;
      return {
        name: 'Backend API',
        status: 'healthy',
        message: `Service: ${data.service || 'backend'}, Version: ${data.version || '1.0.0'}`,
        responseTime: Date.now() - start
      };
    } else {
      return {
        name: 'Backend API',
        status: 'unhealthy',
        message: `HTTP ${response.status}`,
        responseTime: Date.now() - start
      };
    }
  } catch (error) {
    return {
      name: 'Backend API',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed',
      responseTime: Date.now() - start
    };
  }
}

async function checkFrontend(name: string, url: string): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const response = await fetch(url, { method: 'HEAD' });
    
    if (response.ok) {
      return {
        name,
        status: 'healthy',
        message: `HTTP ${response.status}`,
        responseTime: Date.now() - start
      };
    } else {
      return {
        name,
        status: 'unhealthy',
        message: `HTTP ${response.status}`,
        responseTime: Date.now() - start
      };
    }
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed',
      responseTime: Date.now() - start
    };
  }
}

async function checkPostgres(): Promise<ServiceStatus> {
  let client;
  try {
    const { Client } = await import('pg');
    client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'nft_marketplace',
      user: 'postgres',
      password: 'postgres'
    });

    const start = Date.now();
    await client.connect();
    const result = await client.query('SELECT COUNT(*) FROM nfts') as any;
    
    return {
      name: 'PostgreSQL',
      status: 'healthy',
      message: `Connected, ${result.rows[0].count} NFTs in database`,
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      name: 'PostgreSQL',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed'
    };
  } finally {
    if (client) {
      await client.end();
    }
  }
}

async function main() {
  console.log('\n🏥 NFT Trading Game - System Health Check');
  console.log('='.repeat(60));
  console.log();

  const checks: Promise<ServiceStatus>[] = [
    checkHardhatNode(),
    checkBackend(),
    checkFrontend('Marketplace Frontend', services.marketplace),
    checkFrontend('Creator Dashboard', services.creator),
    checkPostgres()
  ];

  const results = await Promise.all(checks);

  let allHealthy = true;
  
  for (const result of results) {
    const icon = result.status === 'healthy' ? '✅' : '❌';
    const timeStr = result.responseTime ? ` (${result.responseTime}ms)` : '';
    
    console.log(`${icon} ${result.name}${timeStr}`);
    console.log(`   ${result.message}`);
    console.log();
    
    if (result.status === 'unhealthy') {
      allHealthy = false;
    }
  }

  console.log('='.repeat(60));
  
  if (allHealthy) {
    console.log('✅ All systems operational');
    setTimeout(() => process.exit(0), 100);
  } else {
    console.log('❌ Some systems are unhealthy');
    setTimeout(() => process.exit(1), 100);
  }
}

main().catch(error => {
  console.error('Health check failed:', error);
  setTimeout(() => process.exit(1), 100);
});