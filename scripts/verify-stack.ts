import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'running' | 'stopped' | 'error';
  message: string;
}

async function checkDockerService(containerName: string, serviceName: string): Promise<ServiceStatus> {
  try {
    const { stdout } = await execAsync(`docker inspect --format='{{.State.Status}}' ${containerName}`);
    const status = stdout.trim().replace(/'/g, ''); // Remove quotes from Docker output
    
    if (status === 'running') {
      try {
        const { stdout: health } = await execAsync(`docker inspect --format='{{.State.Health.Status}}' ${containerName}`);
        const healthStatus = health.trim().replace(/'/g, ''); // Remove quotes from Docker output
        
        if (healthStatus === 'healthy') {
          return { name: serviceName, status: 'healthy', message: 'Running and healthy' };
        } else if (healthStatus === 'no health check' || healthStatus === '<no value>' || healthStatus === '') {
          return { name: serviceName, status: 'running', message: 'Running (no health check)' };
        } else {
          return { name: serviceName, status: 'error', message: `Running but ${healthStatus}` };
        }
      } catch {
        // No health check defined
        return { name: serviceName, status: 'running', message: 'Running (no health check)' };
      }
    } else {
      return { name: serviceName, status: 'stopped', message: `Container ${status}` };
    }
  } catch (error) {
    return { name: serviceName, status: 'error', message: 'Container not found' };
  }
}

async function checkHTTPEndpoint(url: string, name: string): Promise<ServiceStatus> {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return { name, status: 'healthy', message: `HTTP ${response.status}` };
    } else {
      return { name, status: 'error', message: `HTTP ${response.status}` };
    }
  } catch (error: any) {
    return { name, status: 'error', message: error.message };
  }
}

async function checkContractAddresses(): Promise<ServiceStatus> {
  try {
    const { stdout } = await execAsync('docker exec nft-hardhat cat /app/ignition/deployments/chain-31338/deployed_addresses.json');
    const addresses = JSON.parse(stdout);
    
    const nftAddress = addresses['DeployAllModule#GameNFT'] || addresses['GameNFTModule#GameNFT'];
    const marketplaceAddress = addresses['DeployAllModule#Marketplace'] || addresses['MarketplaceModule#Marketplace'];
    
    if (nftAddress && marketplaceAddress) {
      return { name: 'Smart Contracts', status: 'healthy', message: 'Deployed' };
    } else {
      return { name: 'Smart Contracts', status: 'error', message: 'Addresses not found' };
    }
  } catch (error) {
    return { name: 'Smart Contracts', status: 'error', message: 'Not deployed' };
  }
}

async function checkDatabase(): Promise<ServiceStatus> {
  try {
    const { stdout } = await execAsync('docker exec nft-postgres psql -U postgres -d nft_marketplace -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \'public\'" -t');
    const tableCount = parseInt(stdout.trim());
    
    if (tableCount >= 5) {
      return { name: 'Database Schema', status: 'healthy', message: `${tableCount} tables` };
    } else {
      return { name: 'Database Schema', status: 'error', message: `Only ${tableCount} tables` };
    }
  } catch (error) {
    return { name: 'Database Schema', status: 'error', message: 'Cannot query' };
  }
}

function printStatus(status: ServiceStatus): void {
  const icon = status.status === 'healthy' ? '[OK]' : 
               status.status === 'running' ? '[OK]' :
               status.status === 'stopped' ? '[STOP]' : '[ERROR]';
  
  const color = status.status === 'healthy' || status.status === 'running' ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  
  console.log(`${color}${icon}${reset} ${status.name.padEnd(20)} ${status.message}`);
}

async function main() {
  console.log('============================================');
  console.log(' NFT Trading Platform - Stack Verification');
  console.log('============================================\n');

  console.log('Checking Docker Containers...\n');

  const containerChecks = await Promise.all([
    checkDockerService('nft-postgres', 'PostgreSQL'),
    checkDockerService('nft-hardhat', 'Hardhat Node'),
    checkDockerService('nft-backend', 'Backend'),
    checkDockerService('nft-marketplace', 'Marketplace Frontend'),
    checkDockerService('nft-creator', 'Creator Dashboard'),
  ]);

  containerChecks.forEach(printStatus);

  console.log('\nChecking HTTP Endpoints...\n');

  const httpChecks = await Promise.all([
    checkHTTPEndpoint('http://localhost:4000/health', 'Backend Health'),
    checkHTTPEndpoint('http://localhost:3000', 'Marketplace'),
    checkHTTPEndpoint('http://localhost:3001', 'Creator Dashboard'),
  ]);

  httpChecks.forEach(printStatus);

  console.log('\nChecking Blockchain...\n');

  const contractStatus = await checkContractAddresses();
  printStatus(contractStatus);

  console.log('\nChecking Database...\n');

  const dbStatus = await checkDatabase();
  printStatus(dbStatus);

  console.log('\n============================================');

  const allHealthy = [...containerChecks, ...httpChecks, contractStatus, dbStatus]
    .every(s => s.status === 'healthy' || s.status === 'running');

  if (allHealthy) {
    console.log(' STATUS: ALL SYSTEMS OPERATIONAL');
    console.log('============================================\n');
    console.log('Access Points:');
    console.log('  Marketplace:        http://localhost:3000');
    console.log('  Creator Dashboard:  http://localhost:3001');
    console.log('  Backend API:        http://localhost:4000/api');
    process.exit(0);
  } else {
    console.log(' STATUS: SOME SERVICES HAVE ISSUES');
    console.log('============================================\n');
    console.log('Run: .\\scripts\\docker-logs.ps1 <service>');
    console.log('To view logs for failed services.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});