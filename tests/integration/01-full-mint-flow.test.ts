import { ethers } from 'ethers';
import {
  logSection,
  logStep,
  getSigner,
  getNFTContract,
  waitForConfirmation,
  extractTokenIdFromReceipt,
  apiGetWithRetry,
  apiGet,
  sleep,
  assert
} from './helpers.js';
import { TEST_NFTS, createTokenURI, getPinataStatus } from './testData.js';

async function testFullMintFlow() {
  logSection('TEST 1: FULL MINT FLOW (Contract → Backend → API)');

  try {
    console.log(`\n${getPinataStatus()}\n`);

    logStep('Step 1: Get signer and NFT contract');
    const signer = await getSigner();
    const address = await signer.getAddress();
    console.log(`  Signer: ${address}`);
   
    const nftContract = await getNFTContract(true);
    const contractAddress = await nftContract.getAddress();
    console.log(`  NFT Contract: ${contractAddress}`);

    logStep('Step 2: Generate NFT with real image');
    const currentSupply = Number(await nftContract.getCurrentTokenId());
    const nextTokenId = currentSupply + 1;
    const testNFT = TEST_NFTS[0]; // Use first test NFT
    
    console.log(`  NFT: ${testNFT.name}`);
    console.log(`  Rarity: ${testNFT.attributes.find((a: any) => a.trait_type === 'Rarity')?.value}`);
    console.log(`  Generating image and uploading to IPFS...`);
    
    const tokenURI = await createTokenURI(testNFT, nextTokenId);

    logStep('Step 3: Mint NFT on blockchain');
    const mintTx = await nftContract.mint(address, tokenURI);
    console.log(`  Transaction hash: ${mintTx.hash}`);
   
    const receipt = await waitForConfirmation(mintTx);
    const tokenId = extractTokenIdFromReceipt(receipt, nftContract);
    console.log(`  ✅ Minted Token ID: ${tokenId}`);

    logStep('Step 3: Verify on-chain data');
    const owner = await nftContract.ownerOf(tokenId);
    assert(owner.toLowerCase() === address.toLowerCase(), `Owner matches (${owner})`);
   
    const uri = await nftContract.tokenURI(tokenId);
    assert(uri === tokenURI, `Token URI matches`);
    console.log(`  TokenURI: ${uri.substring(0, 40)}...`);

    logStep('Step 4: Wait for backend indexing (15 seconds)');
    console.log('  ⏳ EventIndexer needs time to process blockchain events...');
    await sleep(15000);

    logStep('Step 5: Verify API data (with retries)');
    const nft = await apiGetWithRetry(`/nft/${tokenId}`);
   
    assert(nft && nft.tokenId === tokenId, `API token ID matches (${nft?.tokenId})`);
    assert(nft.owner.toLowerCase() === address.toLowerCase(), `API owner matches (${nft.owner})`);
    assert(nft.tokenUri === tokenURI, `API token URI matches (${nft.tokenUri})`);

    logStep('Step 6: Verify NFT appears in owner query');
    const ownerNFTs = await apiGet(`/nft/owner/${address}`);
    const foundNFT = ownerNFTs.find((n: any) => n.tokenId === tokenId);
    assert(foundNFT !== undefined, `NFT appears in owner's collection`);
    console.log(`  ✅ Found in owner collection with ${ownerNFTs.length} total NFTs`);

    logStep('Step 7: Verify total supply updated');
    const totalSupply = await apiGet('/nft/total');
    assert(totalSupply.total > 0, `Total supply is ${totalSupply.total}`);

    logStep('Step 8: Verify metadata (if available)');
    try {
      const metadata = await apiGet(`/nft/metadata/${tokenId}`);
      if (metadata) {
        console.log(`  ✅ Metadata available: ${metadata.name || 'No name'}`);
      }
    } catch (error) {
      console.log(`  ℹ️  Metadata not yet cached (expected for mock URIs)`);
    }

    console.log('\n✅ FULL MINT FLOW TEST PASSED');
    console.log(`\n📊 Summary:`);
    console.log(`  NFT: ${testNFT.name}`);
    console.log(`  Token ID: ${tokenId}`);
    console.log(`  Owner: ${address}`);
    console.log(`  TokenURI: ${tokenURI.startsWith('ipfs://Qm') && !tokenURI.includes('QmTest') ? '🎨 Real IPFS image' : '📝 Mock URI'}`);
    console.log(`  Database: Indexed ✓`);
    console.log(`  API: Accessible ✓`);
    
    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  }
}

testFullMintFlow()
  .then(() => {
    setTimeout(() => process.exit(0), 100);
  })
  .catch(() => {
    setTimeout(() => process.exit(1), 100);
  });