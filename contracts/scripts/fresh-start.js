import { rmSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

console.log('\n🧹 Starting fresh cleanup...\n');

// Clean Hardhat artifacts
console.log('📦 Cleaning Hardhat artifacts...');
try {
  execSync('npx hardhat clean', { stdio: 'inherit' });
} catch (error) {
  console.log('  (No artifacts to clean)');
}

// Remove Ignition deployment state
console.log('🗑️  Removing Ignition deployment state...');
const ignitionPath = join(process.cwd(), 'ignition', 'deployments');
if (existsSync(ignitionPath)) {
  rmSync(ignitionPath, { recursive: true, force: true });
  console.log('  ✓ Removed ignition/deployments');
} else {
  console.log('  (No deployment state found)');
}

// Remove deployment info
console.log('🗑️  Removing deployment info...');
const deploymentPath = join(process.cwd(), 'deployments.json');
if (existsSync(deploymentPath)) {
  rmSync(deploymentPath, { force: true });
  console.log('  ✓ Removed deployments.json');
} else {
  console.log('  (No deployment info found)');
}

console.log('\n✅ Cleanup complete!\n');
console.log('📋 Next steps:');
console.log('   1. Terminal 1: npx hardhat node');
console.log('   2. Terminal 2: npm run deploy\n');