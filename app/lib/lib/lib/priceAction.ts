import { Candle } from './types';

export interface PriceActionPattern {
  name: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number;
}

export function detectCandlePattern(candles: Candle[]): PriceActionPattern {
  if (candles.length < 2) return { name: 'Indeterminate', bias: 'NEUTRAL', strength: 0 };

  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];

  const totalRange = current.high - current.low;
  if (totalRange === 0) return { name: 'Flat', bias: 'NEUTRAL', strength: 0 };

  const body = Math.abs(current.close - current.open);
  const upperWick = current.high - Math.max(current.close, current.open);
  const lowerWick = Math.min(current.close, current.open) - current.low;
  const isGreen = current.close > current.open;

  // Hammer / Bullish Pin Bar
  if (lowerWick / totalRange >= 0.60 && body / totalRange <= 0.30) {
    return { name: 'Bullish Hammer / Pin Bar', bias: 'BULLISH', strength: 0.85 };
  }

  // Shooting Star / Bearish Pin Bar
  if (upperWick / totalRange >= 0.60 && body / totalRange <= 0.30) {
    return { name: 'Bearish Shooting Star', bias: 'BEARISH', strength: 0.85 };
  }

  // Engulfing
  if (isGreen && previous.close < previous.open && current.open <= previous.close && current.close >= previous.open) {
    return { name: 'Bullish Engulfing', bias: 'BULLISH', strength: 0.90 };
  }
  if (!isGreen && previous.close > previous.open && current.open >= previous.close && current.close <= previous.open) {
    return { name: 'Bearish Engulfing', bias: 'BEARISH', strength: 0.90 };
  }

  // Doji
  if (body / totalRange <= 0.10) {
    return { name: 'Doji', bias: 'NEUTRAL', strength: 0.60 };
  }

  // Strong Momentum Candle
  if (body / totalRange >= 0.75) {
    return {
      name: isGreen ? 'Strong Bullish Candle' : 'Strong Bearish Candle',
      bias: isGreen ? 'BULLISH' : 'BEARISH',
      strength: 0.75,
    };
  }

  return { name: 'Consolidation Candle', bias: 'NEUTRAL', strength: 0.2 };
}
