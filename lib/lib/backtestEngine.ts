import { Candle, BacktestResult, SignalEngineConfig } from './types';
import { analyzeMarket } from './signalEngine';

export function runBacktest(candles: Candle[], config: SignalEngineConfig, expiryMinutes: number = 1): BacktestResult {
  let callSignals = 0;
  let putSignals = 0;
  let noTradeCount = 0;
  let wins = 0;
  let losses = 0;
  let currentStreak = 0;
  let maxLosingStreak = 0;
  let totalScore = 0;

  for (let i = 50; i < candles.length - expiryMinutes; i++) {
    const historicalSlice = candles.slice(0, i + 1);
    const analysis = analyzeMarket(historicalSlice, [], 'TEST', 'DEMO_DATA', config);

    if (analysis.signal === 'NO_TRADE') {
      noTradeCount++;
      continue;
    }

    totalScore += analysis.setupScore;
    const entryPrice = candles[i].close;
    const outcomePrice = candles[i + expiryMinutes].close;

    if (analysis.signal === 'CALL') {
      callSignals++;
      if (outcomePrice > entryPrice) {
        wins++;
        currentStreak = 0;
      } else {
        losses++;
        currentStreak++;
        if (currentStreak > maxLosingStreak) maxLosingStreak = currentStreak;
      }
    } else if (analysis.signal === 'PUT') {
      putSignals++;
      if (outcomePrice < entryPrice) {
        wins++;
        currentStreak = 0;
      } else {
        losses++;
        currentStreak++;
        if (currentStreak > maxLosingStreak) maxLosingStreak = currentStreak;
      }
    }
  }

  const executed = wins + losses;
  return {
    totalSignals: executed + noTradeCount,
    callSignals,
    putSignals,
    noTradeCount,
    wins,
    losses,
    winRate: executed > 0 ? Number(((wins / executed) * 100).toFixed(1)) : 0,
    maxLosingStreak,
    averageSetupScore: executed > 0 ? Math.round(totalScore / executed) : 0,
  };
}
