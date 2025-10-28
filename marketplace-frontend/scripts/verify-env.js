import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verifying marketplace-frontend environment...\n');

const envPath = join(__dirname, '..', '.env');

try {
  const envContent = readFileSync(envPath, 'utf8');
  
  const required = [
    'VITE_API_URL',
    'VITE_NFT_CONTRACT_ADDRESS',
    'VITE_MARKETPLACE_CONTRACT_ADDRESS'
  ];
  
  const missing = [];
  const found = {};
  
  for (const key of required) {
    const regex = new RegExp(`^${key}=(.*)$`, 'm');
    const match = envContent.match(regex);
    
    if (!match || !match[1] || match[1].trim() === '') {
      missing.push(key);
    } else {
      found[key] = match[1].trim();
    }
  }
  
  if (missing.length > 0) {
    console.log('❌ Missing or empty environment variables:');
    missing.forEach(key => console.log(`   - ${key}`));
    console.log('\n💡 Run contract deployment first:');
    console.log('   cd contracts && npm run deploy\n');
    process.exit(1);
  }
  
  console.log('✅ All required environment variables found:\n');
  for (const [key, value] of Object.entries(found)) {
    if (key.includes('ADDRESS')) {
      console.log(`   ${key}: ${value.slice(0, 10)}...${value.slice(-6)}`);
    } else {
      console.log(`   ${key}: ${value}`);
    }
  }
  
  console.log('\n✨ Environment ready for development!\n');
  
} catch (error) {
  console.error('❌ Error reading .env file:', error.message);
  console.log('\n💡 Make sure .env exists (copy from .env.example)\n');
  process.exit(1);
}