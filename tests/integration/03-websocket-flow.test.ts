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
  sleep,
  assert,
  config
} from './helpers.js';

interface NFTEvent {
  type: string;
  tokenId?: number;
  [key: string]: any;
}

async function testWebSocketFlow() {
  logSection('TEST 3: WEBSOCKET REAL-TIME UPDATES');

  let socket: Socket | null = null;
  const receivedEvents: NFTEvent[] = [];

  try {
    logStep('Step 1: Connect to WebSocket server');
    socket = io(config.wsUrl, {
      transports: ['websocket'],
      reconnection: false
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      socket!.on('connect', () => {
        clearTimeout(timeout);
        console.log(`  ✅ Connected to WebSocket (ID: ${socket!.id})`);
        resolve();
      });

      socket!.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    logStep('Step 2: Subscribe to global room');
    socket.emit('subscribe', { room: 'global' });
    console.log(`  ✅ Subscribed to 'global' room`);

    logStep('Step 3: Setup event listeners');
    const eventTypes = ['nftMinted', 'nftListed', 'nftSold', 'nftCancelled', 'priceUpdated', 'nftTransferred'];
    
    for (const eventType of eventTypes) {
      socket.on(eventType, (data: NFTEvent) => {
        console.log(`  📡 Received ${eventType}:`, data);
        receivedEvents.push({ ...data, type: eventType });
      });
    }

    logStep('Step 4: Mint NFT and wait for event');
    const signer = await getSigner();
    const address = await signer.getAddress();
    const nftContract = await getNFTContract(true);
    
    const tokenURI = 'ipfs://QmTestWS/metadata.json';
    const mintTx = await nftContract.mint(address, tokenURI);
    const mintReceipt = await waitForConfirmation(mintTx);
    const tokenId = extractTokenIdFromReceipt(mintReceipt, nftContract);
    console.log(`  ✅ Minted Token ID: ${tokenId}`);

    logStep('Step 5: Wait for WebSocket event (10 seconds)');
    await sleep(10000);

    const mintEvent = receivedEvents.find(e => e.type === 'nftMinted' && e.tokenId === tokenId);
    assert(mintEvent !== undefined, `Received nftMinted event for token ${tokenId}`);
    assert(mintEvent!.owner.toLowerCase() === address.toLowerCase(), `Event owner matches`);

    logStep('Step 6: List NFT and wait for event');
    const marketplaceContract = await getMarketplaceContract(true);
    const marketplaceAddress = await marketplaceContract.getAddress();
    
    const approveTx = await nftContract.approve(marketplaceAddress, tokenId);
    await waitForConfirmation(approveTx);
    
    const listPrice = ethers.parseEther('0.3');
    const listTx = await marketplaceContract.listNFT(await nftContract.getAddress(), tokenId, listPrice);
    await waitForConfirmation(listTx);
    console.log(`  ✅ Listed token ${tokenId}`);

    await sleep(10000);

    const listEvent = receivedEvents.find(e => e.type === 'nftListed' && e.tokenId === tokenId);
    assert(listEvent !== undefined, `Received nftListed event for token ${tokenId}`);
    assert(listEvent!.seller.toLowerCase() === address.toLowerCase(), `Event seller matches`);

    logStep('Step 7: Verify event deduplication');
    const mintEventCount = receivedEvents.filter(e => e.type === 'nftMinted' && e.tokenId === tokenId).length;
    assert(mintEventCount === 1, `No duplicate mint events (count: ${mintEventCount})`);

    logStep('Step 8: Test room-based subscription');
    socket.emit('subscribe', { room: `nft-${tokenId}` });
    await sleep(1000);
    console.log(`  ✅ Subscribed to 'nft-${tokenId}' room`);

    const updatePriceTx = await marketplaceContract.updatePrice(await nftContract.getAddress(), tokenId, ethers.parseEther('0.4'));
    await waitForConfirmation(updatePriceTx);
    console.log(`  ✅ Updated price for token ${tokenId}`);

    await sleep(10000);

    const priceUpdateEvent = receivedEvents.find(e => e.type === 'priceUpdated' && e.tokenId === tokenId);
    assert(priceUpdateEvent !== undefined, `Received priceUpdated event for token ${tokenId}`);

    console.log('\n✅ WEBSOCKET FLOW TEST PASSED');
    console.log(`  Total events received: ${receivedEvents.length}`);
    
    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  } finally {
    if (socket) {
      logStep('Cleanup: Disconnect WebSocket');
      socket.disconnect();
      console.log(`  ✅ Disconnected`);
    }
  }
}

testWebSocketFlow()
  .then(() => {
    setTimeout(() => process.exit(0), 100);
  })
  .catch(() => {
    setTimeout(() => process.exit(1), 100);
  });