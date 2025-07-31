
import { store } from '@/store';
import { updateOrderBook, setError } from '@/store/orderbookSlice';
import { DeribitHandler } from './handlers/DeribitHandler';
import { OKXHandler } from './handlers/OKXHandler';
import { OrderBookProcessor } from './utils/OrderBookProcessor';
import { 
  DeribitSubscriptionMessage, 
} from './types';

export class WebSocketService {
  private static instance: WebSocketService;
  private sockets: Map<string, WebSocket> = new Map();
  private lastUpdateTime: number = 0;
  private updateInterval: number = 2000;
  private latestData: Map<string, any> = new Map();
  private lastDataTime: Map<string, number> = new Map();
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private subscriptionIds: Map<string, number> = new Map();
  private activeConnections: Set<string> = new Set(); // Track active connection attempts
  private connectionAttempts: Map<string, number> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 2000;

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  private getConnectionKey(venue: string, symbol: string): string {
    return `${venue.toLowerCase()}-${symbol}`;
  }

  private isConnecting(venue: string, symbol: string): boolean {
    const key = this.getConnectionKey(venue, symbol);
    return this.activeConnections.has(key);
  }

  private markConnectionAttempt(venue: string, symbol: string): void {
    const key = this.getConnectionKey(venue, symbol);
    this.activeConnections.add(key);
    const attempts = this.connectionAttempts.get(key) || 0;
    this.connectionAttempts.set(key, attempts + 1);
  }

  private clearConnectionAttempt(venue: string, symbol: string): void {
    const key = this.getConnectionKey(venue, symbol);
    this.activeConnections.delete(key);
    this.connectionAttempts.delete(key);
  }

  private updateOrderBookIfNeeded(venue: string, data: any) {
    // Always update the latest data
    this.latestData.set(venue, data);
    this.lastDataTime.set(venue, Date.now());
    
    // Clear any error state since we received data
    store.dispatch(setError(null));
    
    // Force an update regardless of time if we don't have any data yet
    const currentState = store.getState().orderbook;
    const shouldForceUpdate = currentState.bids.length === 0 && currentState.asks.length === 0;
    
    if (shouldForceUpdate || this.shouldUpdate()) {
      const latestData = this.latestData.get(venue);
      if (latestData) {
        if (venue.toLowerCase() === 'deribit') {
          DeribitHandler.handleMessage(latestData as DeribitSubscriptionMessage);
        } else {
          const processedData = OrderBookProcessor.handleOrderBookUpdate(venue, latestData);
          if (processedData) {
            store.dispatch(updateOrderBook(processedData));
          }
        }

        // Clear the stored data after processing
        this.latestData.delete(venue);
      }
    }
  }

  private getSocketUrl(venue: string): string {
    switch (venue.toLowerCase()) {
      case 'okx':
        return 'wss://ws.okx.com:8443/ws/v5/public';
      case 'deribit':
        return 'wss://www.deribit.com/ws/api/v2';
      default:
        throw new Error(`Unsupported venue: ${venue}`);
    }
  }

  private shouldUpdate(): boolean {
    const now = Date.now();
    if (now - this.lastUpdateTime >= this.updateInterval) {
      this.lastUpdateTime = now;
      return true;
    }
    return false;
  }

  private setupDeribitHeartbeat(ws: WebSocket, venue: string): void {
    // Deribit requires heartbeat every 30 seconds
    const pingInterval = setInterval(() => DeribitHandler.sendPing(ws), 15000);
    this.pingIntervals.set(venue, pingInterval);
  }

  public disconnect(venue: string): void {
    try {
      const ws = this.sockets.get(venue);
      
      if (ws) {
        // Clear any ping intervals
        const pingInterval = this.pingIntervals.get(venue);
        if (pingInterval) {
          clearInterval(pingInterval);
          this.pingIntervals.delete(venue);
        }

        // Close the connection if it's open or connecting
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, 'Disconnecting');
        }

        // Remove from maps
        this.sockets.delete(venue);
        this.latestData.delete(venue);
        this.lastDataTime.delete(venue);
        this.subscriptionIds.delete(venue);
        
        // Clear any connection attempts
        Array.from(this.activeConnections.keys())
          .filter(key => key.startsWith(venue.toLowerCase()))
          .forEach(key => {
            this.activeConnections.delete(key);
            this.connectionAttempts.delete(key);
          });

      }
    } catch (error) {
      console.error(`[WebSocket] Error disconnecting from ${venue}:`, error);
    }
  }

  public disconnectAll(): void {
    Array.from(this.sockets.keys()).forEach(venue => this.disconnect(venue));
    this.activeConnections.clear();
    this.connectionAttempts.clear();
  }

  public connect(venue: string, symbol: string): void {
    const connectionKey = this.getConnectionKey(venue, symbol);
    
    if (this.isConnecting(venue, symbol)) return;

    const attempts = this.connectionAttempts.get(connectionKey) || 0;
    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      store.dispatch(setError(`Failed to connect to ${venue} after ${this.MAX_RECONNECT_ATTEMPTS} attempts`));
      return;
    }

    this.disconnect(venue);
    const socketUrl = this.getSocketUrl(venue);
    this.markConnectionAttempt(venue, symbol);

    const ws = new WebSocket(socketUrl);
    let reconnectTimeout: NodeJS.Timeout | null = null;

    ws.onopen = () => {
      this.clearConnectionAttempt(venue, symbol);

      switch (venue.toLowerCase()) {
        case 'okx':
          const pingInterval = OKXHandler.setupConnection(ws, symbol);
          this.pingIntervals.set('okx', pingInterval);
          break;
        case 'deribit':
          DeribitHandler.setupConnection(ws, symbol, venue);
          this.setupDeribitHeartbeat(ws, venue);
          break;
      }
    };

    ws.onclose = (event) => {
      const pingInterval = this.pingIntervals.get(venue);
      if (pingInterval) {
        clearInterval(pingInterval);
        this.pingIntervals.delete(venue);
      }

      this.clearConnectionAttempt(venue, symbol);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);

      if (event.code !== 1000) {
        const attempts = this.connectionAttempts.get(connectionKey) || 0;
        if (attempts < this.MAX_RECONNECT_ATTEMPTS) {
          const delay = this.RECONNECT_DELAY * Math.pow(2, attempts);
          reconnectTimeout = setTimeout(() => this.connect(venue, symbol), delay);
        }
      }
    };

    ws.onerror = (error) => {
      console.error(`[WebSocket] Error for ${venue}:`, error);
    };

    ws.onmessage = (event) => {
      if (event.data === 'pong') return;
      
      try {
        const data = JSON.parse(event.data);

        switch (venue.toLowerCase()) {
          case 'okx':
            if (data.event === 'error') {
              console.error(`[WebSocket] OKX error:`, data);
              store.dispatch(setError(`${venue} error: ${data.msg}`));
              return;
            }
            if (data.event === 'subscribe') return;
            this.updateOrderBookIfNeeded(venue, data);
            break;

          case 'deribit':
            if (data.error) {
              console.error(`[WebSocket] Deribit error:`, data.error);
              store.dispatch(setError(`${venue} error: ${data.error.message}`));
              return;
            }
            if (data.method === 'heartbeat') {
              const ws = this.sockets.get(venue);
              if (ws) DeribitHandler.handleHeartbeat(ws, data);
              return;
            }
            this.updateOrderBookIfNeeded(venue, data);
            break;
        }
      } catch (error) {
        console.error(`[WebSocket] Error processing ${venue} message:`, error);
      }
    };

    this.sockets.set(venue, ws);
  }
} 