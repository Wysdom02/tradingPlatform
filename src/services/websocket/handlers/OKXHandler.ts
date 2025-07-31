import { store } from '@/store';
import { updateOrderBook } from '@/store/orderbookSlice';
import { OKXOrderBookData, OrderBookEntry } from '../types';

export class OKXHandler {
  public static handleMessage(data: { data: OKXOrderBookData[] }): void {
    if (data?.data?.[0]) {
      const orderBookData = data.data[0];
      
      const processOrders = (orders: [string, string][]) => {
        return orders
          .map(([price, size]) => {
            const numSize = Number(size);
            if (numSize <= 0) return null;
            return {
              price: Number(price),
              size: numSize,
              total: 0
            };
          })
          .filter((order): order is OrderBookEntry => order !== null);
      };

      const bids = processOrders(orderBookData.bids || []);
      const asks = processOrders(orderBookData.asks || []);

      // Sort orders
      bids.sort((a, b) => b.price - a.price);
      asks.sort((a, b) => a.price - b.price);

      // Calculate cumulative totals
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
          lastUpdateId: Date.now()
        }));
      }
    }
  }

  public static setupConnection(ws: WebSocket, symbol: string): NodeJS.Timeout {
    // Subscribe to orderbook
    const subscriptionMsg = this.getSubscriptionMessage(symbol);
    ws.send(JSON.stringify(subscriptionMsg));

    // Set up ping interval (OKX requires ping every 30 seconds)
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 20000);

    return pingInterval;
  }

  public static getSymbol(symbol: string): string {
    switch (symbol) {
      case 'BTC-PERPETUAL':
        return 'BTC-USD-SWAP';
      case 'ETH-PERPETUAL':
        return 'ETH-USD-SWAP';
      default:
        return symbol;
    }
  }

  private static getSubscriptionMessage(symbol: string): any {
    return {
      op: 'subscribe',
      args: [{
        channel: 'books',
        instId: this.getSymbol(symbol),
        updateInterval: '100ms'
      }]
    };
  }
} 