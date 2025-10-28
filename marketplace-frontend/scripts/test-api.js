import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Testing Backend API Connection...\n');

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

async function testEndpoint(name, url) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${name}: OK`);
      return { success: true, data };
    } else {
      console.log(`❌ ${name}: ${response.status} ${response.statusText}`);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  const results = [];

  console.log('Testing endpoints...\n');

  const healthUrl = apiUrl.replace('/api', '/health');
  results.push(await testEndpoint('Health Check', healthUrl));

  results.push(await testEndpoint('Total Supply', `${apiUrl}/nft/total`));
  results.push(await testEndpoint('Active Listings', `${apiUrl}/marketplace/listings`));
  results.push(await testEndpoint('Floor Price', `${apiUrl}/marketplace/floor`));
  results.push(await testEndpoint('Platform Stats', `${apiUrl}/analytics/stats`));

  console.log('\n' + '='.repeat(50));

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  if (successCount === totalCount) {
    console.log(`\n✨ All ${totalCount} tests passed! Backend is ready.\n`);
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${successCount}/${totalCount} tests passed.\n`);
    console.log('💡 Make sure backend is running: cd backend && npm run dev\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});