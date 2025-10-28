import { pool } from '../config/database.js';
import type { PlatformStats, Trader, VolumeData, Sale } from '../types/database.js';

export class AnalyticsService {
  async getPlatformStats(): Promise<PlatformStats> {
    try {
      const salesResult = await pool.query(
        `SELECT 
          COUNT(*) as total_sales, 
          COALESCE(SUM(CAST(price AS numeric)), 0) as total_volume, 
          COALESCE(AVG(CAST(price AS numeric)), 0) as avg_price 
        FROM trading_history`
      );

      // FIXED: Count unique addresses across both sellers and buyers (no double counting)
      const tradersResult = await pool.query(
        `SELECT COUNT(DISTINCT address) as unique_traders 
        FROM (
          SELECT DISTINCT LOWER(seller) as address FROM trading_history
          UNION
          SELECT DISTINCT LOWER(buyer) as address FROM trading_history
        ) AS all_traders`
      );

      const floorResult = await pool.query(
        `SELECT COALESCE(MIN(CAST(price AS numeric)), 0) as floor_price 
        FROM marketplace_listings 
        WHERE active = true`
      );

      const highestResult = await pool.query(
        'SELECT COALESCE(MAX(CAST(price AS numeric)), 0) as highest_sale FROM trading_history'
      );

      return {
        totalSales: parseInt(salesResult.rows[0].total_sales) || 0,
        totalVolume: salesResult.rows[0].total_volume.toString(),
        uniqueTraders: parseInt(tradersResult.rows[0].unique_traders) || 0,
        avgPrice: salesResult.rows[0].avg_price.toString(),
        floorPrice: floorResult.rows[0].floor_price.toString(),
        highestSale: highestResult.rows[0].highest_sale.toString(),
      };
    } catch (error) {
      console.error('❌ Failed to get platform stats:', error);
      throw new Error('Failed to retrieve platform statistics');
    }
  }

  async getTopTraders(limit: number = 10): Promise<Trader[]> {
    try {
      const result = await pool.query(
        `WITH all_trades AS (
          SELECT seller as address, CAST(price AS numeric) as price FROM trading_history
          UNION ALL
          SELECT buyer as address, CAST(price AS numeric) as price FROM trading_history
        )
        SELECT 
          address,
          COUNT(*) as trades_count,
          SUM(price) as total_volume,
          AVG(price) as average_price
        FROM all_trades
        GROUP BY address
        ORDER BY total_volume DESC
        LIMIT $1`,
        [limit]
      );

      return result.rows.map(row => ({
        address: row.address,
        tradesCount: parseInt(row.trades_count),
        totalVolume: row.total_volume.toString(),
        avgPrice: row.average_price.toString(),
      }));
    } catch (error) {
      console.error('❌ Failed to get top traders:', error);
      throw new Error('Failed to retrieve top traders');
    }
  }

