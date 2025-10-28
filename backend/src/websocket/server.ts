import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { RoomManager } from './rooms.js';
import type { 
  NFTEvent, 
  SubscriptionRequest, 
  UnsubscriptionRequest 
} from '../types/websocket.js';
import { env } from '../config/env.js';

export class WebSocketServer {
  private io: SocketIOServer;
  private roomManager: RoomManager;
  private connectionCount = 0;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    });

    this.roomManager = new RoomManager();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      this.connectionCount++;
      console.log(`🔌 Client connected: ${socket.id} (Total: ${this.connectionCount})`);

      this.roomManager.joinRoom(socket, 'global');

      socket.on('subscribe', (data: SubscriptionRequest) => {
        if (this.isValidRoom(data.room)) {
          this.roomManager.joinRoom(socket, data.room);
          socket.emit('subscribed', { room: data.room, success: true });
        } else {
          socket.emit('subscribed', { room: data.room, success: false, error: 'Invalid room name' });
        }
      });

      socket.on('unsubscribe', (data: UnsubscriptionRequest) => {
        this.roomManager.leaveRoom(socket, data.room);
        socket.emit('unsubscribed', { room: data.room, success: true });
      });

      socket.on('getRooms', () => {
        const rooms = this.roomManager.getAllRooms();
        socket.emit('rooms', { rooms });
      });

      socket.on('disconnect', (reason) => {
        this.connectionCount--;
        console.log(`🔌 Client disconnected: ${socket.id} (Reason: ${reason}, Total: ${this.connectionCount})`);
        this.roomManager.leaveAllRooms(socket);
      });

      socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
      });
    });
  }

  private isValidRoom(roomName: string): boolean {
    if (!roomName || typeof roomName !== 'string') return false;
    
    const validPatterns = [
      /^global$/,
      /^marketplace$/,
      /^nft-\d+$/,
      /^owner-0x[a-fA-F0-9]{40}$/,
    ];

    return validPatterns.some(pattern => pattern.test(roomName));
  }

  broadcast(event: NFTEvent): void {
    this.io.to('global').emit(event.type, event);
    
    if (event.type === 'nftMinted' || 
        event.type === 'nftTransferred' || 
        event.type === 'nftListed' || 
        event.type === 'nftSold' || 
        event.type === 'nftCancelled' || 
        event.type === 'priceUpdated') {
      
      const nftRoom = RoomManager.createNFTRoom(event.tokenId);
      this.io.to(nftRoom).emit(event.type, event);
    }

    if (event.type === 'nftMinted' || event.type === 'nftTransferred') {
      const ownerRoom = RoomManager.createOwnerRoom(event.type === 'nftMinted' ? event.owner : event.to);
      this.io.to(ownerRoom).emit(event.type, event);
    }

    if (event.type === 'nftTransferred' && event.from !== '0x0000000000000000000000000000000000000000') {
      const fromRoom = RoomManager.createOwnerRoom(event.from);
      this.io.to(fromRoom).emit(event.type, event);
    }

    if (event.type === 'nftListed' || event.type === 'nftSold' || event.type === 'nftCancelled' || event.type === 'priceUpdated') {
      this.io.to('marketplace').emit(event.type, event);
    }

    if (event.type === 'nftSold') {
      const sellerRoom = RoomManager.createOwnerRoom(event.seller);
      const buyerRoom = RoomManager.createOwnerRoom(event.buyer);
      this.io.to(sellerRoom).emit(event.type, event);
      this.io.to(buyerRoom).emit(event.type, event);
    }
  }

  getConnectionCount(): number {
    return this.connectionCount;
  }

  getRoomInfo(roomName: string) {
    return this.roomManager.getRoomInfo(roomName);
  }

  getAllRooms() {
    return this.roomManager.getAllRooms();
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        console.log('🔌 WebSocket server closed');
        resolve();
      });
    });
  }
}