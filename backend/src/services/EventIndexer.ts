import { EventLog, Log, formatEther } from 'ethers';
import { provider, nftContract, marketplaceContract } from '../config/blockchain.js';
import { pool } from '../config/database.js';
import { NFTService } from './NFTService.js';
import { MarketplaceService } from './MarketplaceService.js';
import { IPFSService } from './IPFSService.js';
import type { WebSocketServer } from '../websocket/server.js';

const nftService = new NFTService();
const marketplaceService = new MarketplaceService();
const ipfsService = new IPFSService();

export class EventIndexer {
  private isRunning = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private wsServer?: WebSocketServer;
  private pollingInterval?: NodeJS.Timeout;
  private lastProcessedBlock = 0;
  private isProcessing = false;

  constructor(wsServer?: WebSocketServer) {
    this.wsServer = wsServer;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  EventIndexer already running');
      return;
    }

    this.isRunning = true;
    this.reconnectAttempts = 0;

    try {
      const currentBlock = await provider.getBlockNumber();
      console.log(`📦 Current block: ${currentBlock}`);

      const lastSyncedBlock = await this.getLastSyncedBlock();
      if (lastSyncedBlock < currentBlock) {
        console.log(`🔄 Syncing historical events from block ${lastSyncedBlock + 1} to ${currentBlock}...`);
        await this.syncHistoricalEvents(lastSyncedBlock + 1, currentBlock);
        await this.updateLastSyncedBlock(currentBlock);
      }

      this.lastProcessedBlock = currentBlock;

      this.startPolling();

      console.log('✅ EventIndexer started successfully');
      console.log('🔄 Polling for new events every 2 seconds');
      if (this.wsServer) {
        console.log('📡 WebSocket broadcasting enabled');
      }
    } catch (error) {
      console.error('❌ Failed to start EventIndexer:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    console.log('✅ EventIndexer stopped');
  }

  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      if (!this.isRunning) return;

      if (this.isProcessing) {
        console.log('⏭️  Skipping poll - already processing');
        return;
      }

      try {
        const currentBlock = await provider.getBlockNumber();

        if (currentBlock > this.lastProcessedBlock) {
          this.isProcessing = true;
          console.log(`📦 New blocks detected: ${this.lastProcessedBlock + 1} to ${currentBlock}`);

          await this.syncHistoricalEvents(this.lastProcessedBlock + 1, currentBlock);
          this.lastProcessedBlock = currentBlock;
          await this.updateLastSyncedBlock(currentBlock);

          this.isProcessing = false;
        }
      } catch (error) {
        this.isProcessing = false;
        console.error('⚠️  Error during polling:', error);
        if (this.isRunning) {
          await this.handleReconnect();
        }
      }
    }, 2000);
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping indexer.`);
      await this.stop();
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));

    try {
      const currentBlock = await provider.getBlockNumber();
      console.log('✅ Reconnected successfully');
      this.reconnectAttempts = 0;
      this.lastProcessedBlock = currentBlock;
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      await this.handleReconnect();
    }
  }

  async syncHistoricalEvents(fromBlock: number, toBlock: number): Promise<void> {
    const batchSize = 100;

    for (let start = fromBlock; start <= toBlock; start += batchSize) {
      const end = Math.min(start + batchSize - 1, toBlock);

      try {
        // Create filters
        const nftMintedFilter = nftContract.filters.Minted();
        const nftTransferFilter = nftContract.filters.Transfer(null, null, null);
        const defaultRoyaltyFilter = nftContract.filters.DefaultRoyaltyUpdated();
        const tokenRoyaltyFilter = nftContract.filters.TokenRoyaltyUpdated();
        const listedFilter = marketplaceContract.filters.Listed();
        const soldFilter = marketplaceContract.filters.Sold();
        const cancelledFilter = marketplaceContract.filters.Cancelled();
        const priceUpdatedFilter = marketplaceContract.filters.PriceUpdated();

        // Query all events in parallel
        const [
          mintedEvents,
          transferEvents,
          defaultRoyaltyEvents,
          tokenRoyaltyEvents,
          listedEvents,
          soldEvents,
          cancelledEvents,
          priceUpdatedEvents
        ] = await Promise.all([
          nftContract.queryFilter(nftMintedFilter, start, end),
          nftContract.queryFilter(nftTransferFilter, start, end),
          nftContract.queryFilter(defaultRoyaltyFilter, start, end),
          nftContract.queryFilter(tokenRoyaltyFilter, start, end),
          marketplaceContract.queryFilter(listedFilter, start, end),
          marketplaceContract.queryFilter(soldFilter, start, end),
          marketplaceContract.queryFilter(cancelledFilter, start, end),
          marketplaceContract.queryFilter(priceUpdatedFilter, start, end),
        ]);

        // Process events in order by block number and log index
        const allEvents = [
          ...mintedEvents.map(e => ({ type: 'Minted' as const, event: e })),
          ...transferEvents.map(e => ({ type: 'Transfer' as const, event: e })),
          ...defaultRoyaltyEvents.map(e => ({ type: 'DefaultRoyaltyUpdated' as const, event: e })),
          ...tokenRoyaltyEvents.map(e => ({ type: 'TokenRoyaltyUpdated' as const, event: e })),
          ...listedEvents.map(e => ({ type: 'Listed' as const, event: e })),
          ...soldEvents.map(e => ({ type: 'Sold' as const, event: e })),
          ...cancelledEvents.map(e => ({ type: 'Cancelled' as const, event: e })),
          ...priceUpdatedEvents.map(e => ({ type: 'PriceUpdated' as const, event: e })),
        ].sort((a, b) => {
          if (a.event.blockNumber !== b.event.blockNumber) {
            return a.event.blockNumber - b.event.blockNumber;
          }
          return (a.event.index || 0) - (b.event.index || 0);
        });

        // Process each event
        for (const { type, event } of allEvents) {
          if (!('args' in event)) continue;

          const log = event as EventLog;
          const args = log.args.toArray();

          try {
            switch (type) {
              case 'Minted':
                await this.processNFTMinted(args[0] as bigint, args[1] as string, args[2] as string, log);
                break;
              case 'Transfer':
                const from = args[0] as string;
                if (from !== '0x0000000000000000000000000000000000000000') {
                  await this.processNFTTransfer(from, args[1] as string, args[2] as bigint, log);
                }
                break;
              case 'DefaultRoyaltyUpdated':
                await this.processDefaultRoyaltyUpdated(args[0] as string, args[1] as bigint, log);
                break;
              case 'TokenRoyaltyUpdated':
                await this.processTokenRoyaltyUpdated(args[0] as bigint, args[1] as string, args[2] as bigint, log);
                break;
              case 'Listed':
                await this.processListed(args[0] as string, args[1] as bigint, args[2] as string, args[3] as bigint, log);
                break;
              case 'Sold':
                await this.processSold(args[0] as string, args[1] as bigint, args[2] as string, args[3] as string, args[4] as bigint, log);
                break;
              case 'Cancelled':
                await this.processCancelled(args[0] as string, args[1] as bigint, args[2] as string, log);
                break;
              case 'PriceUpdated':
                await this.processPriceUpdated(args[0] as string, args[1] as bigint, args[2] as bigint, args[3] as bigint, log);
                break;
            }
          } catch (error) {
            console.error(`❌ Error processing ${type} event:`, error);
          }
        }

        if (allEvents.length > 0) {
          console.log(`✅ Processed ${allEvents.length} events (blocks ${start}-${end})`);
        }
      } catch (error) {
        console.error(`❌ Error fetching events for blocks ${start}-${end}:`, error);
      }
    }
  }

  private async processNFTMinted(tokenId: bigint, owner: string, tokenURI: string, event: EventLog): Promise<void> {
    try {
      const tokenIdNum = Number(tokenId);
      let ipfsCID: string | null = null;
      let metadata = null;

      if (tokenURI.startsWith('ipfs://')) {
        ipfsCID = tokenURI.replace('ipfs://', '');
        try {
          metadata = await ipfsService.getMetadata(ipfsCID);
        } catch {
          // Silently handle missing IPFS metadata
        }
      }

      const block = await event.getBlock();
      const timestamp = new Date(block.timestamp * 1000);

      const royaltyInfo = await nftContract.royaltyInfo(tokenId, 10000n);
      const royaltyReceiver = royaltyInfo[0];
      const royaltyAmount = Number(royaltyInfo[1]);

      await nftService.createNFT(
        tokenIdNum,
        owner.toLowerCase(),
        tokenURI,
        ipfsCID ?? undefined,
        metadata ?? undefined,
        royaltyReceiver.toLowerCase(),
        royaltyAmount,
        timestamp
      );

      console.log(`🎨 NFT Minted: Token #${tokenIdNum} → ${owner.substring(0, 10)}...`);

      if (this.wsServer) {
        this.wsServer.broadcast({
          type: 'nftMinted',
          tokenId: tokenIdNum,
          owner: owner.toLowerCase(),
          tokenURI,
          timestamp: timestamp.getTime(),
          blockNumber: event.blockNumber,
        });
      }
    } catch (error) {
      console.error(`❌ Error processing Minted event for token ${tokenId}:`, error);
    }
  }

  private async processNFTTransfer(from: string, to: string, tokenId: bigint, event: EventLog): Promise<void> {
    try {
      const tokenIdNum = Number(tokenId);
      await nftService.updateNFTOwner(tokenIdNum, to.toLowerCase());

      console.log(`🔄 NFT Transfer: Token #${tokenIdNum} from ${from.substring(0, 10)}... to ${to.substring(0, 10)}...`);

      if (this.wsServer) {
        const block = await event.getBlock();
        const timestamp = new Date(block.timestamp * 1000);

        this.wsServer.broadcast({
          type: 'nftTransferred',
          tokenId: tokenIdNum,
          from: from.toLowerCase(),
          to: to.toLowerCase(),
          timestamp: timestamp.getTime(),
          blockNumber: event.blockNumber,
        });
      }
    } catch (error) {
      console.error(`❌ Error processing Transfer event for token ${tokenId}:`, error);
    }
  }

  private async processListed(nftContractAddr: string, tokenId: bigint, seller: string, price: bigint, event: EventLog): Promise<void> {
    try {
      const tokenIdNum = Number(tokenId);
      const priceWei = price.toString(); // ✅ Keep as wei string

      const block = await event.getBlock();
      const timestamp = new Date(block.timestamp * 1000);

      await marketplaceService.createListing(
        nftContractAddr.toLowerCase(),
        tokenIdNum,
        seller.toLowerCase(),
        priceWei, // ✅ Store wei format
        timestamp
      );

      console.log(`📝 NFT Listed: Token #${tokenIdNum} for ${formatEther(price)} ETH by ${seller.substring(0, 10)}...`); // Only convert for logging

      if (this.wsServer) {
        this.wsServer.broadcast({
          type: 'nftListed',
          tokenId: tokenIdNum,
          seller: seller.toLowerCase(),
          price: priceWei, // ✅ Broadcast wei format
          timestamp: timestamp.getTime(),
          blockNumber: event.blockNumber,
        });
      }
    } catch (error) {
      console.error(`❌ Error processing Listed event for token ${tokenId}:`, error);
    }
  }

  private async processSold(nftContractAddr: string, tokenId: bigint, seller: string, buyer: string, price: bigint, event: EventLog): Promise<void> {
    try {
      const tokenIdNum = Number(tokenId);
      const priceWei = price.toString(); // ✅ Keep as wei string

      const block = await event.getBlock();
      const timestamp = new Date(block.timestamp * 1000);

      // ✅ Calculate fees in wei using BigInt
      const priceInWei = BigInt(priceWei);
      const platformFeeWei = (priceInWei * 250n) / 10000n; // 2.5% in wei

      let royaltyFeeWei = 0n;
      try {
        const royaltyInfo = await nftContract.royaltyInfo(tokenId, 10000n);
        const royaltyBasisPoints = royaltyInfo[1];
        royaltyFeeWei = (priceInWei * royaltyBasisPoints) / 10000n;
      } catch (error) {
        console.warn(`⚠️  Could not fetch royalty for token ${tokenIdNum}`);
      }

      await marketplaceService.cancelListing(nftContractAddr.toLowerCase(), tokenIdNum);

      await marketplaceService.recordSale(
        nftContractAddr.toLowerCase(),
        tokenIdNum,
        seller.toLowerCase(),
        buyer.toLowerCase(),
        priceWei, // ✅ Store wei format
        platformFeeWei.toString(), // ✅ Store wei format
        royaltyFeeWei.toString(), // ✅ Store wei format
        event.transactionHash,
        timestamp
      );

      await nftService.updateNFTOwner(tokenIdNum, buyer.toLowerCase());

      console.log(`💰 NFT Sold: Token #${tokenIdNum} for ${formatEther(price)} ETH: ${seller.substring(0, 10)}... → ${buyer.substring(0, 10)}...`); // Only convert for logging

      if (this.wsServer) {
        this.wsServer.broadcast({
          type: 'nftSold',
          tokenId: tokenIdNum,
          seller: seller.toLowerCase(),
          buyer: buyer.toLowerCase(),
          price: priceWei, // ✅ Broadcast wei format
          platformFee: platformFeeWei.toString(),
          royaltyFee: royaltyFeeWei.toString(),
          timestamp: timestamp.getTime(),
          blockNumber: event.blockNumber,
        });
      }
    } catch (error) {
      console.error(`❌ Error processing Sold event for token ${tokenId}:`, error);
    }
  }

  private async processCancelled(nftContractAddr: string, tokenId: bigint, seller: string, event: EventLog): Promise<void> {
    try {
      const tokenIdNum = Number(tokenId);
      await marketplaceService.cancelListing(nftContractAddr.toLowerCase(), tokenIdNum);

      console.log(`❌ Listing Cancelled: Token #${tokenIdNum} by ${seller.substring(0, 10)}...`);

      if (this.wsServer) {
        const block = await event.getBlock();
        const timestamp = new Date(block.timestamp * 1000);

        this.wsServer.broadcast({
          type: 'nftCancelled',
          tokenId: tokenIdNum,
          seller: seller.toLowerCase(),
          timestamp: timestamp.getTime(),
          blockNumber: event.blockNumber,
        });
      }
    } catch (error) {
      console.error(`❌ Error processing Cancelled event for token ${tokenId}:`, error);
    }
  }

  private async processPriceUpdated(nftContractAddr: string, tokenId: bigint, oldPrice: bigint, newPrice: bigint, event: EventLog): Promise<void> {
    try {
      const tokenIdNum = Number(tokenId);
      const newPriceWei = newPrice.toString(); // ✅ Keep as wei string
      const oldPriceWei = oldPrice.toString();

      await marketplaceService.updateListingPrice(
        nftContractAddr.toLowerCase(),
        tokenIdNum,
        newPriceWei // ✅ Store wei format
      );

      console.log(`💲 Price Updated: Token #${tokenIdNum} from ${formatEther(oldPrice)} to ${formatEther(newPrice)} ETH`); // Only convert for logging

      if (this.wsServer) {
        const block = await event.getBlock();
        const timestamp = new Date(block.timestamp * 1000);

        this.wsServer.broadcast({
          type: 'priceUpdated',
          tokenId: tokenIdNum,
          oldPrice: oldPriceWei, // ✅ Broadcast wei format
          newPrice: newPriceWei,
          timestamp: timestamp.getTime(),
          blockNumber: event.blockNumber,
        });
      }
    } catch (error) {
      console.error(`❌ Error processing PriceUpdated event for token ${tokenId}:`, error);
    }
  }

  private async processDefaultRoyaltyUpdated(receiver: string, feeNumerator: bigint, event: EventLog): Promise<void> {
    try {
      const feeNum = Number(feeNumerator);

      console.log(`👑 Default Royalty Updated: ${receiver.substring(0, 10)}... at ${feeNum / 100}%`);

      if (this.wsServer) {
        const block = await event.getBlock();
        const timestamp = new Date(block.timestamp * 1000);

        this.wsServer.broadcast({
          type: 'defaultRoyaltyUpdated',
          receiver: receiver.toLowerCase(),
          feeNumerator: feeNum,
          timestamp: timestamp.getTime(),
          blockNumber: event.blockNumber,
        });
      }
    } catch (error) {
      console.error(`❌ Error processing DefaultRoyaltyUpdated event:`, error);
    }
  }

  private async processTokenRoyaltyUpdated(tokenId: bigint, receiver: string, feeNumerator: bigint, event: EventLog): Promise<void> {
    try {
      const tokenIdNum = Number(tokenId);
      const feeNum = Number(feeNumerator);

      await nftService.updateNFTRoyalty(tokenIdNum, receiver.toLowerCase(), feeNum);

      console.log(`👑 Token Royalty Updated: Token #${tokenIdNum} → ${receiver.substring(0, 10)}... at ${feeNum / 100}%`);

      if (this.wsServer) {
        const block = await event.getBlock();
        const timestamp = new Date(block.timestamp * 1000);

        this.wsServer.broadcast({
          type: 'tokenRoyaltyUpdated',
          tokenId: tokenIdNum,
          receiver: receiver.toLowerCase(),
          feeNumerator: feeNum,
          timestamp: timestamp.getTime(),
          blockNumber: event.blockNumber,
        });
      }
    } catch (error) {
      console.error(`❌ Error processing TokenRoyaltyUpdated event for token ${tokenId}:`, error);
    }
  }

  private async getLastSyncedBlock(): Promise<number> {
    try {
      const nftAddress = await nftContract.getAddress();
      const result = await pool.query(
        'SELECT last_synced_block FROM sync_status WHERE contract_address = $1',
        [nftAddress.toLowerCase()]
      );

      if (result.rows.length > 0) {
        return result.rows[0].last_synced_block;
      }

      await pool.query(
        'INSERT INTO sync_status (contract_address, last_synced_block) VALUES ($1, $2)',
        [nftAddress.toLowerCase(), 0]
      );
      return 0;
    } catch (error) {
      console.error('❌ Error getting last synced block:', error);
      return 0;
    }
  }

  private async updateLastSyncedBlock(blockNumber: number): Promise<void> {
    try {
      if (blockNumber === null || blockNumber === undefined || isNaN(blockNumber)) {
        return;
      }

      const nftAddress = await nftContract.getAddress();
      await pool.query(
        'UPDATE sync_status SET last_synced_block = $1, updated_at = NOW() WHERE contract_address = $2',
        [blockNumber, nftAddress.toLowerCase()]
      );
    } catch (error) {
      console.error('❌ Error updating last synced block:', error);
    }
  }
}