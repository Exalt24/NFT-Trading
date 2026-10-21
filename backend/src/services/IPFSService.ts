import { pinata, getIPFSUrl } from '../config/ipfs.js';
import { prisma } from '../config/database.js';
import type { Prisma } from '../generated/prisma/client.js';
import type {
  NFTMetadata,
  IPFSUploadResult,
  ImageUploadOptions,
  MetadataUploadResult,
} from '../types/nft.js';

export class IPFSService {
  async uploadImage(
    imageBuffer: Buffer,
    options: ImageUploadOptions = {}
  ): Promise<IPFSUploadResult> {
    if (!pinata) {
      throw new Error('Pinata not configured. Set PINATA_JWT in environment.');
    }

    const filename = options.filename || `nft-image-${Date.now()}.png`;
    const contentType = options.contentType || 'image/png';

    try {
      const file = new File([imageBuffer], filename, { type: contentType });
      const upload = await pinata.upload.file(file);
     
      const cid = (upload as any).IpfsHash || (upload as any).cid;
      const url = getIPFSUrl(cid);

      console.log(`✅ Image uploaded to IPFS: ${cid}`);

      return {
        cid,
        url,
        gateway: url,
      };
    } catch (error) {
      console.error('❌ Failed to upload image to IPFS:', error);
      throw new Error('Image upload to IPFS failed');
    }
  }

  async uploadMetadata(metadata: NFTMetadata): Promise<MetadataUploadResult> {
    if (!pinata) {
      throw new Error('Pinata not configured. Set PINATA_JWT in environment.');
    }

    try {
      const upload = await pinata.upload.json(metadata);
      const cid = (upload as any).IpfsHash || (upload as any).cid;
      const url = getIPFSUrl(cid);

      await this.cacheMetadata(cid, metadata);

      console.log(`✅ Metadata uploaded to IPFS: ${cid}`);

      return {
        cid,
        url,
        gateway: url,
        metadata,
      };
    } catch (error) {
      console.error('❌ Failed to upload metadata to IPFS:', error);
      throw new Error('Metadata upload to IPFS failed');
    }
  }

  async getMetadata(cid: string): Promise<NFTMetadata | null> {
    const cached = await this.getCachedMetadata(cid);
    if (cached) {
      console.log(`📦 Retrieved metadata from cache: ${cid}`);
      return cached;
    }

    try {
      const url = getIPFSUrl(cid);
      const response = await fetch(url);
     
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metadata = await response.json() as NFTMetadata;
     
      await this.cacheMetadata(cid, metadata);
     
      console.log(`✅ Retrieved metadata from IPFS: ${cid}`);
      return metadata;
    } catch (error) {
      // Silently handle missing IPFS data - common for test URIs
      return null;
    }
  }

  private async cacheMetadata(cid: string, metadata: NFTMetadata): Promise<void> {
    try {
      const json = metadata as unknown as Prisma.InputJsonValue;
      await prisma.ipfsMetadataCache.upsert({
        where: { cid },
        create: { cid, metadata: json, cachedAt: new Date() },
        update: { metadata: json, cachedAt: new Date() },
      });
    } catch (error) {
      console.error('⚠️  Failed to cache metadata:', error);
    }
  }

  private async getCachedMetadata(cid: string): Promise<NFTMetadata | null> {
    try {
      const cached = await prisma.ipfsMetadataCache.findUnique({ where: { cid } });
      return cached ? (cached.metadata as unknown as NFTMetadata) : null;
    } catch (error) {
      console.error('⚠️  Failed to retrieve cached metadata:', error);
      return null;
    }
  }

  createMetadataFromImageCID(
    imageCID: string,
    name: string,
    description: string,
    attributes: Array<{ trait_type: string; value: string | number }> = []
  ): NFTMetadata {
    return {
      name,
      description,
      image: `ipfs://${imageCID}`,
      attributes,
    };
  }

  getTokenURI(metadataCID: string): string {
    return `ipfs://${metadataCID}`;
  }
}

export const ipfsService = new IPFSService();