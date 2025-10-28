import type { Socket } from 'socket.io';
import type { RoomInfo } from '../types/websocket.js';

export class RoomManager {
  private rooms: Map<string, Set<string>> = new Map();

  joinRoom(socket: Socket, roomName: string): void {
    socket.join(roomName);
    
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    
    this.rooms.get(roomName)!.add(socket.id);
    
    const roomType = this.getRoomType(roomName);
    console.log(`🔌 Client ${socket.id} joined ${roomType} room: ${roomName}`);
  }

  leaveRoom(socket: Socket, roomName: string): void {
    socket.leave(roomName);
    
    const roomSockets = this.rooms.get(roomName);
    if (roomSockets) {
      roomSockets.delete(socket.id);
      
      if (roomSockets.size === 0) {
        this.rooms.delete(roomName);
      }
    }
    
    const roomType = this.getRoomType(roomName);
    console.log(`🔌 Client ${socket.id} left ${roomType} room: ${roomName}`);
  }

  leaveAllRooms(socket: Socket): void {
    for (const [roomName, sockets] of this.rooms.entries()) {
      if (sockets.has(socket.id)) {
        socket.leave(roomName);
        sockets.delete(socket.id);
        
        if (sockets.size === 0) {
          this.rooms.delete(roomName);
        }
      }
    }
  }

  getRoomInfo(roomName: string): RoomInfo | null {
    const sockets = this.rooms.get(roomName);
    if (!sockets) {
      return null;
    }

    return {
      name: roomName,
      type: this.getRoomType(roomName),
      subscribers: sockets.size,
    };
  }

  getAllRooms(): RoomInfo[] {
    return Array.from(this.rooms.entries()).map(([name, sockets]) => ({
      name,
      type: this.getRoomType(name),
      subscribers: sockets.size,
    }));
  }

  private getRoomType(roomName: string): 'global' | 'nft' | 'owner' | 'marketplace' {
    if (roomName === 'global') return 'global';
    if (roomName === 'marketplace') return 'marketplace';
    if (roomName.startsWith('nft-')) return 'nft';
    if (roomName.startsWith('owner-')) return 'owner';
    return 'global';
  }

  static createNFTRoom(tokenId: number): string {
    return `nft-${tokenId}`;
  }

  static createOwnerRoom(address: string): string {
    return `owner-${address.toLowerCase()}`;
  }

  static parseNFTRoom(roomName: string): number | null {
    if (!roomName.startsWith('nft-')) return null;
    const tokenId = parseInt(roomName.substring(4));
    return isNaN(tokenId) ? null : tokenId;
  }

  static parseOwnerRoom(roomName: string): string | null {
    if (!roomName.startsWith('owner-')) return null;
    return roomName.substring(6);
  }
}