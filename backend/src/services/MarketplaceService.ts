import { prisma } from '../config/database.js';
import { ci, nowUtc, utc } from './prismaHelpers.js';
import { toListingRow, toHistoryRow } from './rowMappers.js';
import type { MarketplaceListingRow, TradingHistoryRow } from '../types/database.js';

export class MarketplaceService {
  async getActiveListings(): Promise<MarketplaceListingRow[]> {
    try {
      const listings = await prisma.marketplaceListing.findMany({
        where: { active: true },
        orderBy: [{ listedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      });
      return listings.map(toListingRow);
    } catch (error) {
      console.error('❌ Failed to get active listings:', error);
      throw new Error('Failed to retrieve active listings');
    }
  }

  async getListingByToken(
    nftContract: string,
    tokenId: number
  ): Promise<MarketplaceListingRow | null> {
    try {
      const listing = await prisma.marketplaceListing.findFirst({
        where: { nftContract: ci(nftContract), tokenId },
      });
      return listing ? toListingRow(listing) : null;
    } catch (error) {
      console.error(`❌ Failed to get listing for token ${tokenId}:`, error);
      throw new Error('Failed to retrieve listing');
    }
  }

  async getListingsBySeller(seller: string): Promise<MarketplaceListingRow[]> {
    try {
      const listings = await prisma.marketplaceListing.findMany({
        where: { seller: ci(seller) },
        orderBy: [{ active: 'desc' }, { listedAt: { sort: 'desc', nulls: 'last' } }],
      });
      return listings.map(toListingRow);
    } catch (error) {
      console.error(`❌ Failed to get listings for seller ${seller}:`, error);
      throw new Error('Failed to retrieve seller listings');
    }
  }

  async getFloorPrice(): Promise<string> {
    try {
      const floor = await prisma.marketplaceListing.aggregate({
        where: { active: true },
        _min: { price: true },
      });
      return floor._min.price ?? '0';
    } catch (error) {
      console.error('❌ Failed to get floor price:', error);
      throw new Error('Failed to retrieve floor price');
    }
  }

  async getTradingVolume(): Promise<{ totalVolume: string; totalSales: number }> {
    try {
      // Raw on purpose: price is TEXT (wei strings), so summing it needs CAST(price AS numeric), which Prisma's aggregate()
      // cannot express. The result is cast to text so a 19-digit wei total stays exact instead of passing through a JS number.
      const rows = await prisma.$queryRaw<Array<{ total_volume: string; total_sales: number }>>`
        SELECT
          COALESCE(SUM(CAST(price AS numeric)), 0)::text AS total_volume,
          COUNT(*)::integer AS total_sales
        FROM trading_history`;

      return {
        totalVolume: rows[0].total_volume || '0',
        totalSales: rows[0].total_sales || 0,
      };
    } catch (error) {
      console.error('❌ Failed to get trading volume:', error);
      throw new Error('Failed to retrieve trading volume');
    }
  }

  async getPriceHistory(
    nftContract: string,
    tokenId: number
  ): Promise<TradingHistoryRow[]> {
    try {
      const sales = await prisma.tradingHistory.findMany({
        where: { nftContract: ci(nftContract), tokenId },
        orderBy: [{ soldAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      });
      return sales.map(toHistoryRow);
    } catch (error) {
      console.error(`❌ Failed to get price history for token ${tokenId}:`, error);
      throw new Error('Failed to retrieve price history');
    }
  }

  async createListing(
    nftContract: string,
    tokenId: number,
    seller: string,
    price: string,
    listedAt?: Date
  ): Promise<void> {
    try {
      // Raw on purpose: Prisma 7's upsert() is a SELECT then an INSERT or UPDATE, so two simultaneous listings of one token
      // can fail with P2002 (tests/db/marketplace.test.ts reproduces it). INSERT ... ON CONFLICT is one atomic statement.
      // Listing the same token again re-activates the one row (UNIQUE nft_contract, token_id) instead of adding a second.
      await prisma.$executeRaw`
        INSERT INTO marketplace_listings (nft_contract, token_id, seller, price, active, listed_at, created_at, updated_at)
        VALUES (${nftContract}, ${tokenId}, ${seller}, ${price}, true, ${utc(listedAt || new Date())}, ${nowUtc}, ${nowUtc})
        ON CONFLICT (nft_contract, token_id) DO UPDATE SET
          seller = EXCLUDED.seller,
          price = EXCLUDED.price,
          active = true,
          listed_at = EXCLUDED.listed_at,
          updated_at = ${nowUtc}`;

      console.log(`✅ Created listing for NFT ${tokenId} at ${price} ETH`);
    } catch (error) {
      console.error(`❌ Failed to create listing for token ${tokenId}:`, error);
      throw new Error('Failed to create listing');
    }
  }

  async updateListingPrice(
    nftContract: string,
    tokenId: number,
    newPrice: string
  ): Promise<void> {
    try {
      await prisma.marketplaceListing.updateMany({
        where: { nftContract: ci(nftContract), tokenId },
        data: { price: newPrice },
      });

      console.log(`✅ Updated price for NFT ${tokenId} to ${newPrice} ETH`);
    } catch (error) {
      console.error(`❌ Failed to update price for token ${tokenId}:`, error);
      throw new Error('Failed to update listing price');
    }
  }

  async cancelListing(nftContract: string, tokenId: number): Promise<void> {
    try {
      await prisma.marketplaceListing.updateMany({
        where: { nftContract: ci(nftContract), tokenId },
        data: { active: false },
      });

      console.log(`✅ Cancelled listing for NFT ${tokenId}`);
    } catch (error) {
      console.error(`❌ Failed to cancel listing for token ${tokenId}:`, error);
      throw new Error('Failed to cancel listing');
    }
  }

  async recordSale(
    nftContract: string,
    tokenId: number,
    seller: string,
    buyer: string,
    price: string,
    platformFee: string,
    royaltyFee: string,
    transactionHash: string,
    soldAt?: Date
  ): Promise<void> {
    try {
      // One transaction: the sale row and the closed listing land together or not at all. The old code ran them as two
      // separate statements, so a failure in between left a sold token still listed as active.
      await prisma.$transaction([
        prisma.tradingHistory.create({
          data: {
            nftContract,
            tokenId,
            seller,
            buyer,
            price,
            platformFee,
            royaltyFee,
            transactionHash,
            soldAt: soldAt || new Date(),
          },
        }),
        prisma.marketplaceListing.updateMany({
          where: { nftContract: ci(nftContract), tokenId },
          data: { active: false },
        }),
      ]);

      console.log(`✅ Recorded sale for NFT ${tokenId}: ${seller} → ${buyer} at ${price} ETH`);
    } catch (error) {
      console.error(`❌ Failed to record sale for token ${tokenId}:`, error);
      throw new Error('Failed to record sale');
    }
  }

  async getRecentSales(limit: number = 20): Promise<TradingHistoryRow[]> {
    try {
      const sales = await prisma.tradingHistory.findMany({
        orderBy: [{ soldAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        take: limit,
      });
      return sales.map(toHistoryRow);
    } catch (error) {
      console.error('❌ Failed to get recent sales:', error);
      throw new Error('Failed to retrieve recent sales');
    }
  }

  async getMostExpensiveSales(limit: number = 10): Promise<TradingHistoryRow[]> {
    try {
      // Sorts the TEXT price column exactly as the old ORDER BY price DESC did (see "Known limits" in the README).
      const sales = await prisma.tradingHistory.findMany({
        orderBy: { price: 'desc' },
        take: limit,
      });
      return sales.map(toHistoryRow);
    } catch (error) {
      console.error('❌ Failed to get most expensive sales:', error);
      throw new Error('Failed to retrieve most expensive sales');
    }
  }

  async getActivityHistory(limit: number = 50): Promise<any[]> {
    try {
      // Raw on purpose: one feed built from three tables with UNION ALL and json_build_object. Prisma has no UNION, so this
      // cannot be three findMany calls without pulling every row into Node to merge and sort them there.
      const rows = await prisma.$queryRaw<Array<{
        event_type: string;
        token_id: number;
        timestamp: number;
        block_number: number;
        data: unknown;
      }>>`
        SELECT * FROM (
          -- Minted events
          SELECT
            'nftMinted' as event_type,
            token_id,
            (EXTRACT(EPOCH FROM COALESCE(minted_at, created_at)) * 1000)::float8 as timestamp,
            0 as block_number,
            json_build_object('owner', owner, 'tokenURI', token_uri) as data
          FROM nfts

          UNION ALL

          -- Listed events
          SELECT
            'nftListed' as event_type,
            token_id,
            (EXTRACT(EPOCH FROM COALESCE(listed_at, created_at)) * 1000)::float8 as timestamp,
            0 as block_number,
            json_build_object('seller', seller, 'price', price) as data
          FROM marketplace_listings

          UNION ALL

          -- Sold events
          SELECT
            'nftSold' as event_type,
            token_id,
            (EXTRACT(EPOCH FROM COALESCE(sold_at, created_at)) * 1000)::float8 as timestamp,
            0 as block_number,
            json_build_object('seller', seller, 'buyer', buyer, 'price', price, 'platformFee', platform_fee, 'royaltyFee', royalty_fee) as data
          FROM trading_history
        ) combined
        ORDER BY timestamp DESC
        LIMIT ${limit}`;

      return rows.map(row => ({
        type: row.event_type,
        tokenId: row.token_id,
        timestamp: Math.floor(Number(row.timestamp)),
        blockNumber: row.block_number,
        data: row.data,
      }));
    } catch (error) {
      console.error('❌ Failed to get activity history:', error);
      throw new Error('Failed to retrieve activity history');
    }
  }

  async getListingsByPriceRange(
    minPrice: string,
    maxPrice: string
  ): Promise<MarketplaceListingRow[]> {
    try {
      // String comparison on the TEXT price column, as before (see "Known limits" in the README).
      const listings = await prisma.marketplaceListing.findMany({
        where: { active: true, price: { gte: minPrice, lte: maxPrice } },
        orderBy: { price: 'asc' },
      });
      return listings.map(toListingRow);
    } catch (error) {
      console.error('❌ Failed to get listings by price range:', error);
      throw new Error('Failed to retrieve listings by price range');
    }
  }
}

export const marketplaceService = new MarketplaceService();
