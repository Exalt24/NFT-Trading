import { ethers } from 'ethers';
import { io, Socket } from 'socket.io-client';
import {
  logSection,
  logStep,
  getSigner,
  getNFTContract,
  getMarketplaceContract,
  waitForConfirmation,
  extractTokenIdFromReceipt,
  apiGetWithRetry,
  apiGet,
  sleep,
  assert,
  config
} from '../integration/helpers.js';
import { TEST_NFTS, createTokenURI, getPinataStatus } from '../integration/testData.js';

async function testFullStack() {
  logSection('E2E TEST: COMPLETE NFT LIFECYCLE WITH REAL IMAGES');

  let socket: Socket | null = null;
  const receivedEvents: any[] = [];

  try {
    console.log(`\n${getPinataStatus()}\n`);

    logStep('Step 1: Connect WebSocket');
    socket = io(config.wsUrl, {
      transports: ['websocket'],
      reconnection: false
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
      socket!.on('connect', () => {
        clearTimeout(timeout);
        console.log(`  ✅ WebSocket connected`);
        resolve();
      });
    });

    socket.emit('subscribe', { room: 'global' });
    socket.on('nftMinted', (data) => receivedEvents.push({ type: 'mint', data }));
    socket.on('nftListed', (data) => receivedEvents.push({ type: 'list', data }));
    socket.on('nftSold', (data) => receivedEvents.push({ type: 'sold', data }));

    logStep('Step 2: Setup accounts');
    const creator = await getSigner(0);
    const buyer1 = await getSigner(1);
    const buyer2 = await getSigner(2);
    
    const creatorAddress = await creator.getAddress();
    const buyer1Address = await buyer1.getAddress();
    const buyer2Address = await buyer2.getAddress();
    
    console.log(`  Creator: ${creatorAddress}`);
    console.log(`  Buyer 1: ${buyer1Address}`);
    console.log(`  Buyer 2: ${buyer2Address}`);

    const nftContract = await getNFTContract(true);
    const marketplaceContract = await getMarketplaceContract(true);
    const nftAddress = await nftContract.getAddress();
    const marketplaceAddress = await marketplaceContract.getAddress();

    logStep('Step 3: Generate and upload NFTs to IPFS');
    const tokenURIs: string[] = [];
    const currentSupply = Number(await nftContract.getCurrentTokenId());
    const nextTokenId = currentSupply + 1;

    // Generate and upload 3 NFTs with real images
    for (let i = 0; i < 3; i++) {
      const nft = TEST_NFTS[i];
      const tokenId = nextTokenId + i;
      
      console.log(`\n  [${i + 1}/3] Processing: ${nft.name}`);
      const tokenURI = await createTokenURI(nft, tokenId);
      tokenURIs.push(tokenURI);
    }

    await sleep(2000);

    logStep('Step 4: Mint 3 NFTs on blockchain');
    const mintedTokenIds: number[] = [];

    for (let i = 0; i < tokenURIs.length; i++) {
      const tokenURI = tokenURIs[i];
      const nft = TEST_NFTS[i];
      
      console.log(`\n  [${i + 1}/3] Minting: ${nft.name}`);
      console.log(`   TokenURI: ${tokenURI}`);
      
      const mintTx = await nftContract.mint(creatorAddress, tokenURI);
      console.log(`   ⏳ Tx submitted: ${mintTx.hash}`);
      
      const receipt = await waitForConfirmation(mintTx);
      const tokenId = extractTokenIdFromReceipt(receipt, nftContract);
      
      mintedTokenIds.push(tokenId);
      console.log(`   ✅ Minted! Token ID: ${tokenId}`);
    }

    console.log(`\n  ⏳ Waiting 20 seconds for EventIndexer to process mints...`);
    await sleep(20000);

    logStep('Step 5: Verify all NFTs in database');
    for (const tokenId of mintedTokenIds) {
      const nft = await apiGetWithRetry(`/nft/${tokenId}`);
      
      assert(nft && nft.tokenId === tokenId, `NFT ${tokenId} in database`);
      assert(nft.owner.toLowerCase() === creatorAddress.toLowerCase(), `NFT ${tokenId} owner correct`);
      console.log(`  ✅ NFT ${tokenId}: ${nft.owner.substring(0, 10)}... | ${nft.tokenUri?.substring(0, 30)}...`);
    }

    logStep('Step 6: Verify WebSocket mint events');
    const mintEvents = receivedEvents.filter(e => e.type === 'mint');
    assert(mintEvents.length >= 3, `Received ${mintEvents.length} mint events`);
    console.log(`  ✅ Received ${mintEvents.length} mint events via WebSocket`);

    logStep('Step 7: Creator lists all 3 NFTs');
    const prices = [
      ethers.parseEther('0.1'),
      ethers.parseEther('0.5'),
      ethers.parseEther('1.0')
    ];

    for (let i = 0; i < mintedTokenIds.length; i++) {
      const tokenId = mintedTokenIds[i];
      const price = prices[i];
      
      console.log(`\n  [${i + 1}/3] Listing Token ${tokenId} for ${ethers.formatEther(price)} ETH`);
      
      const approveTx = await nftContract.approve(marketplaceAddress, tokenId);
      await waitForConfirmation(approveTx);
      console.log(`   ✅ Approved`);
      
      const listTx = await marketplaceContract.listNFT(nftAddress, tokenId, price);
      await waitForConfirmation(listTx);
      console.log(`   ✅ Listed`);
    }

    console.log(`\n  ⏳ Waiting 20 seconds for EventIndexer to process mints...`);
    await sleep(20000);

    logStep('Step 8: Verify listings in API');
    const listings = await apiGetWithRetry('/marketplace/listings');
    console.log(`  Total active listings: ${listings.length}`);
    
    for (const tokenId of mintedTokenIds) {
      const listing = listings.find((l: any) => l.tokenId === tokenId);
      assert(listing !== undefined, `Token ${tokenId} is listed`);
      assert(listing.active === true, `Token ${tokenId} listing is active`);
      console.log(`  ✅ Token ${tokenId}: Listed at ${listing.price} ETH`);
    }

    logStep('Step 9: Check floor price');
    const floorPrice = await apiGet('/marketplace/floor');
    console.log(`  Floor price: ${floorPrice.floorPrice} ETH`);
    assert(floorPrice.floorPrice === '0.1', `Floor price is correct`);

    logStep('Step 10: Buyer 1 purchases NFT #1 (0.1 ETH)');
    const marketplaceContractBuyer1 = (await getMarketplaceContract(false)).connect(buyer1) as any;
    const buyTx1 = await marketplaceContractBuyer1.buyNFT(nftAddress, mintedTokenIds[0], { value: prices[0] });
    await waitForConfirmation(buyTx1);
    console.log(`  ✅ Buyer 1 purchased Token ${mintedTokenIds[0]}`);

    console.log(`\n  ⏳ Waiting 20 seconds for EventIndexer to process mints...`);
    await sleep(20000);

    logStep('Step 11: Verify ownership transfer');
    const newOwner1 = await nftContract.ownerOf(mintedTokenIds[0]);
    assert(newOwner1.toLowerCase() === buyer1Address.toLowerCase(), `Token ${mintedTokenIds[0]} owner is Buyer 1`);
    console.log(`  ✅ On-chain owner: ${newOwner1}`);

    logStep('Step 12: Verify listing deactivated');
    const listingAfter = await apiGet(`/marketplace/listing/${mintedTokenIds[0]}?contract=${nftAddress}`);
    assert(listingAfter.active === false, `Token ${mintedTokenIds[0]} listing is inactive`);
    console.log(`  ✅ Listing status: ${listingAfter.active ? 'active' : 'inactive'}`);

    logStep('Step 13: Verify sale in history');
    const history1 = await apiGet(`/marketplace/history/${mintedTokenIds[0]}?contract=${nftAddress}`);
    assert(history1.length === 1, `Token ${mintedTokenIds[0]} has 1 sale`);
    assert(history1[0].buyer.toLowerCase() === buyer1Address.toLowerCase(), `Sale buyer is correct`);
    console.log(`  ✅ Sale recorded: ${history1[0].seller.substring(0, 10)}... → ${history1[0].buyer.substring(0, 10)}...`);

    logStep('Step 14: Buyer 2 purchases NFT #2 (0.5 ETH)');
    const marketplaceContractBuyer2 = (await getMarketplaceContract(false)).connect(buyer2) as any;
    const buyTx2 = await marketplaceContractBuyer2.buyNFT(nftAddress, mintedTokenIds[1], { value: prices[1] });
    await waitForConfirmation(buyTx2);
    console.log(`  ✅ Buyer 2 purchased Token ${mintedTokenIds[1]}`);

    console.log(`\n  ⏳ Waiting 20 seconds for EventIndexer to process mints...`);
    await sleep(20000);

    logStep('Step 15: Verify trading volume');
    const volume = await apiGet('/marketplace/volume');
    console.log(`  Total volume: ${volume.totalVolume} ETH`);
    const expectedVolume = parseFloat(ethers.formatEther(prices[0])) + parseFloat(ethers.formatEther(prices[1]));
    const actualVolume = parseFloat(volume.totalVolume);
    assert(actualVolume >= expectedVolume * 0.99, `Trading volume is approximately ${expectedVolume} ETH`);

    logStep('Step 16: Verify platform statistics');
    const stats = await apiGet('/analytics/stats');
    console.log(`  Total Sales: ${stats.totalSales}`);
    console.log(`  Unique Traders: ${stats.uniqueTraders}`);
    assert(stats.totalSales >= 2, `At least 2 sales recorded`);
    assert(stats.uniqueTraders >= 3, `At least 3 unique traders`);

    logStep('Step 17: Verify top traders');
    const topTraders = await apiGet('/analytics/top-traders?limit=5');
    console.log(`  Top traders: ${topTraders.length}`);
    const creatorTrader = topTraders.find((t: any) => t.address.toLowerCase() === creatorAddress.toLowerCase());
    assert(creatorTrader !== undefined, `Creator appears in top traders`);

    logStep('Step 18: Verify WebSocket events received');
    const listEvents = receivedEvents.filter(e => e.type === 'list');
    const soldEvents = receivedEvents.filter(e => e.type === 'sold');
    console.log(`  List events: ${listEvents.length}`);
    console.log(`  Sold events: ${soldEvents.length}`);
    assert(listEvents.length >= 3, `At least 3 list events`);
    assert(soldEvents.length >= 2, `At least 2 sold events`);

    logStep('Step 19: Verify remaining listing');
    const remainingListings = await apiGet('/marketplace/listings');
    const token3Listing = remainingListings.find((l: any) => l.tokenId === mintedTokenIds[2]);
    assert(token3Listing !== undefined, `Token ${mintedTokenIds[2]} still listed`);
    assert(token3Listing.active === true, `Token ${mintedTokenIds[2]} listing still active`);

    console.log('\n✅ E2E FULL STACK TEST PASSED');
    console.log('\n📊 SUMMARY:');
    console.log(`  NFTs Minted: 3`);
    console.log(`  Token IDs: ${mintedTokenIds.join(', ')}`);
    console.log(`  Images: ${tokenURIs[0].startsWith('ipfs://Qm') && !tokenURIs[0].includes('QmTest') ? '🎨 Real IPFS uploads' : '📝 Mock URIs'}`);
    console.log(`  NFTs Listed: 3`);
    console.log(`  NFTs Sold: 2`);
    console.log(`  Total Volume: ${volume.totalVolume} ETH`);
    console.log(`  WebSocket Events: ${receivedEvents.length}`);
    
    return true;

  } catch (error) {
    console.error('\n❌ E2E TEST FAILED:', error);
    throw error;
  } finally {
    if (socket) {
      socket.disconnect();
      console.log('\n✅ WebSocket disconnected');
    }
  }
}

testFullStack()
  .then(() => {
    setTimeout(() => process.exit(0), 100);
  })
  .catch(() => {
    setTimeout(() => process.exit(1), 100);
  });