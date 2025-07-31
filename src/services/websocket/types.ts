export interface DeribitSubscriptionMessage {
  jsonrpc: string;
  method: string;
  params?: {
    data?: {
      timestamp: number;
      instrument_name: string;
      bids: [string, number, number][]; // [action, price, size]
      asks: [string, number, number][]; // [action, price, size]
      change_id: number;
      prev_change_id?: number;
      type?: string;
    };
    channel?: string;
  };
  id?: number;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface OrderBookState {
  bids: Map<number, number>;  // price -> size
  asks: Map<number, number>;  // price -> size
}

export interface OKXOrderBookData {
  bids: [string, string][]; // [price, size]
  asks: [string, string][]; // [price, size]
  ts: string;
}

export interface OKXSubscriptionMessage {
  arg: {
    channel: string;
    instId: string;
  };
  data: OKXOrderBookData[];
} 