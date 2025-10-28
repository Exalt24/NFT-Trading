import { pool } from '../config/database.js';
import type { MarketplaceListingRow, TradingHistoryRow } from '../types/database.js';

export class MarketplaceService {
  async getActiveListings(): Promise<MarketplaceListingRow[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM marketplace_listings 
         WHERE active = true 
         ORDER BY listed_at DESC NULLS LAST, created_at DESC`
      );

      return result.rows as MarketplaceListingRow[];
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
      const result = await pool.query(
        `SELECT * FROM marketplace_listings 
         WHERE LOWER(nft_contract) = LOWER($1) 
         AND token_id = $2`,
        [nftContract, tokenId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as MarketplaceListingRow;
    } catch (error) {
      console.error(`❌ Failed to get listing for token ${tokenId}:`, error);
      throw new Error('Failed to retrieve listing');
    }
  }

  async getListingsBySeller(seller: string): Promise<MarketplaceListingRow[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM marketplace_listings 
         WHERE LOWER(seller) = LOWER($1) 
         ORDER BY active DESC, listed_at DESC NULLS LAST`,
        [seller]
      );

      return result.rows as MarketplaceListingRow[];
    } catch (error) {
      console.error(`❌ Failed to get listings for seller ${seller}:`, error);
      throw new Error('Failed to retrieve seller listings');
    }
  }

  async getFloorPrice(): Promise<string> {
    try {
      const result = await pool.query(
        `SELECT MIN(price) as floor_price 
         FROM marketplace_listings 
         WHERE active = true`
      );

      const floorPrice = result.rows[0].floor_price;
      return floorPrice ? floorPrice.toString() : '0';
    } catch (error) {
      console.error('❌ Failed to get floor price:', error);
      throw new Error('Failed to retrieve floor price');
    }
  }

  async getTradingVolume(): Promise<{ totalVolume: string; totalSales: number }> {
    try {
      const result = await pool.query(
        `SELECT 
          COALESCE(SUM(CAST(price AS numeric)), 0)::text as total_volume,
          COUNT(*)::integer as total_sales
        FROM trading_history`
      );

      return {
        totalVolume: result.rows[0].total_volume || '0',
        totalSales: parseInt(result.rows[0].total_sales) || 0
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
      const result = await pool.query(
        `SELECT * FROM trading_history 
         WHERE LOWER(nft_contract) = LOWER($1) 
         AND token_id = $2 
         ORDER BY sold_at DESC NULLS LAST, created_at DESC`,
        [nftContract, tokenId]
      );

      return result.rows as TradingHistoryRow[];
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
      await pool.query(
        `INSERT INTO marketplace_listings 
         (nft_contract, token_id, seller, price, active, listed_at)
         VALUES ($1, $2, $3, $4, true, $5)
         ON CONFLICT (nft_contract, token_id) DO UPDATE SET
           seller = $3,
           price = $4,
           active = true,
           listed_at = $5,
           updated_at = NOW()`,
        [nftContract, tokenId, seller, price, listedAt || new Date()]
      );

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
      await pool.query(
        `UPDATE marketplace_listings 
         SET price = $1, updated_at = NOW() 
         WHERE LOWER(nft_contract) = LOWER($2) 
         AND token_id = $3`,
        [newPrice, nftContract, tokenId]
      );

      console.log(`✅ Updated price for NFT ${tokenId} to ${newPrice} ETH`);
    } catch (error) {
      console.error(`❌ Failed to update price for token ${tokenId}:`, error);
      throw new Error('Failed to update listing price');
    }
  }

  async cancelListing(nftContract: string, tokenId: number): Promise<void> {
    try {
      await pool.query(
        `UPDATE marketplace_listings 
         SET active = false, updated_at = NOW() 
         WHERE LOWER(nft_contract) = LOWER($1) 
         AND token_id = $2`,
        [nftContract, tokenId]
      );

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
      await pool.query(
        `INSERT INTO trading_history 
         (nft_contract, token_id, seller, buyer, price, platform_fee, royalty_fee, transaction_hash, sold_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          nftContract,
          tokenId,
          seller,
          buyer,
          price,
          platformFee,
          royaltyFee,
          transactionHash,
          soldAt || new Date(),
        ]
      );

      await this.cancelListing(nftContract, tokenId);

      console.log(`✅ Recorded sale for NFT ${tokenId}: ${seller} → ${buyer} at ${price} ETH`);
    } catch (error) {
      console.error(`❌ Failed to record sale for token ${tokenId}:`, error);
      throw new Error('Failed to record sale');
    }
  }

  async getRecentSales(limit: number = 20): Promise<TradingHistoryRow[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM trading_history 
         ORDER BY sold_at DESC NULLS LAST, created_at DESC 
         LIMIT $1`,
        [limit]
      );

      return result.rows as TradingHistoryRow[];
    } catch (error) {
      console.error('❌ Failed to get recent sales:', error);
      throw new Error('Failed to retrieve recent sales');
    }
  }

  async getMostExpensiveSales(limit: number = 10): Promise<TradingHistoryRow[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM trading_history 
         ORDER BY price DESC 
         LIMIT $1`,
        [limit]
      );

      return result.rows as TradingHistoryRow[];
    } catch (error) {
      console.error('❌ Failed to get most expensive sales:', error);
      throw new Error('Failed to retrieve most expensive sales');
    }
  }

  async getListingsByPriceRange(
    minPrice: string,
    maxPrice: string
  ): Promise<MarketplaceListingRow[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM marketplace_listings 
         WHERE active = true 
         AND price >= $1 
         AND price <= $2 
         ORDER BY price ASC`,
        [minPrice, maxPrice]
      );

      return result.rows as MarketplaceListingRow[];
    } catch (error) {
      console.error('❌ Failed to get listings by price range:', error);
      throw new Error('Failed to retrieve listings by price range');
    }
  }
}

export const marketplaceService = new MarketplaceService();