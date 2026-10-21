import { prisma } from '../config/database.js';
import { ci } from './prismaHelpers.js';
import type { PlatformStats, Trader, VolumeData, Sale } from '../types/database.js';

// Why so many $queryRaw calls in this file: price, platform_fee and royalty_fee are TEXT columns holding wei strings, so every sum,
// average, minimum and sort by value needs CAST(... AS numeric), and Prisma's aggregate() and orderBy cannot cast. The numeric results
// are cast to text in SQL so a 19-digit wei total stays exact (a JS number or Prisma's Decimal would not print the same digits).
// COUNT is cast to integer because Prisma returns a bigint for it, which JSON.stringify refuses to serialize.
// Every raw statement uses bound parameters through the tagged template, never string concatenation.
// COPY-OK: the template literals in this file are SQL statements, not screen text.

export class AnalyticsService {
  async getPlatformStats(): Promise<PlatformStats> {
    try {
      // COPY-OK: SQL statement, not screen text
      const sales = await prisma.$queryRaw<Array<{ total_sales: number; total_volume: string; avg_price: string }>>`
        SELECT
          COUNT(*)::integer AS total_sales,
          COALESCE(SUM(CAST(price AS numeric)), 0)::text AS total_volume,
          COALESCE(AVG(CAST(price AS numeric)), 0)::text AS avg_price
        FROM trading_history`;

      // FIXED: Count unique addresses across both sellers and buyers (no double counting)
      // COPY-OK: SQL statement, not screen text
      const traders = await prisma.$queryRaw<Array<{ unique_traders: number }>>`
        SELECT COUNT(DISTINCT address)::integer AS unique_traders
        FROM (
          SELECT DISTINCT LOWER(seller) AS address FROM trading_history
          UNION
          SELECT DISTINCT LOWER(buyer) AS address FROM trading_history
        ) AS all_traders`;

      // COPY-OK: SQL statement, not screen text
      const floor = await prisma.$queryRaw<Array<{ floor_price: string }>>`
        SELECT COALESCE(MIN(CAST(price AS numeric)), 0)::text AS floor_price
        FROM marketplace_listings
        WHERE active = true`;

      // COPY-OK: SQL statement, not screen text
      const highest = await prisma.$queryRaw<Array<{ highest_sale: string }>>`
        SELECT COALESCE(MAX(CAST(price AS numeric)), 0)::text AS highest_sale FROM trading_history`;

      return {
        totalSales: sales[0].total_sales || 0,
        totalVolume: sales[0].total_volume,
        uniqueTraders: traders[0].unique_traders || 0,
        avgPrice: sales[0].avg_price,
        floorPrice: floor[0].floor_price,
        highestSale: highest[0].highest_sale,
      };
    } catch (error) {
      console.error('❌ Failed to get platform stats:', error);
      throw new Error('Failed to retrieve platform statistics');
    }
  }

  async getTopTraders(limit: number = 10): Promise<Trader[]> {
    try {
      // The ORDER BY repeats SUM(price) instead of naming total_volume: that name is the text-cast output column, and sorting by it would sort as text.
      // COPY-OK: SQL statement, not screen text
      const rows = await prisma.$queryRaw<Array<{ address: string; trades_count: number; total_volume: string; average_price: string }>>`
        WITH all_trades AS (
          SELECT seller AS address, CAST(price AS numeric) AS price FROM trading_history
          UNION ALL
          SELECT buyer AS address, CAST(price AS numeric) AS price FROM trading_history
        )
        SELECT
          address,
          COUNT(*)::integer AS trades_count,
          SUM(price)::text AS total_volume,
          AVG(price)::text AS average_price
        FROM all_trades
        GROUP BY address
        ORDER BY SUM(price) DESC
        LIMIT ${limit}`;

      return rows.map(row => ({
        address: row.address,
        tradesCount: row.trades_count,
        totalVolume: row.total_volume,
        avgPrice: row.average_price,
      }));
    } catch (error) {
      console.error('❌ Failed to get top traders:', error);
      throw new Error('Failed to retrieve top traders');
    }
  }

