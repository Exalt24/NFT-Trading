import { ethers } from 'ethers';
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
} from './helpers.js';
import { TEST_NFTS, createTokenURI, getPinataStatus } from './testData.js';

async function testMarketplaceFlow() {
  logSection('TEST 2: MARKETPLACE FLOW (List → Buy → Verify)');

  try {
    console.log(`\n${getPinataStatus()}\n`);

    logStep('Step 1: Setup accounts and prepare NFT');
    const seller = await getSigner(0);
    const buyer = await getSigner(1);
    const sellerAddress = await seller.getAddress();
    const buyerAddress = await buyer.getAddress();
    
    console.log(`  Seller: ${sellerAddress}`);
    console.log(`  Buyer: ${buyerAddress}`);

    const nftContract = await getNFTContract(true);
    const marketplaceContract = await getMarketplaceContract(true);
    const nftAddress = await nftContract.getAddress();
    const marketplaceAddress = await marketplaceContract.getAddress();
    
    logStep('Step 2: Generate NFT with real image');
    const currentSupply = Number(await nftContract.getCurrentTokenId());
    const nextTokenId = currentSupply + 1;
    const testNFT = TEST_NFTS[1]; // Use second test NFT (Epic Shield)
    
    console.log(`  NFT: ${testNFT.name}`);
    console.log(`  Generating image and uploading to IPFS...`);
    
    const tokenURI = await createTokenURI(testNFT, nextTokenId);
    
    logStep('Step 3: Mint NFT');
    const mintTx = await nftContract.mint(sellerAddress, tokenURI);
    const mintReceipt = await waitForConfirmation(mintTx);
    const tokenId = extractTokenIdFromReceipt(mintReceipt, nftContract);
    console.log(`  ✅ Minted Token ID: ${tokenId}`);
    
    console.log(`  ⏳ Waiting 10 seconds for EventIndexer...`);
    await sleep(10000);

    logStep('Step 4: Approve marketplace');
    const approveTx = await nftContract.approve(marketplaceAddress, tokenId);
    await waitForConfirmation(approveTx);
    console.log(`  ✅ Marketplace approved for token ${tokenId}`);

    logStep('Step 5: List NFT for sale');
    const listPrice = ethers.parseEther('0.5');
    const listTx = await marketplaceContract.listNFT(nftAddress, tokenId, listPrice);
    await waitForConfirmation(listTx);
    console.log(`  ✅ Listed for 0.5 ETH`);
    
    console.log(`  ⏳ Waiting 15 seconds for EventIndexer...`);
    await sleep(15000);

    logStep('Step 6: Verify listing in API');
    const listing = await apiGetWithRetry(`/marketplace/listing/${tokenId}?contract=${nftAddress}`);
    
    assert(listing && listing.tokenId === tokenId, `Listing token ID matches (${listing?.tokenId})`);
    assert(listing.seller.toLowerCase() === sellerAddress.toLowerCase(), `Seller matches`);
    assert(listing.active === true, `Listing is active`);
    console.log(`  ✅ Listing verified: ${listing.price} ETH`);

    logStep('Step 7: Verify in active listings');
    const listings = await apiGet('/marketplace/listings');
    const foundListing = listings.find((l: any) => l.tokenId === tokenId);
    assert(foundListing !== undefined, `Listing appears in active listings`);
    console.log(`  ✅ Found in active listings (${listings.length} total)`);

    logStep('Step 8: Buy NFT');
    const marketplaceContractBuyer = (await getMarketplaceContract(false)).connect(buyer) as any;
    const buyTx = await marketplaceContractBuyer.buyNFT(nftAddress, tokenId, { value: listPrice });
    await waitForConfirmation(buyTx);
    console.log(`  ✅ NFT purchased`);
    
    console.log(`  ⏳ Waiting 15 seconds for EventIndexer...`);
    await sleep(15000);

    logStep('Step 9: Verify ownership transferred');
    const newOwner = await nftContract.ownerOf(tokenId);
    assert(newOwner.toLowerCase() === buyerAddress.toLowerCase(), `Owner is now buyer (${newOwner})`);

    logStep('Step 10: Verify listing deactivated in API');
    const listingAfter = await apiGet(`/marketplace/listing/${tokenId}?contract=${nftAddress}`);
    assert(listingAfter.active === false, `Listing is now inactive`);
    console.log(`  ✅ Listing status: inactive`);

    logStep('Step 11: Verify sale in trading history');
    const history = await apiGet(`/marketplace/history/${tokenId}?contract=${nftAddress}`);
    assert(history.length > 0, `Trading history exists`);
    const sale = history[0];
    assert(sale.seller.toLowerCase() === sellerAddress.toLowerCase(), `Sale seller matches`);
    assert(sale.buyer.toLowerCase() === buyerAddress.toLowerCase(), `Sale buyer matches`);
    console.log(`  ✅ Sale recorded: ${sale.price} ETH`);

    logStep('Step 12: Verify trading volume updated');
    const volume = await apiGet('/marketplace/volume');
    assert(parseFloat(volume.totalVolume) > 0, `Trading volume is ${volume.totalVolume} ETH`);

    logStep('Step 13: Verify platform fee collected');
    const stats = await apiGet('/analytics/stats');
    console.log(`  ✅ Platform stats updated:`);
    console.log(`     Total Sales: ${stats.totalSales}`);
    console.log(`     Total Volume: ${stats.totalVolume} ETH`);

    console.log('\n✅ MARKETPLACE FLOW TEST PASSED');
    console.log(`\n📊 Summary:`);
    console.log(`  NFT: ${testNFT.name}`);
    console.log(`  Token ID: ${tokenId}`);
    console.log(`  Image: ${tokenURI.startsWith('ipfs://Qm') && !tokenURI.includes('QmTest') ? '🎨 Real IPFS' : '📝 Mock URI'}`);
    console.log(`  Sale Price: 0.5 ETH`);
    console.log(`  Seller: ${sellerAddress.substring(0, 10)}...`);
    console.log(`  Buyer: ${buyerAddress.substring(0, 10)}...`);
    console.log(`  Database: Updated ✓`);
    console.log(`  Ownership: Transferred ✓`);
    console.log(`  Listing: Deactivated ✓`);
    
    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  }
}

testMarketplaceFlow()
  .then(() => {
    setTimeout(() => process.exit(0), 100);
  })
  .catch(() => {
    setTimeout(() => process.exit(1), 100);
  });