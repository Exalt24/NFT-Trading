import { Router } from 'express';
import { marketplaceService } from '../services/MarketplaceService.js';

export const marketplaceRoutes = Router();

marketplaceRoutes.get('/marketplace/listings', async (req, res) => {
  try {
    const listings = await marketplaceService.getActiveListings();
    res.json(listings);
  } catch (error) {
    console.error('Error getting listings:', error);
    res.status(500).json({ error: 'Failed to retrieve listings' });
  }
});

marketplaceRoutes.get('/marketplace/listing/:tokenId', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);

    if (isNaN(tokenId)) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }

    const nftContract = req.query.contract as string;

    if (!nftContract || !nftContract.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Valid contract address is required' });
    }

    const listing = await marketplaceService.getListingByToken(nftContract, tokenId);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(listing);
  } catch (error) {
    console.error('Error getting listing:', error);
    res.status(500).json({ error: 'Failed to retrieve listing' });
  }
});

marketplaceRoutes.get('/marketplace/seller/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const listings = await marketplaceService.getListingsBySeller(address);
    res.json(listings);
  } catch (error) {
    console.error('Error getting seller listings:', error);
    res.status(500).json({ error: 'Failed to retrieve seller listings' });
  }
});

marketplaceRoutes.get('/marketplace/floor', async (req, res) => {
  try {
    const floorPrice = await marketplaceService.getFloorPrice();
    res.json({ floorPrice });
  } catch (error) {
    console.error('Error getting floor price:', error);
    res.status(500).json({ error: 'Failed to retrieve floor price' });
  }
});

marketplaceRoutes.get('/marketplace/volume', async (req, res) => {
  try {
    const volumeData = await marketplaceService.getTradingVolume();
    res.json(volumeData);
  } catch (error) {
    console.error('Error getting trading volume:', error);
    res.status(500).json({ error: 'Failed to retrieve trading volume' });
  }
});

marketplaceRoutes.get('/marketplace/history/:tokenId', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);

    if (isNaN(tokenId)) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }

    const nftContract = req.query.contract as string;

    if (!nftContract || !nftContract.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Valid contract address is required' });
    }

    const history = await marketplaceService.getPriceHistory(nftContract, tokenId);
    res.json(history);
  } catch (error) {
    console.error('Error getting price history:', error);
    res.status(500).json({ error: 'Failed to retrieve price history' });
  }
});

marketplaceRoutes.get('/marketplace/recent-sales', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Limit must be between 1 and 100' });
    }

    const sales = await marketplaceService.getRecentSales(limit);
    res.json(sales);
  } catch (error) {
    console.error('Error getting recent sales:', error);
    res.status(500).json({ error: 'Failed to retrieve recent sales' });
  }
});

marketplaceRoutes.get('/marketplace/expensive-sales', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    if (limit < 1 || limit > 50) {
      return res.status(400).json({ error: 'Limit must be between 1 and 50' });
    }

    const sales = await marketplaceService.getMostExpensiveSales(limit);
    res.json(sales);
  } catch (error) {
    console.error('Error getting expensive sales:', error);
    res.status(500).json({ error: 'Failed to retrieve expensive sales' });
  }
});

marketplaceRoutes.get('/marketplace/price-range', async (req, res) => {
  try {
    const minPrice = req.query.min as string;
    const maxPrice = req.query.max as string;

    if (!minPrice || !maxPrice) {
      return res.status(400).json({ error: 'Both min and max price are required' });
    }

    if (isNaN(parseFloat(minPrice)) || isNaN(parseFloat(maxPrice))) {
      return res.status(400).json({ error: 'Invalid price values' });
    }

    if (parseFloat(minPrice) < 0 || parseFloat(maxPrice) < 0) {
      return res.status(400).json({ error: 'Prices must be positive' });
    }

    if (parseFloat(minPrice) > parseFloat(maxPrice)) {
      return res.status(400).json({ error: 'Min price cannot be greater than max price' });
    }

    const listings = await marketplaceService.getListingsByPriceRange(minPrice, maxPrice);
    res.json(listings);
  } catch (error) {
    console.error('Error getting listings by price range:', error);
    res.status(500).json({ error: 'Failed to retrieve listings by price range' });
  }
});