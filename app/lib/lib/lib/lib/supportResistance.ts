import { Candle, KeyLevels } from './types';

export function calculateSupportResistance(candles: Candle[], lookback: number = 60): KeyLevels {
  const windowCandles = candles.slice(-lookback);
  const highs = windowCandles.map(c => c.high);
  const lows = windowCandles.map(c => c.low);

  let recentSwingHigh = highs[highs.length - 1];
  let recentSwingLow = lows[lows.length - 1];

  for (let i = windowCandles.length - 3; i >= 2; i--) {
    const h = windowCandles[i].high;
    if (h > windowCandles[i-1].high && h > windowCandles[i-2].high && h > windowCandles[i+1].high && h > windowCandles[i+2].high) {
      recentSwingHigh = h;
      break;
    }
  }

  for (let i = windowCandles.length - 3; i >= 2; i--) {
    const l = windowCandles[i].low;
    if (l < windowCandles[i-1].low && l < windowCandles[i-2].low && l < windowCandles[i+1].low && l < windowCandles[i+2].low) {
      recentSwingLow = l;
      break;
    }
  }

  const resistance = Math.max(...highs);
  const support = Math.min(...lows);
  const currentPrice = candles[candles.length - 1].close;

  return {
    support,
    resistance,
    recentSwingHigh,
    recentSwingLow,
    breakoutZone: currentPrice > recentSwingHigh || currentPrice < recentSwingLow,
    retestZone: Math.abs(currentPrice - recentSwingHigh) / currentPrice < 0.0005,
  };
}

