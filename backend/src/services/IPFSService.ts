import { pinata, getIPFSUrl } from '../config/ipfs.js';
import { pool } from '../config/database.js';
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
      await pool.query(
        `INSERT INTO ipfs_metadata_cache (cid, metadata, cached_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (cid) DO UPDATE
         SET metadata = $2, cached_at = NOW()`,
        [cid, JSON.stringify(metadata)]
      );
    } catch (error) {
      console.error('⚠️  Failed to cache metadata:', error);
    }
  }

  private async getCachedMetadata(cid: string): Promise<NFTMetadata | null> {
    try {
      const result = await pool.query(
        'SELECT metadata FROM ipfs_metadata_cache WHERE cid = $1',
        [cid]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].metadata as NFTMetadata;
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