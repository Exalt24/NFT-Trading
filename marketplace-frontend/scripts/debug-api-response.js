import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Debugging API Response Format...\n');

const envPath = join(__dirname, '..', '.env');
let apiUrl = 'http://localhost:4000/api';

try {
  const envContent = readFileSync(envPath, 'utf8');
  const match = envContent.match(/VITE_API_URL=(.+)/);
  if (match && match[1]) {
    apiUrl = match[1].trim();
  }
} catch (err) {
  console.log('⚠️  Could not read .env, using default API URL');
}

console.log(`API URL: ${apiUrl}\n`);

async function debugEndpoint(name, url) {
  try {
    console.log(`\n📡 Testing: ${name}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`   ❌ Status: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log(`   ✅ Status: ${response.status} OK`);
    console.log(`   📦 Response Type: ${Array.isArray(data) ? 'Array' : 'Object'}`);
    
    if (Array.isArray(data) && data.length > 0) {
      console.log(`   📊 Array Length: ${data.length}`);
      console.log(`   🔑 First Item Keys:`, Object.keys(data[0]).join(', '));
      console.log(`   📄 First Item Sample:`, JSON.stringify(data[0], null, 2));
    } else if (typeof data === 'object' && data !== null) {
      console.log(`   🔑 Object Keys:`, Object.keys(data).join(', '));
      console.log(`   📄 Sample:`, JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function runDebug() {
  console.log('=' .repeat(60));
  
  await debugEndpoint('Total Supply', `${apiUrl}/nft/total`);
  await debugEndpoint('Active Listings', `${apiUrl}/marketplace/listings`);
  await debugEndpoint('Recent NFTs', `${apiUrl}/nft/recent?limit=5`);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Check if keys are snake_case (token_id) or camelCase (tokenId)');
  console.log('   If snake_case, the camelCase transformer should convert them.\n');
}

runDebug().catch(err => {
  console.error('Debug error:', err);
  process.exit(1);
});