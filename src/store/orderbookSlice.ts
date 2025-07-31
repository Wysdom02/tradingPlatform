import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface SimulatedOrder {
  type: 'market' | 'limit';
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  delay: number;
  timestamp: number;
  impact?: {
    fillPercentage: number;
    averagePrice: number;
    slippage: number;
    estimatedCost: number;
  };
}

interface PricePoint {
  timestamp: number;
  price: number;
  side: 'bid' | 'ask';
}

export interface OrderBookState {
  venue: string;
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  lastUpdateId: number;
  loading: boolean;
  error: string | null;
  simulatedOrder: SimulatedOrder | null;
  orderHistory: SimulatedOrder[];
  priceHistory: PricePoint[];
}

const initialState: OrderBookState = {
  venue: 'Deribit',
  symbol: 'BTC-PERPETUAL',
  bids: [],
  asks: [],
  lastUpdateId: 0,
  loading: false,
  error: null,
  simulatedOrder: null,
  orderHistory: [],
  priceHistory: [],
};

const MAX_PRICE_HISTORY = 100; // Keep last 100 price points

export const orderbookSlice = createSlice({
  name: 'orderbook',
  initialState,
  reducers: {
    setVenue: (state, action: PayloadAction<string>) => {
      // Clear all data when changing venue
      state.venue = action.payload;
      state.bids = [];
      state.asks = [];
      state.lastUpdateId = 0;
      state.error = null;
      state.simulatedOrder = null;
      state.priceHistory = [];
      state.loading = true;
    },
    setSymbol: (state, action: PayloadAction<string>) => {
      // Clear all data when changing symbol
      state.symbol = action.payload;
      state.bids = [];
      state.asks = [];
      state.lastUpdateId = 0;
      state.error = null;
      state.simulatedOrder = null;
      state.priceHistory = [];
      state.loading = true;
    },
    updateOrderBook: (state, action: PayloadAction<{
      bids: OrderBookEntry[];
      asks: OrderBookEntry[];
      lastUpdateId: number;
    }>) => {
      state.bids = action.payload.bids;
      state.asks = action.payload.asks;
      state.lastUpdateId = action.payload.lastUpdateId;
      state.loading = false;
      state.error = null;

      // Add current best bid and ask to price history
      if (action.payload.bids.length > 0 && action.payload.asks.length > 0) {
        const timestamp = Date.now();
        const bestBid = action.payload.bids[0];
        const bestAsk = action.payload.asks[0];

        state.priceHistory.push(
          { timestamp, price: bestBid.price, side: 'bid' },
          { timestamp, price: bestAsk.price, side: 'ask' }
        );

        // Keep only the last MAX_PRICE_HISTORY points
        if (state.priceHistory.length > MAX_PRICE_HISTORY) {
          state.priceHistory = state.priceHistory.slice(-MAX_PRICE_HISTORY);
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setSimulatedOrder: (state, action: PayloadAction<SimulatedOrder | null>) => {
      state.simulatedOrder = action.payload;
      if (action.payload) {
        state.orderHistory.unshift(action.payload);
      }
    },
    clearOrderHistory: (state) => {
      state.orderHistory = [];
    },
    clearPriceHistory: (state) => {
      state.priceHistory = [];
    },
    updatePriceHistory: (state, action: PayloadAction<{ price: number; side: 'bid' | 'ask'; timestamp: number }>) => {
      state.priceHistory.push(action.payload);
      // Keep only last 100 price points
      if (state.priceHistory.length > 100) {
        state.priceHistory.shift();
      }
    }
  },
});

export const {
  setVenue,
  setSymbol,
  updateOrderBook,
  setLoading,
  setError,
  setSimulatedOrder,
  clearOrderHistory,
  clearPriceHistory,
  updatePriceHistory,
} = orderbookSlice.actions;

export default orderbookSlice.reducer; 