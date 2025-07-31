# Project Folder Structure Documentation

### Components Directory (`src/components/`)

React components organized by feature domain:

```
components/
├── charts/                    # Chart visualization components
│   ├── MarketDepth.tsx       # Market depth chart component
│   └── MarketDepth.scss      # Market depth chart styles
├── orderbook/                 # Orderbook display components
│   ├── OrderBook.tsx         # Main orderbook table and chart
│   ├── OrderBook.scss        # Orderbook component styles
│   ├── VenueSelector.tsx     # Trading venue selector dropdown
│   └── VenueSelector.scss    # Venue selector styles
└── simulation/                # Order simulation components
    ├── OrderSimulation.tsx   # Order simulation form and analysis
    └── OrderSimulation.scss  # Order simulation styles
```

**Feature Breakdown:**

#### Charts (`components/charts/`)
- **MarketDepth.tsx** - Interactive market depth visualization using Recharts
- **MarketDepth.scss** - Styling for depth chart, tooltips, and axes

#### Orderbook (`components/orderbook/`)
- **OrderBook.tsx** - Core orderbook component with:
  - Real-time bid/ask table display
  - Price history chart
  - Order placement visualization
  - Market impact indicators
- **OrderBook.scss** - Comprehensive styling including:
  - Table grid layout and borders
  - Visual indicators for simulated orders
  - Responsive design and animations
- **VenueSelector.tsx** - Dropdown for selecting trading venues (OKX, Deribit)
- **VenueSelector.scss** - Styling for venue selector component

#### Simulation (`components/simulation/`)
- **OrderSimulation.tsx** - Order simulation interface featuring:
  - Order type and parameter input forms
  - Real-time market impact calculation
  - Fill percentage and slippage analysis
  - Risk metrics and alerts
- **OrderSimulation.scss** - Styling for:
  - Form layouts and input fields
  - Metrics grid and analysis display
  - Alert styling and visual hierarchy

### Services Directory (`src/services/`)

External service integrations and data processing:

```
services/
└── websocket/                 # WebSocket connection management
    ├── handlers/              # Venue-specific message handlers
    │   ├── DeribitHandler.ts # Deribit WebSocket message processing
    │   └── OKXHandler.ts     # OKX WebSocket message processing
    ├── utils/                 # Shared utilities
    │   └── OrderBookProcessor.ts # Common orderbook data processing
    ├── types.ts               # TypeScript type definitions
    └── WebSocketService.ts    # Main WebSocket service coordinator
```

**WebSocket Architecture:**

#### Core Service (`WebSocketService.ts`)
- Singleton pattern for managing multiple venue connections
- Connection lifecycle management (connect, disconnect, reconnect)
- Message routing to appropriate handlers
- Throttled updates to prevent UI flooding

#### Handlers (`handlers/`)
- **DeribitHandler.ts** - Handles Deribit-specific:
  - WebSocket connection setup and authentication
  - Message parsing and transformation
  - Heartbeat/ping handling
  - Snapshot requests
- **OKXHandler.ts** - Handles OKX-specific:
  - Connection setup and subscription management
  - Message format processing
  - Symbol mapping and validation

#### Utilities (`utils/`)
- **OrderBookProcessor.ts** - Common processing functions:
  - Order book data normalization
  - Bid/ask sorting and validation
  - Cumulative total calculations

#### Types (`types.ts`)
- TypeScript interfaces for:
  - WebSocket message formats
  - Order book data structures
  - Subscription payloads

### Store Directory (`src/store/`)

Redux Toolkit state management:

```
store/
├── index.ts                   # Store configuration and setup
└── orderbookSlice.ts         # Orderbook state slice
```

**State Management:**
- **index.ts** - Redux store configuration with middleware
- **orderbookSlice.ts** - Complete orderbook state including:
  - Bid/ask data arrays
  - Current venue and symbol selection
  - Simulated order state
  - Price history for charts
  - Loading and error states
  - Order history tracking

### Constants Directory (`src/constants/`)

Application configuration and constants:

```
constants/
└── simulation.constants.ts    # Simulation-related constants
```

**Configuration:**
- **simulation.constants.ts** - Defines:
  - Available trading symbols
  - Simulation delay options
  - Default values and limits


## Architecture Principles

### 1. Feature-Based Organization
Components are grouped by feature (orderbook, simulation, charts) rather than technical concerns.

### 2. Separation of Concerns
- **Components** - UI presentation and user interaction
- **Services** - External data sources and business logic
- **Store** - Application state management
- **Constants** - Configuration and static data

### 3. Modular WebSocket Architecture
The WebSocket service is broken down into:
- **Main Service** - Coordination and lifecycle management
- **Handlers** - Venue-specific protocol implementation
- **Utilities** - Shared processing logic
- **Types** - Type safety and documentation
