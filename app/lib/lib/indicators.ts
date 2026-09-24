import { Candle, TechnicalIndicators } from './types';

export function calculateEMA(data: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const emaArray: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return emaArray;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  let prevEma = sum / period;
  emaArray[period - 1] = prevEma;

  for (let i = period; i < data.length; i++) {
    const currentEma = (data[i] - prevEma) * k + prevEma;
    emaArray[i] = currentEma;
    prevEma = currentEma;
  }
  return emaArray;
}

export function calculateRSI(closes: number[], period: number = 14): (number | null)[] {
  const rsi: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return rsi;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    if (avgLoss === 0) rsi[i] = 100;
    else rsi[i] = 100 - (100 / (1 + avgGain / avgLoss));
  }
  return rsi;
}

export function calculateMACD(closes: number[], fast = 12, slow = 26, signal = 9) {
  const fastEMA = calculateEMA(closes, fast);
  const slowEMA = calculateEMA(closes, slow);
  const macdLine: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = 0; i < closes.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      macdLine[i] = (fastEMA[i] as number) - (slowEMA[i] as number);
    }
  }

  const validIndices = macdLine.map((val, idx) => (val !== null ? idx : -1)).filter(idx => idx !== -1);
  const validValues = macdLine.filter((v): v is number => v !== null);
  const calculatedSignal = calculateEMA(validValues, signal);

  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  const histogram: (number | null)[] = new Array(closes.length).fill(null);

  calculatedSignal.forEach((val, index) => {
    const originalIndex = validIndices[index];
    signalLine[originalIndex] = val;
    if (val !== null && macdLine[originalIndex] !== null) {
      histogram[originalIndex] = (macdLine[originalIndex] as number) - val;
    }
  });

  return { macdLine, signalLine, histogram };
}

export function calculateATR(candles: Candle[], period: number = 14): (number | null)[] {
  const atr: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period + 1) return atr;

  const trs: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hcp = Math.abs(candles[i].high - candles[i - 1].close);
    const lcp = Math.abs(candles[i].low - candles[i - 1].close);
    trs.push(Math.max(hl, hcp, lcp));
  }

  let sum = 0;
  for (let i = 0; i < period; i++) sum += trs[i];
  let prevAtr = sum / period;
  atr[period - 1] = prevAtr;

  for (let i = period; i < trs.length; i++) {
    prevAtr = (prevAtr * (period - 1) + trs[i]) / period;
    atr[i] = prevAtr;
  }
  return atr;
}

export function calculateBollingerBands(closes: number[], period: number = 20, stdDevMult: number = 2) {
  const middle: (number | null)[] = new Array(closes.length).fill(null);
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    middle[i] = mean;
    upper[i] = mean + stdDev * stdDevMult;
    lower[i] = mean - stdDev * stdDevMult;
  }
  return { upper, middle, lower };
}

export function computeAllIndicators(candles: Candle[]): TechnicalIndicators {
  const closes = candles.map(c => c.close);
  return {
    ema9: calculateEMA(closes, 9),
    ema21: calculateEMA(closes, 21),
    ema50: calculateEMA(closes, 50),
    rsi14: calculateRSI(closes, 14),
    macd: calculateMACD(closes),
    bollingerBands: calculateBollingerBands(closes),
    atr14: calculateATR(candles, 14),
  };
}

