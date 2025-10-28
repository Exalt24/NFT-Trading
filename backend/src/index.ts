import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { env } from './config/env.js';
import { testDatabaseConnection, closeDatabaseConnection } from './config/database.js';
import { testBlockchainConnection } from './config/blockchain.js';
import { testIPFSConnection } from './config/ipfs.js';
import { EventIndexer } from './services/EventIndexer.js';
import { WebSocketServer } from './websocket/server.js';
import { nftRoutes } from './api/nftRoutes.js';
import { marketplaceRoutes } from './api/marketplaceRoutes.js';
import { analyticsRoutes } from './api/analyticsRoutes.js';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'nft-marketplace-backend',
    version: '1.0.0',
  });
});

app.use('/api', nftRoutes);
app.use('/api', marketplaceRoutes);
app.use('/api', analyticsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function startServer() {
  try {
    console.log('🚀 Starting NFT Marketplace Backend...\n');
    
    console.log('📋 Testing connections...');
    const dbConnected = await testDatabaseConnection();
    const blockchainConnected = await testBlockchainConnection();
    await testIPFSConnection();
    
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    
    if (!blockchainConnected) {
      throw new Error('Blockchain connection failed');
    }
    
    console.log('\n✨ All systems ready!\n');
    
    const wsServer = new WebSocketServer(httpServer);
    console.log('✅ WebSocket server initialized\n');

    const eventIndexer = new EventIndexer(wsServer);
    console.log('🎧 Starting EventIndexer...');
    await eventIndexer.start();

    httpServer.listen(env.PORT, () => {
      console.log(`\n🌐 Server running on http://localhost:${env.PORT}`);
      console.log(`🔌 WebSocket ready at ws://localhost:${env.PORT}`);
      console.log(`📊 Health check: http://localhost:${env.PORT}/health`);
      console.log(`📡 API docs: http://localhost:${env.PORT}/api/*`);
      console.log('\n💡 Press Ctrl+C to stop\n');
    });

    async function shutdown(signal: string) {
      console.log(`\n\n🛑 Shutting down gracefully (${signal})...`);
      
      await eventIndexer.stop();
      await wsServer.close();
      await closeDatabaseConnection();
      
      httpServer.close(() => {
        console.log('✅ Shutdown complete');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    }

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();