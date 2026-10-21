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
      // Raw on purpose: price is a TEXT wei string, so MIN() and orderBy would compare it as text and pick 10 ETH over 9 ETH.
      // This orders by CAST(price AS numeric) and returns the stored text of the cheapest row unchanged.
      const rows = await prisma.$queryRaw<Array<{ price: string }>>`
        SELECT price
        FROM marketplace_listings
        WHERE active = true
        ORDER BY CAST(price AS numeric) ASC
        LIMIT 1`;
      return rows[0]?.price ?? '0';
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
      // The order is a numeric one: price is a TEXT wei string, which orderBy would sort as text (9 ETH above 10 ETH). A raw query
      // picks the ids by CAST(price AS numeric), then Prisma loads the rows and they are put back in that order.
      const ranked = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id
        FROM trading_history
        ORDER BY CAST(price AS numeric) DESC, id ASC
        LIMIT ${limit}`;
      const sales = await prisma.tradingHistory.findMany({ where: { id: { in: ranked.map(r => r.id) } } });
      const byId = new Map(sales.map(sale => [sale.id, sale]));
      return ranked.map(r => toHistoryRow(byId.get(r.id)!));
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
      // Numeric, not text: price is a TEXT wei string, so a text comparison let 0.5 ETH and 10 ETH into a 1 to 9.5 ETH range.
      // Both bounds are bound parameters cast to numeric in SQL (a decimal point or an exponent is fine, anything else is an error).
      // A raw query picks the ids in price order, then Prisma loads the rows and they are put back in that order.
      const ranked = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id
        FROM marketplace_listings
        WHERE active = true
          AND CAST(price AS numeric) >= CAST(${minPrice} AS numeric)
          AND CAST(price AS numeric) <= CAST(${maxPrice} AS numeric)
        ORDER BY CAST(price AS numeric) ASC, id ASC`;
      const listings = await prisma.marketplaceListing.findMany({ where: { id: { in: ranked.map(r => r.id) } } });
      const byId = new Map(listings.map(listing => [listing.id, listing]));
      return ranked.map(r => toListingRow(byId.get(r.id)!));
    } catch (error) {
      console.error('❌ Failed to get listings by price range:', error);
      throw new Error('Failed to retrieve listings by price range');
    }
  }
}

export const marketplaceService = new MarketplaceService();
