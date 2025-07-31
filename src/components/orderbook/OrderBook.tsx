import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { RootState } from '@/store';
import { WebSocketService } from '@/services/websocket/WebSocketService';
import VenueSelector from './VenueSelector';
import './OrderBook.scss';

const OrderBook: React.FC = () => {
  const dispatch = useDispatch();
  const { venue, symbol, bids, asks, loading, error, simulatedOrder, priceHistory } = useSelector(
    (state: RootState) => state.orderbook
  );

  const [showAllOrders, setShowAllOrders] = useState(false);
  const MAX_VISIBLE_ORDERS = 20;
  const DEFAULT_VISIBLE_ORDERS = 3;

  // Keep track of the previous venue for cleanup
  const prevVenueRef = useRef(venue);

  const visibleBids = useMemo(() => {
    if (!showAllOrders) {
      return bids.slice(0, DEFAULT_VISIBLE_ORDERS);
    }
    return bids.slice(0, MAX_VISIBLE_ORDERS);
  }, [bids, showAllOrders]);

  const visibleAsks = useMemo(() => {
    if (!showAllOrders) {
      return asks.slice(0, DEFAULT_VISIBLE_ORDERS);
    }
    return asks.slice(0, MAX_VISIBLE_ORDERS);
  }, [asks, showAllOrders]);

  // Enhanced order book data with simulated order insertion
  const enhancedBids = useMemo(() => {
    if (!simulatedOrder) return visibleBids;
    
    if (simulatedOrder.side === 'buy') {
      if (simulatedOrder.type === 'limit') {
        // Insert limit buy order at correct price level
        const orderEntry = {
          price: simulatedOrder.price,
          size: simulatedOrder.quantity,
          total: 0,
          isSimulated: true
        };
        
        const combined = [...visibleBids, orderEntry];
        combined.sort((a, b) => b.price - a.price);
        
        // Create new objects with recalculated totals
        let total = 0;
        const result = combined.map(entry => {
          total += entry.size;
          return {
            price: entry.price,
            size: entry.size,
            total: total,
            isSimulated: (entry as any).isSimulated || false
          };
        });
        
        return result.slice(0, showAllOrders ? MAX_VISIBLE_ORDERS : DEFAULT_VISIBLE_ORDERS);
      }
    }
    
    return visibleBids;
  }, [visibleBids, simulatedOrder, showAllOrders]);

  const enhancedAsks = useMemo(() => {
    if (!simulatedOrder) return visibleAsks;
    
    if (simulatedOrder.side === 'sell') {
      if (simulatedOrder.type === 'limit') {
        // Insert limit sell order at correct price level
        const orderEntry = {
          price: simulatedOrder.price,
          size: simulatedOrder.quantity,
          total: 0,
          isSimulated: true
        };
        
        const combined = [...visibleAsks, orderEntry];
        combined.sort((a, b) => a.price - b.price);
        
        // Create new objects with recalculated totals
        let total = 0;
        const result = combined.map(entry => {
          total += entry.size;
          return {
            price: entry.price,
            size: entry.size,
            total: total,
            isSimulated: (entry as any).isSimulated || false
          };
        });
        
        return result.slice(0, showAllOrders ? MAX_VISIBLE_ORDERS : DEFAULT_VISIBLE_ORDERS);
      }
    }
    
    return visibleAsks;
  }, [visibleAsks, simulatedOrder, showAllOrders]);

  // Calculate market order consumption
  const marketOrderConsumption = useMemo(() => {
    if (!simulatedOrder || simulatedOrder.type !== 'market') return new Map();
    
    const consumption = new Map<number, number>();
    const targetSide = simulatedOrder.side === 'buy' ? asks : bids;
    let remainingQty = simulatedOrder.quantity;
    
    for (const level of targetSide) {
      if (remainingQty <= 0) break;
      
      const consumedQty = Math.min(remainingQty, level.size);
      consumption.set(level.price, consumedQty);
      remainingQty -= consumedQty;
    }
    
    return consumption;
  }, [simulatedOrder, bids, asks]);

  const isOrderAtPrice = (price: number): boolean => {
    return simulatedOrder?.type === 'limit' && simulatedOrder.price === price;
  };

  const isConsumedByMarketOrder = (price: number): number => {
    return marketOrderConsumption.get(price) || 0;
  };

  const shouldHighlightBid = (bid: any, order: any) => {
    if (!order) return false;
    
    if (order.side === 'buy') {
      if (order.type === 'limit') {
        return order.price === bid.price && bid.isSimulated;
      } else {
        // Market buy orders consume asks, so no bid highlighting for market orders
        return false;
      }
    } else if (order.side === 'sell' && order.type === 'market') {
      // Market sell orders consume bids
      return marketOrderConsumption.has(bid.price);
    }
    
    return false;
  };

  const shouldHighlightAsk = (ask: any, order: any) => {
    if (!order) return false;
    
    if (order.side === 'sell') {
      if (order.type === 'limit') {
        return order.price === ask.price && ask.isSimulated;
      } else {
        // Market sell orders consume bids, so no ask highlighting for market orders
        return false;
      }
    } else if (order.side === 'buy' && order.type === 'market') {
      // Market buy orders consume asks
      return marketOrderConsumption.has(ask.price);
    }
    
    return false;
  };

  const getCellClassName = (entry: any, side: 'bid' | 'ask'): string => {
    let className = `orderbook__price orderbook__price--${side}`;
    
    if (entry?.isSimulated) {
      className += ' orderbook__price--simulated';
    } else if (shouldHighlightBid(entry, simulatedOrder) || shouldHighlightAsk(entry, simulatedOrder)) {
      className += ' orderbook__price--consumed';
    } else if (shouldHighlightBid(entry, simulatedOrder) || shouldHighlightAsk(entry, simulatedOrder)) {
      className += ' orderbook__price--highlight';
    }
    
    return className;
  };

  const getConsumedQuantity = (entry: any, side: 'bid' | 'ask'): string => {
    const consumed = isConsumedByMarketOrder(entry.price);
    if (consumed > 0) {
      const remaining = entry.size - consumed;
      return remaining > 0 ? `${formatSize(remaining)} (${formatSize(consumed)})` : `(${formatSize(consumed)})`;
    }
    return formatSize(entry.size);
  };

  // Initialize WebSocket connection
  useEffect(() => {
    const wsService = WebSocketService.getInstance();

    // Disconnect from previous venue if it changed
    if (prevVenueRef.current !== venue) {
      wsService.disconnect(prevVenueRef.current);
      prevVenueRef.current = venue;
    }

    // Only connect if we have valid venue and symbol
    if (venue && symbol) {
      wsService.connect(venue, symbol);

      // Cleanup function
      return () => {
        wsService.disconnect(venue);
      };
    }
  }, [venue, symbol]); // Only reconnect when venue or symbol changes

  // Cleanup all connections when component unmounts
  useEffect(() => {
    return () => {
      const wsService = WebSocketService.getInstance();
      wsService.disconnectAll();
    };
  }, []); // Empty dependency array for unmount only

  const formatPrice = (price: number | string | null | undefined): string => {
    const num = typeof price === 'number' ? price : parseFloat(String(price || '0'));
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const formatSize = (size: number | string | null | undefined): string => {
    const num = typeof size === 'number' ? size : parseFloat(String(size || '0'));
    return isNaN(num) ? '0.0000' : num.toFixed(4);
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Paper className="orderbook__container">
      <div className="orderbook__header">
        <div className="orderbook__title">
          <Typography variant="h6">
            Order Book
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            {symbol.replace('-PERPETUAL', '')} Perpetual
          </Typography>
        </div>
        <Box width="200px">
          <VenueSelector />
        </Box>
      </div>



      <div className={`orderbook__table-container ${showAllOrders ? 'orderbook__table-container--expanded' : ''}`}>
        <table className="orderbook__table">
          <thead>
            <tr>
              <th colSpan={3} className="orderbook__table-header orderbook__table-header--bid">Bids</th>
              <th colSpan={3} className="orderbook__table-header orderbook__table-header--ask">Asks</th>
            </tr>
            <tr>
              <th>Price</th>
              <th>Size</th>
              <th>Total</th>
              <th>Price</th>
              <th>Size</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {showAllOrders ? (
              // When expanded: show constant MAX_VISIBLE_ORDERS rows with placeholders
              Array.from({ length: MAX_VISIBLE_ORDERS }).map((_, index) => {
                const hasBid = enhancedBids[index];
                const hasAsk = enhancedAsks[index];
                
                return (
                  <tr key={index}>
                    {/* Bid columns */}
                    {hasBid ? (
                      <>
                        <td className={getCellClassName(enhancedBids[index], 'bid')}>
                          {formatPrice(enhancedBids[index].price)}
                        </td>
                        <td>{getConsumedQuantity(enhancedBids[index], 'bid')}</td>
                        <td>{formatSize(enhancedBids[index].total)}</td>
                      </>
                    ) : (
                      <>
                        <td className="orderbook__cell--placeholder"></td>
                        <td className="orderbook__cell--placeholder"></td>
                        <td className="orderbook__cell--placeholder"></td>
                      </>
                    )}
                    
                    {/* Ask columns */}
                    {hasAsk ? (
                      <>
                        <td className={getCellClassName(enhancedAsks[index], 'ask')}>
                          {formatPrice(enhancedAsks[index].price)}
                        </td>
                        <td>{getConsumedQuantity(enhancedAsks[index], 'ask')}</td>
                        <td>{formatSize(enhancedAsks[index].total)}</td>
                      </>
                    ) : (
                      <>
                        <td className="orderbook__cell--placeholder"></td>
                        <td className="orderbook__cell--placeholder"></td>
                        <td className="orderbook__cell--placeholder"></td>
                      </>
                    )}
                  </tr>
                );
              })
            ) : (
              // When collapsed: show only actual data rows (dynamic height)
              Array.from({ length: Math.max(enhancedBids.length, enhancedAsks.length) }).map((_, index) => (
                <tr key={index}>
                  {/* Bid columns */}
                  {enhancedBids[index] ? (
                    <>
                      <td className={getCellClassName(enhancedBids[index], 'bid')}>
                        {formatPrice(enhancedBids[index].price)}
                      </td>
                      <td>{getConsumedQuantity(enhancedBids[index], 'bid')}</td>
                      <td>{formatSize(enhancedBids[index].total)}</td>
                    </>
                  ) : (
                    <td colSpan={3}></td>
                  )}
                  
                  {/* Ask columns */}
                  {enhancedAsks[index] ? (
                    <>
                      <td className={getCellClassName(enhancedAsks[index], 'ask')}>
                        {formatPrice(enhancedAsks[index].price)}
                      </td>
                      <td>{getConsumedQuantity(enhancedAsks[index], 'ask')}</td>
                      <td>{formatSize(enhancedAsks[index].total)}</td>
                    </>
                  ) : (
                    <td colSpan={3}></td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {(bids.length > DEFAULT_VISIBLE_ORDERS || asks.length > DEFAULT_VISIBLE_ORDERS) && (
          <Button
            className="orderbook__toggle-button"
            onClick={() => setShowAllOrders(!showAllOrders)}
            fullWidth
            startIcon={showAllOrders ? <ExpandLess /> : <ExpandMore />}
          >
            {showAllOrders 
              ? 'Show Less' 
              : `Show More (${Math.min(
                  Math.max(bids.length, asks.length) - DEFAULT_VISIBLE_ORDERS,
                  MAX_VISIBLE_ORDERS - DEFAULT_VISIBLE_ORDERS
                )} more)`
            }
          </Button>
        )}
      </div>

      <div className="orderbook__chart">
        <ResponsiveContainer>
          <LineChart
            data={priceHistory}
            margin={{ left: 10, right: 30, top: 10, bottom: 5 }}
          >
            <XAxis 
              dataKey="timestamp" 
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTime}
              interval="preserveStartEnd"
              padding={{ left: 10, right: 10 }}
            />
            <YAxis 
              domain={['auto', 'auto']}
              tickFormatter={(value) => formatPrice(value)}
              width={80}
              padding={{ top: 20, bottom: 20 }}
              tickCount={8}
            />
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(128, 128, 128, 0.2)"
              strokeWidth={1}
            />
            <Tooltip
              labelFormatter={(label) => formatTime(label)}
              formatter={(value: number) => [formatPrice(value), 'Price']}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '4px',
                padding: '8px'
              }}
            />
            <Legend 
              verticalAlign="top"
              height={36}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#4caf50"
              dot={false}
              name="Best Bid"
              data={priceHistory.filter(p => p.side === 'bid')}
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#f44336"
              dot={false}
              name="Best Ask"
              data={priceHistory.filter(p => p.side === 'ask')}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Paper>
  );
};

export default OrderBook; 