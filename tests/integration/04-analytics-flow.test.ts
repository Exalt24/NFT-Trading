import {
  logSection,
  logStep,
  apiGet,
  assert
} from './helpers.js';

async function testAnalyticsFlow() {
  logSection('TEST 4: ANALYTICS & STATISTICS');

  try {
    logStep('Step 1: Test platform statistics');
    const stats = await apiGet('/analytics/stats');
    console.log(`  Total Sales: ${stats.totalSales}`);
    console.log(`  Total Volume: ${stats.totalVolume} ETH`);
    console.log(`  Unique Traders: ${stats.uniqueTraders}`);
    console.log(`  Average Price: ${stats.avgPrice} ETH`);
    console.log(`  Floor Price: ${stats.floorPrice} ETH`);
    console.log(`  Highest Sale: ${stats.highestSale} ETH`);
    
    assert(typeof stats.totalSales === 'number', `totalSales is a number`);
    assert(typeof stats.totalVolume === 'string', `totalVolume is a string`);
    assert(typeof stats.uniqueTraders === 'number', `uniqueTraders is a number`);

    logStep('Step 2: Test top traders endpoint');
    const topTraders = await apiGet('/analytics/top-traders?limit=5');
    console.log(`  Found ${topTraders.length} traders`);
    
    if (topTraders.length > 0) {
      const trader = topTraders[0];
      console.log(`  Top trader: ${trader.address}`);
      console.log(`    Trades: ${trader.tradesCount}`);
      console.log(`    Volume: ${trader.totalVolume} ETH`);
      assert(typeof trader.address === 'string', `Trader has address`);
      assert(typeof trader.tradesCount === 'number', `Trader has trade count`);
    }

    logStep('Step 3: Test trading volume over time');
    const volumeData = await apiGet('/analytics/volume?days=30');
    console.log(`  Volume data points: ${volumeData.length}`);
    
    if (volumeData.length > 0) {
      const dataPoint = volumeData[0];
      assert('date' in dataPoint, `Volume data has date field`);
      assert('volume' in dataPoint, `Volume data has volume field`);
      assert('salesCount' in dataPoint, `Volume data has salesCount field`);
    }

    logStep('Step 4: Test price distribution');
    const priceDistribution = await apiGet('/analytics/price-distribution');
    console.log(`  Price buckets: ${priceDistribution.length}`);
    
    if (priceDistribution.length > 0) {
      const bucket = priceDistribution[0];
      console.log(`  Sample bucket:`, bucket);
      assert('count' in bucket, `Bucket has count field`);
    }

    logStep('Step 5: Test most expensive sales');
    const expensiveSales = await apiGet('/analytics/expensive-sales?limit=5');
    console.log(`  Found ${expensiveSales.length} expensive sales`);
    
    if (expensiveSales.length > 0) {
      const sale = expensiveSales[0];
      console.log(`  Highest sale: Token ${sale.tokenId} for ${sale.price} ETH`);
      assert(typeof sale.tokenId === 'number', `Sale has token ID`);
      assert(typeof sale.price === 'string', `Sale has price`);
      assert(typeof sale.seller === 'string', `Sale has seller`);
      assert(typeof sale.buyer === 'string', `Sale has buyer`);
    }

    logStep('Step 6: Test volume by NFT');
    const volumeByNFT = await apiGet('/analytics/volume-by-nft?limit=5');
    console.log(`  Top traded NFTs: ${volumeByNFT.length}`);
    
    if (volumeByNFT.length > 0) {
      const nft = volumeByNFT[0];
      console.log(`  Token ${nft.tokenId}: ${nft.totalVolume} ETH (${nft.salesCount} sales)`);
      assert(typeof nft.tokenId === 'number', `NFT has token ID`);
      assert(typeof nft.totalVolume === 'string', `NFT has total volume`);
      assert(typeof nft.salesCount === 'number', `NFT has sales count`);
    }

    logStep('Step 7: Test sales by hour');
    const salesByHour = await apiGet('/analytics/sales-by-hour');
    console.log(`  Hours with sales: ${salesByHour.length}`);
    
    if (salesByHour.length > 0) {
      const hourData = salesByHour[0];
      assert('hour' in hourData, `Hour data has hour field`);
      assert('salesCount' in hourData, `Hour data has sales count`);
    }

    logStep('Step 8: Test user-specific statistics');
    const signer0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const userStats = await apiGet(`/analytics/user/${signer0}`);
    console.log(`  User ${signer0} stats:`);
    console.log(`    NFTs Owned: ${userStats.nftsOwned}`);
    console.log(`    NFTs Minted: ${userStats.nftsMinted}`);
    console.log(`    Total Sales: ${userStats.totalSales}`);
    console.log(`    Total Purchases: ${userStats.totalPurchases}`);
    
    assert(typeof userStats.nftsOwned === 'number', `User has NFTs owned count`);
    assert(typeof userStats.nftsMinted === 'number', `User has NFTs minted count`);

    console.log('\n✅ ANALYTICS FLOW TEST PASSED');
    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  }
}

testAnalyticsFlow()
  .then(() => {
    setTimeout(() => process.exit(0), 100);
  })
  .catch(() => {
    setTimeout(() => process.exit(1), 100);
  });