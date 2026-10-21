import { Router } from 'express';
import { analyticsService } from '../services/AnalyticsService.js';
import { cacheService } from '../services/CacheService.js';

// Analytics reads are aggregate queries over every sale, so each response is cached briefly; the indexer clears the cache when it processes new events.
const ANALYTICS_TTL_S = 15;

export const analyticsRoutes = Router();

analyticsRoutes.get('/analytics/stats', async (req, res) => {
  try {
    const stats = await cacheService.cached('analytics:stats', ANALYTICS_TTL_S, () => analyticsService.getPlatformStats());
    res.json(stats);
  } catch (error) {
    console.error('Error getting platform stats:', error);
    res.status(500).json({ error: 'Failed to retrieve platform statistics' });
  }
});

analyticsRoutes.get('/analytics/top-traders', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    if (limit < 1 || limit > 50) {
      return res.status(400).json({ error: 'Limit must be between 1 and 50' });
    }

    const traders = await cacheService.cached(`analytics:top-traders:${limit}`, ANALYTICS_TTL_S, () => analyticsService.getTopTraders(limit));
    res.json(traders);
  } catch (error) {
    console.error('Error getting top traders:', error);
    res.status(500).json({ error: 'Failed to retrieve top traders' });
  }
});

analyticsRoutes.get('/analytics/volume', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    if (days < 1 || days > 365) {
      return res.status(400).json({ error: 'Days must be between 1 and 365' });
    }

    const volumeData = await cacheService.cached(`analytics:volume:${days}`, ANALYTICS_TTL_S, () => analyticsService.getTradingVolumeOverTime(days));
    res.json(volumeData);
  } catch (error) {
    console.error('Error getting volume over time:', error);
    res.status(500).json({ error: 'Failed to retrieve trading volume over time' });
  }
});

analyticsRoutes.get('/analytics/expensive-sales', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    if (limit < 1 || limit > 50) {
      return res.status(400).json({ error: 'Limit must be between 1 and 50' });
    }

    const sales = await cacheService.cached(`analytics:expensive-sales:${limit}`, ANALYTICS_TTL_S, () => analyticsService.getMostExpensiveSales(limit));
    res.json(sales);
  } catch (error) {
    console.error('Error getting expensive sales:', error);
    res.status(500).json({ error: 'Failed to retrieve most expensive sales' });
  }
});

analyticsRoutes.get('/analytics/price-distribution', async (req, res) => {
  try {
    const distribution = await cacheService.cached('analytics:price-distribution', ANALYTICS_TTL_S, () => analyticsService.getPriceDistribution());
    res.json(distribution);
  } catch (error) {
    console.error('Error getting price distribution:', error);
    res.status(500).json({ error: 'Failed to retrieve price distribution' });
  }
});

analyticsRoutes.get('/analytics/volume-by-nft', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    if (limit < 1 || limit > 50) {
      return res.status(400).json({ error: 'Limit must be between 1 and 50' });
    }

    const volumeByNFT = await cacheService.cached(`analytics:volume-by-nft:${limit}`, ANALYTICS_TTL_S, () => analyticsService.getVolumeByNFT(limit));
    res.json(volumeByNFT);
  } catch (error) {
    console.error('Error getting volume by NFT:', error);
    res.status(500).json({ error: 'Failed to retrieve volume by NFT' });
  }
});

analyticsRoutes.get('/analytics/sales-by-hour', async (req, res) => {
  try {
    const salesByHour = await cacheService.cached('analytics:sales-by-hour', ANALYTICS_TTL_S, () => analyticsService.getSalesByTimeOfDay());
    res.json(salesByHour);
  } catch (error) {
    console.error('Error getting sales by hour:', error);
    res.status(500).json({ error: 'Failed to retrieve sales by time of day' });
  }
});

analyticsRoutes.get('/analytics/user/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const userStats = await cacheService.cached(`analytics:user:${address.toLowerCase()}`, ANALYTICS_TTL_S, () => analyticsService.getUserStats(address));
    res.json(userStats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to retrieve user statistics' });
  }
});

analyticsRoutes.get('/analytics/creator/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const creatorStats = await cacheService.cached(`analytics:creator:${address.toLowerCase()}`, ANALYTICS_TTL_S, () => analyticsService.getCreatorStats(address));
    res.json(creatorStats);
  } catch (error) {
    console.error('Error getting creator stats:', error);
    res.status(500).json({ error: 'Failed to retrieve creator statistics' });
  }
});