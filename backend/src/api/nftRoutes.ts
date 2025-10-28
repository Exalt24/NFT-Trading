import { Router } from 'express';
import { nftService } from '../services/NFTService.js';

export const nftRoutes = Router();

nftRoutes.get('/nft/total', async (req, res) => {
  try {
    const total = await nftService.getTotalSupply();
    res.json({ total });
  } catch (error) {
    console.error('Error getting total supply:', error);
    res.status(500).json({ error: 'Failed to retrieve total supply' });
  }
});

nftRoutes.get('/nft/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Limit must be between 1 and 100' });
    }

    const nfts = await nftService.getRecentlyMinted(limit);
    res.json(nfts);
  } catch (error) {
    console.error('Error getting recent NFTs:', error);
    res.status(500).json({ error: 'Failed to retrieve recent NFTs' });
  }
});

nftRoutes.get('/nft/search', async (req, res) => {
  try {
    const query = req.query.q as string;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const limit = parseInt(req.query.limit as string) || 20;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Limit must be between 1 and 100' });
    }

    const results = await nftService.searchNFTs(query, limit);
    res.json(results);
  } catch (error) {
    console.error('Error searching NFTs:', error);
    res.status(500).json({ error: 'Failed to search NFTs' });
  }
});

nftRoutes.get('/nft/owner/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const nfts = await nftService.getNFTsByOwner(address);
    res.json(nfts);
  } catch (error) {
    console.error('Error getting NFTs by owner:', error);
    res.status(500).json({ error: 'Failed to retrieve NFTs by owner' });
  }
});

nftRoutes.get('/nft/metadata/:tokenId', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);

    if (isNaN(tokenId)) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }

    const metadata = await nftService.getNFTMetadata(tokenId);

    if (!metadata) {
      return res.status(404).json({ error: 'Metadata not found' });
    }

    res.json(metadata);
  } catch (error) {
    console.error('Error getting NFT metadata:', error);
    res.status(500).json({ error: 'Failed to retrieve NFT metadata' });
  }
});

nftRoutes.get('/nft/:tokenId', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);

    if (isNaN(tokenId)) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }

    const nft = await nftService.getNFTById(tokenId);

    if (!nft) {
      return res.status(404).json({ error: 'NFT not found' });
    }

    res.json(nft);
  } catch (error) {
    console.error('Error getting NFT:', error);
    res.status(500).json({ error: 'Failed to retrieve NFT' });
  }
});