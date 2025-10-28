import { io, Socket } from 'socket.io-client';
import type { WebSocketEvent } from '../types';

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:4001';
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;

type EventHandler = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WEBSOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: RECONNECT_DELAY,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    });

    this.setupEventHandlers();
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.reconnectAttempts = 0;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.emit('connect', null);
    });

    this.socket.on('disconnect', (reason) => {
      this.emit('disconnect', { reason });
      
      if (reason === 'io server disconnect') {
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      this.emit('connect_error', error);

      if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        this.disconnect();
      }
    });

    this.socket.on('nftMinted', (data) => this.handleEvent('nftMinted', data));
    this.socket.on('nftTransferred', (data) => this.handleEvent('nftTransferred', data));
    this.socket.on('nftListed', (data) => this.handleEvent('nftListed', data));
    this.socket.on('nftSold', (data) => this.handleEvent('nftSold', data));
    this.socket.on('nftCancelled', (data) => this.handleEvent('nftCancelled', data));
    this.socket.on('priceUpdated', (data) => this.handleEvent('priceUpdated', data));
    this.socket.on('defaultRoyaltyUpdated', (data) => this.handleEvent('defaultRoyaltyUpdated', data));
    this.socket.on('tokenRoyaltyUpdated', (data) => this.handleEvent('tokenRoyaltyUpdated', data));
  }

  private handleEvent(type: WebSocketEvent['type'], data: any): void {
    const event: WebSocketEvent = {
      type,
      tokenId: data.tokenId,
      timestamp: data.timestamp || Date.now(),
      blockNumber: data.blockNumber,
      data,
    };

    this.emit('event', event);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts));
  }

  subscribe(room: string): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('subscribe', { room });
  }

  unsubscribe(room: string): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('unsubscribe', { room });
  }

  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new WebSocketService();