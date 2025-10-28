import { pool } from '../config/database.js';
import { ipfsService } from './IPFSService.js';
import type { NFTRow, NFTMetadata } from '../types/database.js';

export class NFTService {
  async getNFTById(tokenId: number): Promise<NFTRow | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM nfts WHERE token_id = $1',
        [tokenId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as NFTRow;
    } catch (error) {
      console.error(`❌ Failed to get NFT ${tokenId}:`, error);
      throw new Error('Failed to retrieve NFT');
    }
  }

  async getNFTsByOwner(owner: string): Promise<NFTRow[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM nfts WHERE LOWER(owner) = LOWER($1) ORDER BY token_id DESC',
        [owner]
      );

      return result.rows as NFTRow[];
    } catch (error) {
      console.error(`❌ Failed to get NFTs for owner ${owner}:`, error);
      throw new Error('Failed to retrieve NFTs by owner');
    }
  }

  async getNFTMetadata(tokenId: number): Promise<NFTMetadata | null> {
    try {
      const nft = await this.getNFTById(tokenId);
      
      if (!nft) {
        return null;
      }

      if (nft.metadata) {
        return nft.metadata as unknown as NFTMetadata;
      }

      if (nft.ipfs_cid) {
        const metadata = await ipfsService.getMetadata(nft.ipfs_cid);
        
        if (metadata) {
          await this.updateNFTMetadata(tokenId, metadata);
        }
        
        return metadata;
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to get metadata for NFT ${tokenId}:`, error);
      return null;
    }
  }

  async getTotalSupply(): Promise<number> {
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM nfts');
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('❌ Failed to get total supply:', error);
      throw new Error('Failed to retrieve total supply');
    }
  }

  async getRecentlyMinted(limit: number = 20): Promise<NFTRow[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM nfts ORDER BY minted_at DESC NULLS LAST, token_id DESC LIMIT $1',
        [limit]
      );

      return result.rows as NFTRow[];
    } catch (error) {
      console.error('❌ Failed to get recently minted NFTs:', error);
      throw new Error('Failed to retrieve recently minted NFTs');
    }
  }

  async updateNFTOwner(tokenId: number, newOwner: string): Promise<void> {
    try {
      await pool.query(
        'UPDATE nfts SET owner = $1, updated_at = NOW() WHERE token_id = $2',
        [newOwner, tokenId]
      );

      console.log(`✅ Updated owner for NFT ${tokenId} to ${newOwner}`);
    } catch (error) {
      console.error(`❌ Failed to update owner for NFT ${tokenId}:`, error);
      throw new Error('Failed to update NFT owner');
    }
  }

  async updateNFTRoyalty(tokenId: number, receiver: string, amount: number): Promise<void> {
    try {
      await pool.query(
        'UPDATE nfts SET royalty_receiver = $1, royalty_amount = $2, updated_at = NOW() WHERE token_id = $3',
        [receiver, amount, tokenId]
      );

      console.log(`✅ Updated royalty for NFT ${tokenId}: ${receiver} at ${amount / 100}%`);
    } catch (error) {
      console.error(`❌ Failed to update royalty for NFT ${tokenId}:`, error);
      throw new Error('Failed to update NFT royalty');
    }
  }

  async updateNFTMetadata(tokenId: number, metadata: NFTMetadata): Promise<void> {
    try {
      await pool.query(
        'UPDATE nfts SET metadata = $1, updated_at = NOW() WHERE token_id = $2',
        [JSON.stringify(metadata), tokenId]
      );
    } catch (error) {
      console.error(`❌ Failed to update metadata for NFT ${tokenId}:`, error);
    }
  }

  async createNFT(
    tokenId: number,
    owner: string,
    tokenURI: string,
    ipfsCID?: string,
    metadata?: NFTMetadata,
    royaltyReceiver?: string,
    royaltyAmount?: number,
    mintedAt?: Date
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO nfts (
          token_id, owner, token_uri, ipfs_cid, metadata, 
          royalty_receiver, royalty_amount, minted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (token_id) DO UPDATE SET
          owner = $2,
          token_uri = $3,
          ipfs_cid = $4,
          metadata = $5,
          royalty_receiver = $6,
          royalty_amount = $7,
          updated_at = NOW()`,
        [
          tokenId,
          owner,
          tokenURI,
          ipfsCID || null,
          metadata ? JSON.stringify(metadata) : null,
          royaltyReceiver || null,
          royaltyAmount || null,
          mintedAt || new Date(),
        ]
      );

      console.log(`✅ Created/Updated NFT ${tokenId} in database`);
    } catch (error) {
      console.error(`❌ Failed to create NFT ${tokenId}:`, error);
      throw new Error('Failed to create NFT in database');
    }
  }

  async searchNFTs(query: string, limit: number = 20): Promise<NFTRow[]> {
    try {
      const searchPattern = `%${query}%`;
      const result = await pool.query(
        `SELECT * FROM nfts 
         WHERE token_id::text LIKE $1 
         OR LOWER(owner) LIKE LOWER($1)
         OR metadata->>'name' ILIKE $1
         ORDER BY token_id DESC
         LIMIT $2`,
        [searchPattern, limit]
      );

      return result.rows as NFTRow[];
    } catch (error) {
      console.error('❌ Failed to search NFTs:', error);
      throw new Error('Failed to search NFTs');
    }
  }
}

export const nftService = new NFTService();