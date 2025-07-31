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
1.Cone the repo

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

## For folder structure details read FOLDER_STRUCTURE.md