  async getTradingVolumeOverTime(days: number = 30): Promise<VolumeData[]> {
    try {
      // The window length is a bound parameter (make_interval), where the old code pasted ${days} into the SQL text.
      // COPY-OK: SQL statement, not screen text
      const rows = await prisma.$queryRaw<Array<{ date: Date; volume: string; sales_count: number }>>`
        SELECT
          DATE(sold_at) AS date,
          COALESCE(SUM(CAST(price AS numeric)), 0)::text AS volume,
          COUNT(*)::integer AS sales_count
        FROM trading_history
        WHERE sold_at >= NOW() - make_interval(days => ${days}::integer)
        GROUP BY DATE(sold_at)
        ORDER BY date ASC`;

      return rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        volume: row.volume,
        salesCount: row.sales_count,
      }));
    } catch (error) {
      console.error('❌ Failed to get trading volume over time:', error);
      throw new Error('Failed to retrieve trading volume over time');
    }
  }

  async getMostExpensiveSales(limit: number = 10): Promise<Sale[]> {
    try {
      // COPY-OK: SQL statement, not screen text
      const rows = await prisma.$queryRaw<Array<{
        token_id: number;
        price: string;
        seller: string;
        buyer: string;
        sold_at: Date | null;
        transaction_hash: string | null;
      }>>`
        SELECT
          token_id,
          price,
          seller,
          buyer,
          sold_at,
          transaction_hash
        FROM trading_history
        ORDER BY CAST(price AS numeric) DESC
        LIMIT ${limit}`;

      return rows.map(row => ({
        tokenId: row.token_id,
        price: row.price,
        seller: row.seller,
        buyer: row.buyer,
        soldAt: row.sold_at,
        transactionHash: row.transaction_hash || '',
      }));
    } catch (error) {
      console.error('❌ Failed to get most expensive sales:', error);
      throw new Error('Failed to retrieve most expensive sales');
    }
  }

  async getPriceDistribution(): Promise<Array<{ range: string; count: number }>> {
    try {
      // A CASE bucket plus GROUP BY on the bucket: not expressible in Prisma Client.
      // COPY-OK: SQL statement, not screen text
      const rows = await prisma.$queryRaw<Array<{ range: string; count: number }>>`
        SELECT
          CASE
            WHEN CAST(price AS numeric) < 0.1 THEN '0.00 - 0.09'
            WHEN CAST(price AS numeric) >= 0.1 AND CAST(price AS numeric) < 0.5 THEN '0.10 - 0.49'
            WHEN CAST(price AS numeric) >= 0.5 AND CAST(price AS numeric) < 1.0 THEN '0.50 - 0.99'
            WHEN CAST(price AS numeric) >= 1.0 AND CAST(price AS numeric) < 5.0 THEN '1.00 - 4.99'
            WHEN CAST(price AS numeric) >= 5.0 AND CAST(price AS numeric) < 10.0 THEN '5.00 - 9.99'
            ELSE '10.00+'
          END AS range,
          COUNT(*)::integer AS count
        FROM marketplace_listings
        WHERE active = true
        GROUP BY range
        ORDER BY
          MIN(CAST(price AS numeric))`;

      return rows.map(row => ({
        range: row.range,
        count: row.count,
      }));
    } catch (error) {
      console.error('❌ Failed to get price distribution:', error);
      throw new Error('Failed to retrieve price distribution');
    }
  }

  async getCreatorStats(creatorAddress: string): Promise<{
    totalMinted: number;
    totalSold: number;
    totalRevenue: string;
    totalRoyalties: string;
    avgPrice: string;
    floorPrice: string;
    salesHistory: Array<{
      tokenId: number;
      price: string;
      buyer: string;
      soldAt: Date;
      platformFee: string;
      royaltyFee: string;
    }>;
    royaltyHistory: Array<{
      tokenId: number;
      royaltyFee: string;
      soldAt: Date;
    }>;
  }> {
    try {
      // This method is all Prisma Client. Money is summed in JS with Number(), exactly as the old code did after its CAST.

      // 1. Count total NFTs minted
      const totalMinted = await prisma.nft.count({ where: { royaltyReceiver: ci(creatorAddress) } });
      console.log(`📊 Total Minted: ${totalMinted}`);

      // 2. Get ALL sales where creator was seller
      const sales = await prisma.tradingHistory.findMany({
        where: { seller: ci(creatorAddress) },
        orderBy: { soldAt: 'desc' },
      });

      const totalSold = sales.length;

      // Calculate BOTH gross and net
      let totalGrossSales = 0;     // What buyers paid (for average)
      let totalNetRevenue = 0;     // What creator received (for revenue)

      for (const sale of sales) {
        const grossPrice = Number(sale.price) || 0;
        const platformFee = Number(sale.platformFee) || 0;
        const royaltyFee = Number(sale.royaltyFee) || 0;

        totalGrossSales += grossPrice;
        totalNetRevenue += grossPrice - platformFee - royaltyFee;
      }

      const avgPrice = totalSold > 0 ? (totalGrossSales / totalSold) : 0;

      const salesHistory = sales.map(sale => ({
        tokenId: sale.tokenId,
        price: sale.price,
        buyer: sale.buyer,
        soldAt: sale.soldAt as Date,
        platformFee: sale.platformFee,
        royaltyFee: sale.royaltyFee,
      }));

      // 3. Floor price: the creator's cheapest active listing
      const activeListings = await prisma.marketplaceListing.findMany({
        where: { seller: ci(creatorAddress), active: true },
        select: { price: true },
      });
      const floorPrice = activeListings.length > 0
        ? Math.min(...activeListings.map(listing => Number(listing.price))) || 0
        : 0;

      // 4. Royalties: sales of NFTs this creator minted, made by someone else. The `nft` filter is the logical relation in
      // schema.prisma (an inner join on token_id); the fee > 0 test runs in JS because the fee is a TEXT column.
      const royaltySales = (await prisma.tradingHistory.findMany({
        where: {
          nft: { royaltyReceiver: ci(creatorAddress) },
          NOT: { seller: ci(creatorAddress) },
        },
        orderBy: { soldAt: 'desc' },
      })).filter(sale => Number(sale.royaltyFee) > 0);

      const totalRoyalties = royaltySales.reduce(
        (sum, sale) => sum + (Number(sale.royaltyFee) || 0),
        0
      );

      const royaltyHistory = royaltySales.map(sale => ({
        tokenId: sale.tokenId,
        royaltyFee: sale.royaltyFee,
        soldAt: sale.soldAt as Date,
      }));

      return {
        totalMinted,
        totalSold,
        totalRevenue: totalNetRevenue.toString(),
        totalRoyalties: totalRoyalties.toString(),
        avgPrice: avgPrice.toString(),
        floorPrice: floorPrice.toString(),
        salesHistory,
        royaltyHistory,
      };
    } catch (error) {
      console.error(`❌ Failed to get creator stats:`, error);
      throw new Error('Failed to retrieve creator statistics');
    }
  }

  async getVolumeByNFT(limit: number = 10): Promise<Array<{ tokenId: number; totalVolume: string; salesCount: number }>> {
    try {
      // COPY-OK: SQL statement, not screen text
      const rows = await prisma.$queryRaw<Array<{ token_id: number; volume: string; sales_count: number }>>`
        SELECT
          token_id,
          SUM(CAST(price AS numeric))::text AS volume,
          COUNT(*)::integer AS sales_count
        FROM trading_history
        GROUP BY token_id
        ORDER BY SUM(CAST(price AS numeric)) DESC
        LIMIT ${limit}`;

      return rows.map(row => ({
        tokenId: row.token_id,
        totalVolume: row.volume,
        salesCount: row.sales_count,
      }));
    } catch (error) {
      console.error('❌ Failed to get volume by NFT:', error);
      throw new Error('Failed to retrieve volume by NFT');
    }
  }

  async getSalesByTimeOfDay(): Promise<Array<{ hour: number; salesCount: number }>> {
    try {
      // Raw on purpose: grouping by EXTRACT(HOUR ...) of a timestamp has no Prisma Client equivalent.
      // COPY-OK: SQL statement, not screen text
      const rows = await prisma.$queryRaw<Array<{ hour: number; count: number }>>`
        SELECT
          EXTRACT(HOUR FROM sold_at)::integer AS hour,
          COUNT(*)::integer AS count
        FROM trading_history
        WHERE sold_at IS NOT NULL
        GROUP BY hour
        ORDER BY hour`;

      return rows.map(row => ({
        hour: row.hour,
        salesCount: row.count,
      }));
    } catch (error) {
      console.error('❌ Failed to get sales by time of day:', error);
      throw new Error('Failed to retrieve sales by time of day');
    }
  }

  async getUserStats(address: string): Promise<{
    nftsOwned: number;
    nftsMinted: number;
    totalSales: number;
    totalPurchases: number;
    volumeAsSeller: string;
    volumeAsBuyer: string;
    activeListings: number;
  }> {
    try {
      // The three plain counts are Prisma Client. The two volume figures sum a TEXT price, so they stay raw (see the top of the file).
      const [nftsOwned, nftsMinted, activeListings, asSeller, asBuyer] = await Promise.all([
        prisma.nft.count({ where: { owner: ci(address) } }),
        prisma.nft.count({ where: { owner: ci(address), mintedAt: { not: null } } }),
        prisma.marketplaceListing.count({ where: { seller: ci(address), active: true } }),
        // COPY-OK: SQL statement, not screen text
        prisma.$queryRaw<Array<{ count: number; volume: string }>>`
          SELECT COUNT(*)::integer AS count, COALESCE(SUM(CAST(price AS numeric)), 0)::text AS volume
          FROM trading_history WHERE LOWER(seller) = LOWER(${address})`,
        // COPY-OK: SQL statement, not screen text
        prisma.$queryRaw<Array<{ count: number; volume: string }>>`
          SELECT COUNT(*)::integer AS count, COALESCE(SUM(CAST(price AS numeric)), 0)::text AS volume
          FROM trading_history WHERE LOWER(buyer) = LOWER(${address})`,
      ]);

      return {
        nftsOwned,
        nftsMinted,
        totalSales: asSeller[0].count,
        totalPurchases: asBuyer[0].count,
        volumeAsSeller: asSeller[0].volume,
        volumeAsBuyer: asBuyer[0].volume,
        activeListings,
      };
    } catch (error) {
      console.error(`❌ Failed to get user stats for ${address}:`, error);
      throw new Error('Failed to retrieve user statistics');
    }
  }
}

export const analyticsService = new AnalyticsService();
