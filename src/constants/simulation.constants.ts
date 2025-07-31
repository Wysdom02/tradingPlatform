export const DELAY_OPTIONS = [
  { value: 0, label: 'Immediate' },
  { value: 5000, label: '5s delay' },
  { value: 10000, label: '10s delay' },
  { value: 30000, label: '30s delay' },
] as const;

export const TRADING_SYMBOLS = [
  { value: 'BTC-PERPETUAL', label: 'BTC/USD Perpetual' },
  { value: 'ETH-PERPETUAL', label: 'ETH/USD Perpetual' },
] as const; 