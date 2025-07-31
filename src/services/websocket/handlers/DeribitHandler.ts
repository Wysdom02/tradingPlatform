import { store } from '@/store';
import { updateOrderBook } from '@/store/orderbookSlice';
import { DeribitSubscriptionMessage, OrderBookEntry } from '../types';

export class DeribitHandler {
  public static handleMessage(message: DeribitSubscriptionMessage): void {
    if (message.method !== 'subscription') return;
    
    const data = message.params?.data;
    if (!data) return;

    const processOrders = (orders: [string, number, number][]) => {
      return orders
        .filter(([action, , size]) => action !== 'delete' && size > 0)
        .map(([, price, size]) => ({
          price: Number(price),
          size: Math.abs(Number(size)),
          total: 0
        }));
    };

    const bids = processOrders(data.bids || []);
    const asks = processOrders(data.asks || []);

    bids.sort((a, b) => b.price - a.price);
    asks.sort((a, b) => a.price - b.price);

    let bidTotal = 0;
    bids.forEach(bid => {
      bidTotal += bid.size;
      bid.total = bidTotal;
    });

    let askTotal = 0;
    asks.forEach(ask => {
      askTotal += ask.size;
      ask.total = askTotal;
    });

    if (bids.length > 0 || asks.length > 0) {
      store.dispatch(updateOrderBook({
        bids,
        asks,
        lastUpdateId: data.change_id
      }));
    }
  }

  public static setupConnection(ws: WebSocket, symbol: string, venue: string): void {
    // Set up heartbeat
    const heartbeatRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'public/set_heartbeat',
      params: {
        interval: 30 // Heartbeat every 30 seconds
      }
    };

    ws.send(JSON.stringify(heartbeatRequest));

    // Subscribe to orderbook
    const subscriptionMsg = this.getSubscriptionMessage(symbol);
    ws.send(JSON.stringify(subscriptionMsg));
  }

  public static handleHeartbeat(ws: WebSocket, data: any): void {
    if (data.method === 'heartbeat') {
      if (data.params.type === 'test_request') {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: data.id,
          method: 'public/test',
          params: {}
        }));
      }
    }
  }

  public static sendPing(ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'public/test',
        id: Date.now()
      }));
    }
  }

  public static requestSnapshot(ws: WebSocket, instrument: string): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const snapshotRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'public/get_order_book',
      params: {
        instrument_name: instrument,
        depth: 25 // Get 25 levels
      }
    };

    ws.send(JSON.stringify(snapshotRequest));
  }

  private static getSubscriptionMessage(symbol: string): any {
    const subscriptionId = Math.floor(Math.random() * 1000000);
    return {
      jsonrpc: '2.0',
      id: subscriptionId,
      method: 'public/subscribe',
      params: {
        channels: [`book.${symbol}.100ms`]
      }
    };
  }
} 