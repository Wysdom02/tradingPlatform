import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, TextField, Typography, IconButton, Chip, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { RootState } from '@/store';
import { setSimulatedOrder, clearOrderHistory, setSymbol } from '@/store/orderbookSlice';
import { DELAY_OPTIONS, TRADING_SYMBOLS } from '@/constants/simulation.constants';
import './OrderSimulation.scss';

const OrderSimulation: React.FC = () => {
  const dispatch = useDispatch();
  const { bids, asks, simulatedOrder, orderHistory, symbol } = useSelector((state: RootState) => state.orderbook);

  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [delay, setDelay] = useState<number>(0);
  const [marketImpact, setMarketImpact] = useState<any>(null);

  // Reset form when symbol changes
  useEffect(() => {
    setPrice('');
    setQuantity('');
    setMarketImpact(null);
  }, [symbol]);

  // Update price when market price changes
  useEffect(() => {
    if (orderType === 'market') {
      const marketPrice = side === 'buy' ? asks[0]?.price : bids[0]?.price;
      if (marketPrice) {
        setPrice(marketPrice.toString());
      }
    }
  }, [orderType, side, bids, asks]);

  const calculateMarketImpact = () => {
    if (!quantity || parseFloat(quantity) <= 0) return null;
    if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) return null;

    const qty = parseFloat(quantity);
    const targetPrice = orderType === 'market' 
      ? (side === 'buy' ? asks[0]?.price : bids[0]?.price) 
      : parseFloat(price);

    if (!targetPrice || qty <= 0) return null;

    // Calculate mid price
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const midPrice = (bestBid + bestAsk) / 2;

    const bookSide = side === 'buy' ? asks : bids;
    let qtyLeft = qty;
    let cost = 0;
    let lastPrice = targetPrice;
    let depthLevels = 0;

    // Walk through the order book
    for (let i = 0; i < bookSide.length && qtyLeft > 0; i++) {
      const level = bookSide[i];
      depthLevels++;
      
      if (orderType === 'limit') {
        const priceOutOfRange = (side === 'buy' && level.price > targetPrice) ||
                               (side === 'sell' && level.price < targetPrice);
        if (priceOutOfRange) break;
      }

      const fillQty = Math.min(qtyLeft, level.size);
      cost += fillQty * level.price;
      qtyLeft -= fillQty;
      lastPrice = level.price;
    }

    const filled = qty - qtyLeft;
    const fillPct = (filled / qty) * 100; // Estimated Fill %
    const avgPrice = filled > 0 ? cost / filled : targetPrice;
    
    // Market Impact: How far into the order book
    const marketImpact = depthLevels;
    const impactBps = Math.abs(((lastPrice - midPrice) / midPrice) * 10000); // basis points
    
    // Slippage Estimation 
    let slippagePct = 0;
    if (orderType === 'market') {
      // For market orders: (Average Executed Price - Mid Price) / Mid Price * 100
      slippagePct = ((avgPrice - midPrice) / midPrice) * 100;
    } else {
      // For limit orders: difference from target price
      slippagePct = side === 'buy' 
        ? ((avgPrice - targetPrice) / targetPrice) * 100
        : ((targetPrice - avgPrice) / targetPrice) * 100;
    }

    // Estimated Time to Fill (simplified calculation for limit orders)
    let estimatedTimeToFill = null;
    if (orderType === 'limit' && fillPct < 100) {
      // Simple heuristic: assume 1-5 minutes per depth level for unfilled portion
      const unfilledPct = 100 - fillPct;
      const timeMultiplier = Math.max(1, depthLevels / 2);
      estimatedTimeToFill = Math.round((unfilledPct / 20) * timeMultiplier); // minutes
    }

    const result = {
      fillPercentage: fillPct,
      averagePrice: avgPrice,
      slippage: slippagePct,
      estimatedCost: cost,
      worstPrice: lastPrice,
      immediateExecution: fillPct === 100,
      marketImpact: {
        depthLevels,
        impactBps,
        priceMovement: Math.abs(lastPrice - midPrice)
      },
      midPrice,
      estimatedTimeToFill
    };

    setMarketImpact(result);
    return result;
  };

  const resetForm = () => {
    setOrderType('limit');
    setSide('buy');
    setPrice('');
    setQuantity('');
    setDelay(0);
    setMarketImpact(null);
  };

  const getMarketPrice = (): number => {
    if (side === 'buy' && asks.length > 0) {
      return Number(asks[0].price) || 0;
    } else if (side === 'sell' && bids.length > 0) {
      return Number(bids[0].price) || 0;
    }
    return 0;
  };

  const handleSimulate = () => {
    if (!quantity || (orderType === 'limit' && !price)) return;

    const impact = calculateMarketImpact();
    if (!impact) return;

    const marketPrice = orderType === 'market' ? getMarketPrice() : parseFloat(price);
    if (orderType === 'market' && marketPrice === 0) {
      return; // Don't simulate if we can't get a valid market price
    }

    const simulatedOrder = {
      type: orderType,
      side,
      price: marketPrice,
      quantity: parseFloat(quantity),
      delay,
      impact,
      timestamp: Date.now()
    };

    dispatch(setSimulatedOrder(simulatedOrder));

    // Reset form after simulation
    resetForm();

    // Clear the simulation after the delay
    if (delay > 0) {
      setTimeout(() => {
        dispatch(setSimulatedOrder(null));
      }, delay);
    }
  };

  const handlePriceChange = (value: string) => {
    setPrice(value);
    // Calculate market impact even with single digit or partial input
    if (value && quantity && parseFloat(value) > 0 && parseFloat(quantity) > 0) {
      calculateMarketImpact();
    }
  };

  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    // Calculate market impact even with single digit or partial input
    if (value && parseFloat(value) > 0) {
      if (orderType === 'market' || (orderType === 'limit' && price && parseFloat(price) > 0)) {
        calculateMarketImpact();
      }
    }
  };

  const handleSymbolChange = (newSymbol: string) => {
    dispatch(setSymbol(newSymbol));
  };

  const formatPrice = (price: number | string | null | undefined): string => {
    if (typeof price === 'number') {
      return price.toFixed(2);
    }
    if (typeof price === 'string') {
      const num = parseFloat(price);
      return isNaN(num) ? '0.00' : num.toFixed(2);
    }
    return '0.00';
  };

  const formatSize = (size: number | string | null | undefined): string => {
    if (typeof size === 'number') {
      return size.toFixed(4);
    }
    if (typeof size === 'string') {
      const num = parseFloat(size);
      return isNaN(num) ? '0.0000' : num.toFixed(4);
    }
    return '0.0000';
  };

  const handleClearHistory = () => {
    dispatch(clearOrderHistory());
  };

  return (
    <Paper className="order-simulation__container">
      <div className="order-simulation__header">
        <Typography variant="h6" className="order-simulation__title">
          Order Simulation
        </Typography>
        {orderHistory.length > 0 && (
          <IconButton 
            size="small" 
            onClick={handleClearHistory}
            title="Clear History"
          >
            <DeleteIcon />
          </IconButton>
        )}
      </div>

      <Box className="order-simulation__form">
        <FormControl fullWidth className="form-field">
          <InputLabel>Trading Pair</InputLabel>
          <Select
            value={symbol}
            onChange={(e) => handleSymbolChange(e.target.value)}
            label="Trading Pair"
            defaultValue="BTC-PERPETUAL"
          >
            {TRADING_SYMBOLS.map((sym) => (
              <MenuItem 
                key={sym.value} 
                value={sym.value}
                selected={sym.value === 'BTC-PERPETUAL'}
              >
                {sym.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth className="form-field">
          <InputLabel>Order Type</InputLabel>
          <Select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as 'market' | 'limit')}
            label="Order Type"
          >
            <MenuItem value="market">Market</MenuItem>
            <MenuItem value="limit">Limit</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth className="form-field">
          <InputLabel>Side</InputLabel>
          <Select
            value={side}
            onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}
            label="Side"
          >
            <MenuItem value="buy">Buy</MenuItem>
            <MenuItem value="sell">Sell</MenuItem>
          </Select>
        </FormControl>

        {orderType === 'limit' && (
          <TextField
            fullWidth
            className="form-field"
            label="Price"
            type="number"
            value={price}
            onChange={(e) => handlePriceChange(e.target.value)}
            error={price !== '' && parseFloat(price) <= 0}
            helperText={price !== '' && parseFloat(price) <= 0 ? 'Invalid price' : ''}
          />
        )}

        {orderType === 'market' && (
          <Typography variant="body2" className="order-simulation__market-price">
            Market Price: {getMarketPrice()?.toFixed(2) || 'N/A'}
          </Typography>
        )}

        <TextField
          fullWidth
          className="form-field"
          label="Quantity"
          type="number"
          value={quantity}
          onChange={(e) => handleQuantityChange(e.target.value)}
          error={quantity !== '' && parseFloat(quantity) <= 0}
          helperText={quantity !== '' && parseFloat(quantity) <= 0 ? 'Invalid quantity' : ''}
        />

        <FormControl fullWidth className="form-field">
          <InputLabel>Simulation Delay</InputLabel>
          <Select
            value={delay.toString()}
            onChange={(e) => setDelay(Number(e.target.value))}
            label="Simulation Delay"
          >
            {DELAY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {marketImpact && (
          <Box className="order-simulation__impact-analysis">
            <Typography variant="subtitle2" className="order-simulation__impact-analysis-title">
              Order Impact Analysis
            </Typography>
            
            <div className="order-simulation__metrics-grid">
              {/* Fill Metrics */}
              <div className="order-simulation__metric-section">
                <Typography variant="caption" className="order-simulation__section-header">
                  Execution Metrics
                </Typography>
                <div className="order-simulation__metric">
                  <span className="order-simulation__metric-label">Fill Percentage:</span>
                  <span className="order-simulation__metric-value">{marketImpact.fillPercentage.toFixed(2)}%</span>
                </div>
                <div className="order-simulation__metric">
                  <span className="order-simulation__metric-label">Average Price:</span>
                  <span className="order-simulation__metric-value">${marketImpact.averagePrice.toFixed(2)}</span>
                </div>
                <div className="order-simulation__metric">
                  <span className="order-simulation__metric-label">Estimated Cost:</span>
                  <span className="order-simulation__metric-value">${marketImpact.estimatedCost.toFixed(2)}</span>
                </div>
              </div>

              {/* Market Impact */}
              <div className="order-simulation__metric-section">
                <Typography variant="caption" className="order-simulation__section-header">
                  Market Impact
                </Typography>
                <div className="order-simulation__metric">
                  <span className="order-simulation__metric-label">Depth Levels:</span>
                  <span className="order-simulation__metric-value">{marketImpact.marketImpact.depthLevels}</span>
                </div>
                <div className="order-simulation__metric">
                  <span className="order-simulation__metric-label">Price Movement:</span>
                  <span className="order-simulation__metric-value">${marketImpact.marketImpact.priceMovement.toFixed(2)}</span>
                </div>
                <div className="order-simulation__metric">
                  <span className="order-simulation__metric-label">Impact (bps):</span>
                  <span className="order-simulation__metric-value">{marketImpact.marketImpact.impactBps.toFixed(1)}</span>
                </div>
              </div>

              {/* Slippage & Timing */}
              <div className="order-simulation__metric-section">
                <Typography variant="caption" className="order-simulation__section-header">
                  Risk Metrics
                </Typography>
                <div className="order-simulation__metric">
                  <span className="order-simulation__metric-label">Mid Price:</span>
                  <span className="order-simulation__metric-value">${marketImpact.midPrice.toFixed(2)}</span>
                </div>
                <div className="order-simulation__metric">
                  <span className="order-simulation__metric-label">Slippage:</span>
                  <span className={`order-simulation__metric-value ${Math.abs(marketImpact.slippage) > 2 ? 'order-simulation__metric-value--warning' : ''}`}>
                    {marketImpact.slippage > 0 ? '+' : ''}{marketImpact.slippage.toFixed(2)}%
                  </span>
                </div>
                {marketImpact.estimatedTimeToFill && (
                  <div className="order-simulation__metric">
                    <span className="order-simulation__metric-label">Est. Time to Fill:</span>
                    <span className="order-simulation__metric-value">~{marketImpact.estimatedTimeToFill}min</span>
                  </div>
                )}
              </div>
            </div>

            {/* Alerts */}
            <div className="order-simulation__alerts">
              {Math.abs(marketImpact.slippage) > 2 && (
                <Alert severity="warning" className="order-simulation__alert">
                  High slippage detected ({marketImpact.slippage.toFixed(2)}%). Consider adjusting your order size or price.
                </Alert>
              )}
              {marketImpact.marketImpact.depthLevels > 5 && (
                <Alert severity="info" className="order-simulation__alert">
                  Order would consume {marketImpact.marketImpact.depthLevels} price levels. Consider breaking into smaller orders.
                </Alert>
              )}
              {!marketImpact.immediateExecution && (
                <Alert severity="info" className="order-simulation__alert">
                  Partial fill expected. Only {marketImpact.fillPercentage.toFixed(1)}% would execute immediately.
                </Alert>
              )}
              {orderType === 'limit' && marketImpact.fillPercentage === 0 && (
                <Alert severity="warning" className="order-simulation__alert">
                  Order price is outside current market range. May not fill immediately.
                </Alert>
              )}
            </div>
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          fullWidth
          className="order-simulation__submit-button"
          onClick={handleSimulate}
          disabled={!quantity || (orderType === 'limit' && !price) || parseFloat(quantity) <= 0}
        >
          Simulate Order
        </Button>
      </Box>

      {simulatedOrder && (
        <Box className="order-simulation__current-order">
          <Typography variant="subtitle2" color="primary" className="order-simulation__section-title">
            Active Simulation
          </Typography>
          <Chip
            label={`${simulatedOrder.type.toUpperCase()} ${simulatedOrder.side.toUpperCase()}`}
            color={simulatedOrder.side === 'buy' ? 'success' : 'error'}
            size="small"
            className="order-simulation__order-chip"
          />
          <div className="order-simulation__order-details">
            <div className="order-simulation__detail-item">
              <span>Price:</span>
              <strong>{simulatedOrder.type === 'market' ? 'MARKET' : formatPrice(simulatedOrder.price)}</strong>
            </div>
            <div className="order-simulation__detail-item">
              <span>Size:</span>
              <strong>{formatSize(simulatedOrder.quantity)}</strong>
            </div>
            {simulatedOrder.impact && (
              <>
                <div className="order-simulation__detail-item">
                  <span>Fill:</span>
                  <strong>{simulatedOrder.impact.fillPercentage.toFixed(2)}%</strong>
                </div>
                <div className="order-simulation__detail-item">
                  <span>Avg Price:</span>
                  <strong>{formatPrice(simulatedOrder.impact.averagePrice)}</strong>
                </div>
              </>
            )}
          </div>
        </Box>
      )}

      {orderHistory.length > 0 && (
        <Box className="order-simulation__history">
          <Typography variant="subtitle2" color="textSecondary" className="order-simulation__section-title">
            Recent Orders
          </Typography>
          <div className="order-simulation__history-list">
            {orderHistory.slice(0, 3).map((order, index) => (
              <div key={index} className="order-simulation__history-item">
                <Chip
                  label={`${order.type.toUpperCase()} ${order.side.toUpperCase()}`}
                  color={order.side === 'buy' ? 'success' : 'error'}
                  size="small"
                  variant="outlined"
                  className="order-simulation__order-chip"
                />
                <div className="order-simulation__history-details">
                  <span>{order.type === 'market' ? 'MARKET' : formatPrice(order.price)}</span>
                  <span>{formatSize(order.quantity)}</span>
                  <span>{order.impact?.fillPercentage.toFixed(2)}%</span>
                </div>
              </div>
            ))}
            {orderHistory.length > 3 && (
              <Typography variant="caption" color="textSecondary" className="order-simulation__history-more">
                +{orderHistory.length - 3} more orders in history table below
              </Typography>
            )}
          </div>
        </Box>
      )}
    </Paper>
  );
};

export default OrderSimulation; 