  async getTradingVolumeOverTime(days: number = 30): Promise<VolumeData[]> {
    try {
      const result = await pool.query(
        `SELECT 
          DATE(sold_at) as date,
          COALESCE(SUM(CAST(price AS numeric)), 0) as volume,
          COUNT(*) as sales_count
        FROM trading_history
        WHERE sold_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(sold_at)
        ORDER BY date ASC`
      );

      return result.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        volume: row.volume.toString(),
        salesCount: parseInt(row.sales_count),
      }));
    } catch (error) {
      console.error('❌ Failed to get trading volume over time:', error);
      throw new Error('Failed to retrieve trading volume over time');
    }
  }

  async getMostExpensiveSales(limit: number = 10): Promise<Sale[]> {
    try {
      const result = await pool.query(
        `SELECT 
          token_id,
          price,
          seller,
          buyer,
          sold_at,
          transaction_hash
        FROM trading_history
        ORDER BY CAST(price AS numeric) DESC
        LIMIT $1`,
        [limit]
      );

      return result.rows.map(row => ({
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
    const result = await pool.query(
      `SELECT 
        CASE 
          WHEN CAST(price AS numeric) < 0.1 THEN '0.00 - 0.09'
          WHEN CAST(price AS numeric) >= 0.1 AND CAST(price AS numeric) < 0.5 THEN '0.10 - 0.49'
          WHEN CAST(price AS numeric) >= 0.5 AND CAST(price AS numeric) < 1.0 THEN '0.50 - 0.99'
          WHEN CAST(price AS numeric) >= 1.0 AND CAST(price AS numeric) < 5.0 THEN '1.00 - 4.99'
          WHEN CAST(price AS numeric) >= 5.0 AND CAST(price AS numeric) < 10.0 THEN '5.00 - 9.99'
          ELSE '10.00+'
        END as range,
        COUNT(*) as count
      FROM marketplace_listings
      WHERE active = true
      GROUP BY range
      ORDER BY 
        MIN(CAST(price AS numeric))`
    );

    return result.rows.map(row => ({
      range: row.range,
      count: parseInt(row.count),
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

      // 1. Count total NFTs minted
      const mintedResult = await pool.query(
        `SELECT COUNT(*) as total_minted 
       FROM nfts 
       WHERE LOWER(royalty_receiver) = LOWER($1)`,
        [creatorAddress]
      );
      const totalMinted = parseInt(mintedResult.rows[0].total_minted) || 0;
      console.log(`📊 Total Minted: ${totalMinted}`);

      // 2. Get ALL sales where creator was seller
      const salesResult = await pool.query(
        `SELECT 
        token_id,
        price,
        buyer,
        platform_fee,
        royalty_fee,
        sold_at,
        CAST(price AS numeric) as price_numeric,
        CAST(platform_fee AS numeric) as platform_fee_numeric,
        CAST(royalty_fee AS numeric) as royalty_fee_numeric
       FROM trading_history
       WHERE LOWER(seller) = LOWER($1)
       ORDER BY sold_at DESC`,
        [creatorAddress]
      );

      const totalSold = salesResult.rows.length;

      // Calculate BOTH gross and net
      let totalGrossSales = 0;     // What buyers paid (for average)
      let totalNetRevenue = 0;     // What creator received (for revenue)

      salesResult.rows.forEach((row, index) => {
        const grossPrice = Number(row.price_numeric) || 0;
        const platformFee = Number(row.platform_fee_numeric) || 0;
        const royaltyFee = Number(row.royalty_fee_numeric) || 0;
        const netProceeds = grossPrice - platformFee - royaltyFee;

        totalGrossSales += grossPrice;
        totalNetRevenue += netProceeds;
      });

      const avgPrice = totalSold > 0 ? (totalGrossSales / totalSold) : 0;

      const salesHistory = salesResult.rows.map(row => ({
        tokenId: row.token_id,
        price: row.price,
        buyer: row.buyer,
        soldAt: row.sold_at,
        platformFee: row.platform_fee,
        royaltyFee: row.royalty_fee,
      }));

      // 3. Floor price
      const floorPriceResult = await pool.query(
        `SELECT COALESCE(MIN(CAST(price AS numeric)), 0) as floor_price 
       FROM marketplace_listings 
       WHERE LOWER(seller) = LOWER($1) 
       AND active = true`,
        [creatorAddress]
      );
      const floorPrice = Number(floorPriceResult.rows[0].floor_price) || 0;

      // 4. Royalties
      const royaltiesResult = await pool.query(
        `SELECT 
        th.token_id,
        th.royalty_fee,
        th.sold_at,
        CAST(th.royalty_fee AS numeric) as royalty_numeric
       FROM trading_history th
       INNER JOIN nfts n ON th.token_id = n.token_id
       WHERE LOWER(n.royalty_receiver) = LOWER($1)
       AND LOWER(th.seller) != LOWER($1)
       AND CAST(th.royalty_fee AS numeric) > 0
       ORDER BY th.sold_at DESC`,
        [creatorAddress]
      );

      const totalRoyalties = royaltiesResult.rows.reduce(
        (sum, row) => sum + (Number(row.royalty_numeric) || 0),
        0
      );

      const royaltyHistory = royaltiesResult.rows.map(row => ({
        tokenId: row.token_id,
        royaltyFee: row.royalty_fee,
        soldAt: row.sold_at,
      }));

      const result = {
        totalMinted,
        totalSold,
        totalRevenue: totalNetRevenue.toString(),
        totalRoyalties: totalRoyalties.toString(),
        avgPrice: avgPrice.toString(),
        floorPrice: floorPrice.toString(),
        salesHistory,
        royaltyHistory,
      };

      return result;
    } catch (error) {
      console.error(`❌ Failed to get creator stats:`, error);
      throw new Error('Failed to retrieve creator statistics');
    }
  }

  async getVolumeByNFT(limit: number = 10): Promise<Array<{ tokenId: number; totalVolume: string; salesCount: number }>> {
    try {
      const result = await pool.query(
        `SELECT 
          token_id,
          SUM(CAST(price AS numeric)) as volume,
          COUNT(*) as sales_count
        FROM trading_history
        GROUP BY token_id
        ORDER BY volume DESC
        LIMIT $1`,
        [limit]
      );

      return result.rows.map(row => ({
        tokenId: row.token_id,
        totalVolume: row.volume.toString(),
        salesCount: parseInt(row.sales_count),
      }));
    } catch (error) {
      console.error('❌ Failed to get volume by NFT:', error);
      throw new Error('Failed to retrieve volume by NFT');
    }
  }

  async getSalesByTimeOfDay(): Promise<Array<{ hour: number; salesCount: number }>> {
    try {
      const result = await pool.query(
        `SELECT 
          EXTRACT(HOUR FROM sold_at) as hour,
          COUNT(*) as count
        FROM trading_history
        WHERE sold_at IS NOT NULL
        GROUP BY hour
        ORDER BY hour`
      );

      return result.rows.map(row => ({
        hour: parseInt(row.hour),
        salesCount: parseInt(row.count),
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
      const ownedResult = await pool.query(
        'SELECT COUNT(*) as count FROM nfts WHERE LOWER(owner) = LOWER($1)',
        [address]
      );

      const mintedResult = await pool.query(
        'SELECT COUNT(*) as count FROM nfts WHERE LOWER(owner) = LOWER($1) AND minted_at IS NOT NULL',
        [address]
      );

      const salesResult = await pool.query(
        'SELECT COUNT(*) as count, COALESCE(SUM(CAST(price AS numeric)), 0) as volume FROM trading_history WHERE LOWER(seller) = LOWER($1)',
        [address]
      );

      const purchasesResult = await pool.query(
        'SELECT COUNT(*) as count, COALESCE(SUM(CAST(price AS numeric)), 0) as volume FROM trading_history WHERE LOWER(buyer) = LOWER($1)',
        [address]
      );

      const listingsResult = await pool.query(
        'SELECT COUNT(*) as count FROM marketplace_listings WHERE LOWER(seller) = LOWER($1) AND active = true',
        [address]
      );

      return {
        nftsOwned: parseInt(ownedResult.rows[0].count),
        nftsMinted: parseInt(mintedResult.rows[0].count),
        totalSales: parseInt(salesResult.rows[0].count),
        totalPurchases: parseInt(purchasesResult.rows[0].count),
        volumeAsSeller: salesResult.rows[0].volume.toString(),
        volumeAsBuyer: purchasesResult.rows[0].volume.toString(),
        activeListings: parseInt(listingsResult.rows[0].count),
      };
    } catch (error) {
      console.error(`❌ Failed to get user stats for ${address}:`, error);
      throw new Error('Failed to retrieve user statistics');
    }
  }
}



export const analyticsService = new AnalyticsService();