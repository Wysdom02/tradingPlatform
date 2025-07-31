import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Box, Paper, Typography } from '@mui/material';
import { RootState } from '@/store';
import './MarketDepth.scss';

const MarketDepth: React.FC = () => {
  const { bids, asks, simulatedOrder } = useSelector((state: RootState) => state.orderbook);

  const chartData = useMemo(() => {
    // Sort bids descending and asks ascending by price
    const sortedBids = [...bids].sort((a, b) => b.price - a.price);
    const sortedAsks = [...asks].sort((a, b) => a.price - b.price);

    // Calculate cumulative volumes
    let bidCumulative = 0;
    let askCumulative = 0;

    const bidPoints = sortedBids.map(bid => {
      bidCumulative += bid.size;
      return {
        price: bid.price,
        bidVolume: bidCumulative,
        side: 'bid'
      };
    });

    const askPoints = sortedAsks.map(ask => {
      askCumulative += ask.size;
      return {
        price: ask.price,
        askVolume: askCumulative,
        side: 'ask'
      };
    });

    // Combine and sort by price
    return [...bidPoints, ...askPoints].sort((a, b) => a.price - b.price);
  }, [bids, asks]);

  const orderImpact = useMemo(() => {
    if (!simulatedOrder) return null;

    const relevantOrders = simulatedOrder.side === 'buy' ? asks : bids;
    const orderPrice = simulatedOrder.type === 'market' 
      ? (simulatedOrder.side === 'buy' ? asks[0]?.price : bids[0]?.price)
      : simulatedOrder.price;

    let remainingQuantity = simulatedOrder.quantity;
    let totalCost = 0;
    let filledQuantity = 0;
    let worstPrice = orderPrice;

    for (const order of relevantOrders) {
      if (remainingQuantity <= 0) break;

      if (simulatedOrder.type === 'limit') {
        if ((simulatedOrder.side === 'buy' && order.price > orderPrice) ||
            (simulatedOrder.side === 'sell' && order.price < orderPrice)) {
          break;
        }
      }

      const fillQuantity = Math.min(remainingQuantity, order.size);
      totalCost += fillQuantity * order.price;
      filledQuantity += fillQuantity;
      remainingQuantity -= fillQuantity;
      worstPrice = order.price;
    }

    const fillPercentage = (filledQuantity / simulatedOrder.quantity) * 100;
    const averagePrice = filledQuantity > 0 ? totalCost / filledQuantity : orderPrice;
    const slippage = ((averagePrice - orderPrice) / orderPrice) * 100;

    return {
      fillPercentage,
      averagePrice,
      slippage: Math.abs(slippage),
      worstPrice,
      estimatedCost: totalCost,
    };
  }, [simulatedOrder, bids, asks]);

  const formatPrice = (price: number | undefined | null): string => {
    if (typeof price !== 'number' || isNaN(price)) {
      return '0.00';
    }
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatVolume = (volume: number | undefined | null): string => {
    if (typeof volume !== 'number' || isNaN(volume)) {
      return '0.0';
    }
    if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + 'k';
    }
    return volume.toFixed(1);
  };

  // Calculate mid price for tooltip
  const midPrice = useMemo(() => {
    if (bids.length && asks.length) {
      const highestBid = Math.max(...bids.map(bid => bid.price));
      const lowestAsk = Math.min(...asks.map(ask => ask.price));
      return (highestBid + lowestAsk) / 2;
    }
    return null;
  }, [bids, asks]);

  return (
    <div className="market-depth">
      <div className="market-depth__header">
        <h2 className="market-depth__title">Market Depth</h2>
        {midPrice && (
          <div className="market-depth__mid-price">
            Mid Price: {formatPrice(midPrice)}
          </div>
        )}
      </div>

      {simulatedOrder && orderImpact && (
        <div className="market-depth__impact">
          <div className="market-depth__impact-header">
            <Typography variant="subtitle2">
              Simulated {simulatedOrder.type.toUpperCase()} {simulatedOrder.side.toUpperCase()}
            </Typography>
            <Typography variant="body2">
              {formatVolume(simulatedOrder.quantity)} @ {
                simulatedOrder.type === 'market' 
                  ? 'Market Price'
                  : formatPrice(simulatedOrder.price)
              }
            </Typography>
          </div>
          <div className="market-depth__impact-metrics">
            <div className="market-depth__impact-metric">
              <span>Fill %</span>
              <strong>{orderImpact.fillPercentage.toFixed(1)}%</strong>
            </div>
            <div className="market-depth__impact-metric">
              <span>Avg. Price</span>
              <strong>{formatPrice(orderImpact.averagePrice)}</strong>
            </div>
            <div className="market-depth__impact-metric">
              <span>Slippage</span>
              <strong>{orderImpact.slippage.toFixed(2)}%</strong>
            </div>
            <div className="market-depth__impact-metric">
              <span>Est. Cost</span>
              <strong>{formatPrice(orderImpact.estimatedCost)}</strong>
            </div>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={chartData}
          margin={{ left: 10, right: 30, top: 20, bottom: 5 }}
        >
          <XAxis
            dataKey="price"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatPrice}
            padding={{ left: 10, right: 10 }}
            interval="preserveEnd"
            tickCount={8}
          />
          <YAxis
            tickFormatter={formatVolume}
            width={60}
            padding={{ top: 20, bottom: 20 }}
            tickCount={8}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatVolume(value),
              name === 'bidVolume' ? 'Cumulative Bid Size' : 'Cumulative Ask Size'
            ]}
            labelFormatter={(price) => `Price: ${formatPrice(price)}`}
          />
          <Legend
            formatter={(value) => (value === 'bidVolume' ? 'Bids' : 'Asks')}
          />
          <Area
            type="monotone"
            dataKey="bidVolume"
            stroke="#4caf50"
            fill="#4caf50"
            fillOpacity={0.2}
            strokeWidth={2}
            name="bidVolume"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="askVolume"
            stroke="#f44336"
            fill="#f44336"
            fillOpacity={0.2}
            strokeWidth={2}
            name="askVolume"
            isAnimationActive={false}
          />
          
          {simulatedOrder && (
            <>
              <ReferenceLine
                x={simulatedOrder.type === 'market' 
                  ? (simulatedOrder.side === 'buy' ? asks[0]?.price : bids[0]?.price)
                  : simulatedOrder.price
                }
                stroke="#2196f3"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: 'Order',
                  position: 'top',
                  fill: '#2196f3'
                }}
              />
              {orderImpact && orderImpact.worstPrice !== simulatedOrder.price && (
                <ReferenceLine
                  x={orderImpact.worstPrice}
                  stroke="#ff9800"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{
                    value: 'Impact',
                    position: 'bottom',
                    fill: '#ff9800'
                  }}
                />
              )}
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MarketDepth; 