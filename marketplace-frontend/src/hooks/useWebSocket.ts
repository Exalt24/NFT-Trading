import { useState, useEffect, useCallback, useRef } from 'react';
import { socketService } from '../services/websocket';
import type { WebSocketEvent } from '../types';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnMount?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  events: WebSocketEvent[];
  lastEvent: WebSocketEvent | null;
  connectionError: string | null;
  subscribe: (room: string) => void;
  unsubscribe: (room: string) => void;
  clearEvents: () => void;
  reconnect: () => void;
}

const MAX_EVENTS = 100;

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = true, reconnectOnMount = true } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<WebSocketEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const subscribedRooms = useRef<Set<string>>(new Set());

  const addEvent = useCallback((event: WebSocketEvent) => {
    setEvents(prev => {
      // ✅ FIXED: Deduplicate events (multiple connections can send same event)
      const eventKey = `${event.type}-${event.tokenId}-${event.timestamp}`;
      const exists = prev.some(e => 
        `${e.type}-${e.tokenId}-${e.timestamp}` === eventKey
      );
      
      if (exists) {
        console.log('⏭️  Duplicate event ignored:', eventKey);
        return prev; // Don't add duplicate
      }
      
      const updated = [event, ...prev];
      return updated.slice(0, MAX_EVENTS);
    });
    setLastEvent(event);
  }, []);

  const subscribe = useCallback((room: string) => {
    if (!subscribedRooms.current.has(room)) {
      socketService.subscribe(room);
      subscribedRooms.current.add(room);
    }
  }, []);

  const unsubscribe = useCallback((room: string) => {
    if (subscribedRooms.current.has(room)) {
      socketService.unsubscribe(room);
      subscribedRooms.current.delete(room);
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  const reconnect = useCallback(() => {
    setConnectionError(null);
    socketService.connect();
  }, []);

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
      subscribedRooms.current.forEach(room => {
        socketService.subscribe(room);
      });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = (error: Error) => {
      setConnectionError(error.message || 'Connection failed');
      setIsConnected(false);
    };

    const handleEvent = (event: WebSocketEvent) => {
      addEvent(event);
    };

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('connect_error', handleConnectError);
    socketService.on('event', handleEvent);

    if (autoConnect) {
      socketService.connect();
    }

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('connect_error', handleConnectError);
      socketService.off('event', handleEvent);

      subscribedRooms.current.forEach(room => {
        socketService.unsubscribe(room);
      });
      subscribedRooms.current.clear();

      if (!reconnectOnMount) {
        socketService.disconnect();
      }
    };
  }, [autoConnect, reconnectOnMount, addEvent]);

  return {
    isConnected,
    events,
    lastEvent,
    connectionError,
    subscribe,
    unsubscribe,
    clearEvents,
    reconnect,
  };
}