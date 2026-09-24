import { Candle, SignalEngineConfig, AnalysisOutput, DataSourceType } from './types';
import { computeAllIndicators } from './indicators';
import { detectCandlePattern } from './priceAction';
import { calculateSupportResistance } from './supportResistance';

const DEFAULT_CONFIG: SignalEngineConfig = {
  minSetupScore: 70,
  highQualityScore: 80,
  cooldownPeriodCandles: 2,
  maxCandleRangeMultiplier: 2.8,
  weights: {
    trend: 20,
    priceAction: 20,
    supportResistance: 20,
    momentum: 15,
    emaStructure: 10,
    volatility: 10,
    htfConfirmation: 5,
  },
};

export function analyzeMarket(
  candles1M: Candle[],
  candles5M: Candle[],
  asset: string,
  dataSource: DataSourceType,
  config: SignalEngineConfig = DEFAULT_CONFIG
): AnalysisOutput {
  const timestamp = Date.now();

  if (!candles1M || candles1M.length < 50) {
    return {
      asset,
      timeframe: '1 MINUTE',
      dataSource,
      signal: 'NO_TRADE',
      setupScore: 0,
      trend: 'Neutral/Choppy',
      momentum: 'Conflicted',
      volatility: 'Low',
      currentPrice: 0,
      support: 0,
      resistance: 0,
      entry: 'Execution Prohibited',
      expiryGuidance: 'Wait for confirmation',
      confirmations: [],
      riskFlags: ['Insufficient candle history (need >= 50 candles)'],
      reason: 'Not enough data to calculate valid EMAs and momentum.',
      waitFor: 'Accumulation of candles.',
      timestamp,
    };
  }

  const lastCandle = candles1M[candles1M.length - 1];
  const ind1M = computeAllIndicators(candles1M);
  const levels = calculateSupportResistance(candles1M);
  const pattern = detectCandlePattern(candles1M);

  const len = candles1M.length - 1;
  const currentPrice = lastCandle.close;
  const ema9 = ind1M.ema9[len];
  const ema21 = ind1M.ema21[len];
  const ema50 = ind1M.ema50[len];
  const rsi = ind1M.rsi14[len] ?? 50;
  const macdHist = ind1M.macd.histogram[len] ?? 0;
  const atr = ind1M.atr14[len] ?? (lastCandle.high - lastCandle.low);

  let bullishScore = 0;
  let bearishScore = 0;
  const confirmations: string[] = [];
  const riskFlags: string[] = [];

  // Trend
  let trendDirection: 'Bullish' | 'Bearish' | 'Neutral/Choppy' = 'Neutral/Choppy';
  if (ema9 && ema21 && ema50) {
    if (ema9 > ema21 && ema21 > ema50) {
      bullishScore += config.weights.trend;
      trendDirection = 'Bullish';
      confirmations.push('Aligned Bullish EMAs (9 > 21 > 50)');
    } else if (ema9 < ema21 && ema21 < ema50) {
      bearishScore += config.weights.trend;
      trendDirection = 'Bearish';
      confirmations.push('Aligned Bearish EMAs (9 < 21 < 50)');
    } else {
      riskFlags.push('EMAs tangled (Sideways range)');
    }
  }

  // Price Action
  if (pattern.bias === 'BULLISH') {
    bullishScore += config.weights.priceAction * pattern.strength;
    confirmations.push(`Price Action: ${pattern.name}`);
  } else if (pattern.bias === 'BEARISH') {
    bearishScore += config.weights.priceAction * pattern.strength;
    confirmations.push(`Price Action: ${pattern.name}`);
  }

  // S/R
  const distToSupp = Math.abs(currentPrice - levels.support) / currentPrice;
  const distToRes = Math.abs(levels.resistance - currentPrice) / currentPrice;
  if (distToSupp < 0.0008 && lastCandle.close > lastCandle.open) {
    bullishScore += config.weights.supportResistance;
    confirmations.push(`Bounce off Support (${levels.support.toFixed(5)})`);
  } else if (distToRes < 0.0008 && lastCandle.close < lastCandle.open) {
    bearishScore += config.weights.supportResistance;
    confirmations.push(`Rejection from Resistance (${levels.resistance.toFixed(5)})`);
  }

  // Momentum
  let momentumState: AnalysisOutput['momentum'] = 'Conflicted';
  if (macdHist > 0 && rsi >= 48 && rsi <= 68) {
    bullishScore += config.weights.momentum;
    momentumState = rsi > 58 ? 'Strong Bullish' : 'Moderate Bullish';
    confirmations.push(`Bullish Momentum (RSI ${rsi.toFixed(1)})`);
  } else if (macdHist < 0 && rsi <= 52 && rsi >= 32) {
    bearishScore += config.weights.momentum;
    momentumState = rsi < 42 ? 'Strong Bearish' : 'Moderate Bearish';
    confirmations.push(`Bearish Momentum (RSI ${rsi.toFixed(1)})`);
  }

  const finalScore = Math.min(100, Math.round(Math.max(bullishScore, bearishScore)));

  if (bullishScore >= config.minSetupScore && bullishScore > bearishScore && trendDirection !== 'Bearish') {
    return {
      asset,
      timeframe: '1 MINUTE',
      dataSource,
      signal: 'CALL',
      setupScore: finalScore,
      trend: trendDirection,
      momentum: momentumState,
      volatility: 'Normal',
      currentPrice,
      support: levels.support,
      resistance: levels.resistance,
      entry: 'After confirmation candle closes bullish',
      expiryGuidance: '1–2 minutes',
      confirmations,
      riskFlags: riskFlags.length > 0 ? riskFlags : ['No immediate major resistance ahead'],
      reason: 'Confluence of bullish trend, support bounce, and momentum.',
      timestamp,
    };
  }

  if (bearishScore >= config.minSetupScore && bearishScore > bullishScore && trendDirection !== 'Bullish') {
    return {
      asset,
      timeframe: '1 MINUTE',
      dataSource,
      signal: 'PUT',
      setupScore: finalScore,
      trend: trendDirection,
      momentum: momentumState,
      volatility: 'Normal',
      currentPrice,
      support: levels.support,
      resistance: levels.resistance,
      entry: 'After confirmation candle closes bearish',
      expiryGuidance: '1–2 minutes',
      confirmations,
      riskFlags: riskFlags.length > 0 ? riskFlags : ['No immediate major support below'],
      reason: 'Confluence of bearish trend, resistance rejection, and momentum.',
      timestamp,
    };
  }

  return {
    asset,
    timeframe: '1 MINUTE',
    dataSource,
    signal: 'NO_TRADE',
    setupScore: finalScore,
    trend: trendDirection,
    momentum: momentumState,
    volatility: 'Normal',
    currentPrice,
    support: levels.support,
    resistance: levels.resistance,
    entry: 'Do NOT Enter',
    expiryGuidance: 'Wait for confirmation',
    confirmations,
    riskFlags: riskFlags.length > 0 ? riskFlags : ['Conditions mixed / sub-threshold'],
    reason: `Setup score (${finalScore}/100) below execution threshold (${config.minSetupScore}/100).`,
    waitFor: 'Clean breakout and retest confirmation.',
    timestamp,
  };
}
