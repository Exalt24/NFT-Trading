/** ERC-721 token metadata as pinned to IPFS and cached in the `ipfs_metadata_cache` table. */
export interface NFTMetadata {
  name: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  [key: string]: unknown;
}

export interface ImageUploadOptions {
  filename?: string;
  contentType?: string;
}

export interface IPFSUploadResult {
  cid: string;
  url: string;
  gateway: string;
}

export interface MetadataUploadResult extends IPFSUploadResult {
  metadata: NFTMetadata;
}
