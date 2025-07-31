export class OrderBookProcessor {
  public static processOrderBookSide(orders: [number, number][]): { price: number; size: number; total: number; }[] {
    let total = 0;
    return orders.map(([price, size]) => {
      total += size;
      return {
        price,
        size,
        total,
      };
    });
  }

  public static handleOrderBookUpdate(venue: string, data: any) {
    try {
      let bids: [number, number][] = [];
      let asks: [number, number][] = [];
      let lastUpdateId = 0;

      switch (venue.toLowerCase()) {
        case 'okx':
          // Check if it's an orderbook update message
          if (data?.arg?.channel === 'books' && Array.isArray(data?.data)) {
            const orderBookData = data.data[0];
            if (orderBookData?.bids && orderBookData?.asks) {
              bids = orderBookData.bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]);
              asks = orderBookData.asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]);
              lastUpdateId = orderBookData.ts;
            } else {
              console.warn('OKX: Invalid orderbook data format', orderBookData);
              return;
            }
          } else {
            // Not an orderbook update message, ignore
            return;
          }
          break;

        case 'deribit':
          if (data?.method === 'subscription' && data?.params?.data) {
            const orderBookData = data.params.data;
            if (orderBookData?.bids && orderBookData?.asks) {
              bids = orderBookData.bids.map((bid: string[]) => [parseFloat(bid[1]), parseFloat(bid[2])]); // [price, size]
              asks = orderBookData.asks.map((ask: string[]) => [parseFloat(ask[1]), parseFloat(ask[2])]); // [price, size]
              lastUpdateId = orderBookData.change_id;
            } else {
              console.warn('Deribit: Invalid orderbook data format', orderBookData);
              return;
            }
          } else {
            console.warn('Deribit: Invalid orderbook data format', data);
            return;
          }
          break;
      }

      // Sort bids (descending) and asks (ascending)
      bids.sort((a, b) => b[0] - a[0]); // Higher prices first for bids
      asks.sort((a, b) => a[0] - b[0]); // Lower prices first for asks

      const processedBids = this.processOrderBookSide(bids);
      const processedAsks = this.processOrderBookSide(asks);

      return {
        bids: processedBids.slice(0, 15),
        asks: processedAsks.slice(0, 15),
        lastUpdateId,
      };
    } catch (error) {
      return null;
    }
  }
} 