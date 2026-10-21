import { prisma } from '../config/database.js';
import { Prisma } from '../generated/prisma/client.js';
import { ipfsService } from './IPFSService.js';
import { ci, nowUtc, utc } from './prismaHelpers.js';
import { toNFTRow } from './rowMappers.js';
import type { NFTRow, NFTMetadata } from '../types/database.js';

export class NFTService {
  async getNFTById(tokenId: number): Promise<NFTRow | null> {
    try {
      const nft = await prisma.nft.findUnique({ where: { tokenId } });
      return nft ? toNFTRow(nft) : null;
    } catch (error) {
      console.error(`❌ Failed to get NFT ${tokenId}:`, error);
      throw new Error('Failed to retrieve NFT');
    }
  }

  async getNFTsByOwner(owner: string): Promise<NFTRow[]> {
    try {
      const nfts = await prisma.nft.findMany({
        where: { owner: ci(owner) },
        orderBy: { tokenId: 'desc' },
      });
      return nfts.map(toNFTRow);
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
      return await prisma.nft.count();
    } catch (error) {
      console.error('❌ Failed to get total supply:', error);
      throw new Error('Failed to retrieve total supply');
    }
  }

  async getRecentlyMinted(limit: number = 20): Promise<NFTRow[]> {
    try {
      const nfts = await prisma.nft.findMany({
        orderBy: [{ mintedAt: { sort: 'desc', nulls: 'last' } }, { tokenId: 'desc' }],
        take: limit,
      });
      return nfts.map(toNFTRow);
    } catch (error) {
      console.error('❌ Failed to get recently minted NFTs:', error);
      throw new Error('Failed to retrieve recently minted NFTs');
    }
  }

  // The three updates below use updateMany on purpose: the old UPDATE statements were a silent no-op for an unknown token
  // id (an event can arrive for a token the indexer never stored), while Prisma's update() throws P2025 in that case.
  async updateNFTOwner(tokenId: number, newOwner: string): Promise<void> {
    try {
      await prisma.nft.updateMany({
        where: { tokenId },
        data: { owner: newOwner },
      });

      console.log(`✅ Updated owner for NFT ${tokenId} to ${newOwner}`);
    } catch (error) {
      console.error(`❌ Failed to update owner for NFT ${tokenId}:`, error);
      throw new Error('Failed to update NFT owner');
    }
  }

  async updateNFTRoyalty(tokenId: number, receiver: string, amount: number): Promise<void> {
    try {
      await prisma.nft.updateMany({
        where: { tokenId },
        data: { royaltyReceiver: receiver, royaltyAmount: amount },
      });

      console.log(`✅ Updated royalty for NFT ${tokenId}: ${receiver} at ${amount / 100}%`);
    } catch (error) {
      console.error(`❌ Failed to update royalty for NFT ${tokenId}:`, error);
      throw new Error('Failed to update NFT royalty');
    }
  }

  async updateNFTMetadata(tokenId: number, metadata: NFTMetadata): Promise<void> {
    try {
      await prisma.nft.updateMany({
        where: { tokenId },
        data: { metadata: metadata as unknown as Prisma.InputJsonValue },
      });
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
      // Raw on purpose: Prisma 7's upsert() runs as a SELECT followed by an INSERT or UPDATE, not as INSERT ... ON CONFLICT, so
      // two calls for one token at the same moment make one of them fail with P2002 (tests/db/nft.test.ts reproduces it).
      // One INSERT ... ON CONFLICT statement keeps the old atomicity. It overwrites everything except minted_at, which keeps
      // the time of the first mint. An empty value is stored as NULL, as before (so royaltyAmount 0 becomes NULL).
      await prisma.$executeRaw`
        INSERT INTO nfts (token_id, owner, token_uri, ipfs_cid, metadata, royalty_receiver, royalty_amount, minted_at, created_at, updated_at)
        VALUES (
          ${tokenId}, ${owner}, ${tokenURI}, ${ipfsCID || null},
          ${metadata ? JSON.stringify(metadata) : null}::jsonb,
          ${royaltyReceiver || null}, ${royaltyAmount || null},
          ${utc(mintedAt || new Date())}, ${nowUtc}, ${nowUtc}
        )
        ON CONFLICT (token_id) DO UPDATE SET
          owner = EXCLUDED.owner,
          token_uri = EXCLUDED.token_uri,
          ipfs_cid = EXCLUDED.ipfs_cid,
          metadata = EXCLUDED.metadata,
          royalty_receiver = EXCLUDED.royalty_receiver,
          royalty_amount = EXCLUDED.royalty_amount,
          updated_at = ${nowUtc}`;

      console.log(`✅ Created/Updated NFT ${tokenId} in database`);
    } catch (error) {
      console.error(`❌ Failed to create NFT ${tokenId}:`, error);
      throw new Error('Failed to create NFT in database');
    }
  }

  async searchNFTs(query: string, limit: number = 20): Promise<NFTRow[]> {
    try {
      const searchPattern = `%${query}%`;
      // Raw on purpose: Prisma cannot LIKE-match an Int column (token_id::text) or ILIKE a JSON field's text value
      // (metadata->>'name') inside one OR. The pattern and the limit are bound parameters, never concatenated.
      // The columns are already snake_case, so the rows are returned as they come back.
      return await prisma.$queryRaw<NFTRow[]>(Prisma.sql`
        SELECT * FROM nfts
        WHERE token_id::text LIKE ${searchPattern}
        OR LOWER(owner) LIKE LOWER(${searchPattern})
        OR metadata->>'name' ILIKE ${searchPattern}
        ORDER BY token_id DESC
        LIMIT ${limit}`);
    } catch (error) {
      console.error('❌ Failed to search NFTs:', error);
      throw new Error('Failed to search NFTs');
    }
  }
}

export const nftService = new NFTService();
