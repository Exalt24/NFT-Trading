-- NFT Trading Game Database Schema
-- PostgreSQL 18.0

-- NFTs table: Stores all minted NFTs with metadata
CREATE TABLE IF NOT EXISTS nfts (
  token_id INTEGER PRIMARY KEY,
  owner VARCHAR(42) NOT NULL,
  token_uri TEXT NOT NULL,
  ipfs_cid VARCHAR(100),
  metadata JSONB,
  royalty_receiver VARCHAR(42),
  royalty_amount INTEGER,
  minted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Marketplace listings table: Active and historical listings
-- FIXED: price as TEXT to handle large values (was DECIMAL(20, 8))
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id SERIAL PRIMARY KEY,
  nft_contract VARCHAR(42) NOT NULL,
  token_id INTEGER NOT NULL,
  seller VARCHAR(42) NOT NULL,
  price TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  listed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(nft_contract, token_id)
);

-- Trading history table: Complete sales history
-- FIXED: price, platform_fee, royalty_fee as TEXT to handle large values (was DECIMAL(20, 8))
CREATE TABLE IF NOT EXISTS trading_history (
  id SERIAL PRIMARY KEY,
  nft_contract VARCHAR(42) NOT NULL,
  token_id INTEGER NOT NULL,
  seller VARCHAR(42) NOT NULL,
  buyer VARCHAR(42) NOT NULL,
  price TEXT NOT NULL,
  platform_fee TEXT NOT NULL,
  royalty_fee TEXT NOT NULL,
  transaction_hash VARCHAR(66),
  sold_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- IPFS metadata cache: Cached metadata from IPFS
CREATE TABLE IF NOT EXISTS ipfs_metadata_cache (
  cid VARCHAR(100) PRIMARY KEY,
  metadata JSONB NOT NULL,
  cached_at TIMESTAMP DEFAULT NOW()
);

-- Sync status table: Track blockchain sync progress
CREATE TABLE IF NOT EXISTS sync_status (
  id SERIAL PRIMARY KEY,
  contract_address VARCHAR(42) NOT NULL,
  last_synced_block INTEGER NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(contract_address)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_nft_owner ON nfts(owner);
CREATE INDEX IF NOT EXISTS idx_nft_minted_at ON nfts(minted_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_active ON marketplace_listings(active);
CREATE INDEX IF NOT EXISTS idx_listing_nft ON marketplace_listings(nft_contract, token_id);
CREATE INDEX IF NOT EXISTS idx_listing_seller ON marketplace_listings(seller);
CREATE INDEX IF NOT EXISTS idx_listing_listed_at ON marketplace_listings(listed_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_token ON trading_history(nft_contract, token_id);
CREATE INDEX IF NOT EXISTS idx_history_buyer ON trading_history(buyer);
CREATE INDEX IF NOT EXISTS idx_history_seller ON trading_history(seller);
CREATE INDEX IF NOT EXISTS idx_history_sold_at ON trading_history(sold_at DESC);

-- Comments for documentation
COMMENT ON TABLE nfts IS 'All minted NFTs with metadata and ownership info';
COMMENT ON TABLE marketplace_listings IS 'Active and historical marketplace listings';
COMMENT ON COLUMN marketplace_listings.price IS 'Price in ETH as string to handle large values';
COMMENT ON TABLE trading_history IS 'Complete history of all NFT sales';
COMMENT ON COLUMN trading_history.price IS 'Sale price in ETH as string';
COMMENT ON COLUMN trading_history.platform_fee IS 'Platform fee in ETH as string';
COMMENT ON COLUMN trading_history.royalty_fee IS 'Royalty fee in ETH as string';
COMMENT ON TABLE ipfs_metadata_cache IS 'Cached IPFS metadata for faster queries';
COMMENT ON TABLE sync_status IS 'Blockchain synchronization progress tracking';