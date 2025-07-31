# Real-Time Orderbook Viewer with Order Simulation

A Next.js application that displays real-time orderbook data from multiple cryptocurrency exchanges (OKX, Bybit, and Deribit) with order simulation capabilities. The application allows users to visualize market depth and simulate order placement with various parameters.

## Features

- Real-time orderbook display from multiple venues
- Order simulation with market impact analysis
- Market depth visualization
- Order book imbalance indicators
- Slippage warnings and calculations
- Responsive design for both desktop and mobile
- Multiple timing scenarios for order simulation

## Technologies Used

- Next.js 14 with TypeScript
- Material-UI for components
- Tailwind CSS for styling
- Redux Toolkit for state management
- Recharts for data visualization
- Socket.IO for WebSocket connections
- SCSS for custom styling

## Prerequisites

- Node.js 18.0.0 or later
- npm or yarn package manager

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd project2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── components/
│   ├── orderbook/
│   │   └── OrderBook.tsx
│   ├── simulation/
│   │   └── OrderSimulation.tsx
│   └── charts/
│       └── MarketDepth.tsx
├── services/
│   ├── api/
│   └── websocket/
│       └── WebSocketService.ts
├── store/
│   ├── index.ts
│   └── orderbookSlice.ts
├── styles/
└── app/
    └── page.tsx
```

## Features in Detail

### 1. Multi-Venue Orderbook Display
- Real-time orderbook data from OKX, Bybit, and Deribit
- 15 levels of best bids and asks
- WebSocket connections for live updates
- Easy venue switching

### 2. Order Simulation
- Support for market and limit orders
- Quantity and price inputs
- Multiple timing scenarios
- Market impact analysis
- Fill percentage estimation
- Slippage calculation

### 3. Market Depth Visualization
- Cumulative volume display
- Bid/Ask imbalance indicators
- Mid-price reference line
- Interactive tooltips

### 4. Responsive Design
- Mobile-friendly interface
- Adaptive layout
- Touch-friendly controls

## API Integration

The application integrates with the following exchange APIs:

- OKX API (v5)
- Bybit API (v5)
- Deribit API (v2)

Rate limiting and error handling are implemented for all API connections.

## WebSocket Implementation

The WebSocket service (`WebSocketService.ts`) handles real-time data connections:

- Singleton pattern for connection management
- Automatic reconnection
- Error handling and logging
- Clean connection cleanup

## State Management

Redux Toolkit is used for state management with the following slices:

- Orderbook state
- Simulation parameters
- Market depth data
- Exchange connection status

## Error Handling

The application implements comprehensive error handling:

- API connection failures
- WebSocket disconnections
- Invalid order parameters
- Rate limit exceeded scenarios

## Performance Considerations

- Efficient rendering with React.memo and useMemo
- WebSocket message debouncing
- Optimized chart rendering
- Lazy loading of components

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## API Documentation References

- [OKX API Documentation](https://www.okx.com/docs-v5/)
- [Bybit API Documentation](https://bybit-exchange.github.io/docs/v5/intro)
- [Deribit API Documentation](https://docs.deribit.com/)

## Contact

For questions and support, please contact:
- Email: careers@goquant.io
- CC: jennifer.carreno@goquant.io
