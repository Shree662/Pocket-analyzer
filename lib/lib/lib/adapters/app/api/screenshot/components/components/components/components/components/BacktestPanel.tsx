'use client';

import React, { useState } from 'react';
import { Candle, BacktestResult } from '../lib/types';
import { runBacktest } from '../lib/backtestEngine';

export default function BacktestPanel({ candles }: { candles: Candle[] }) {
  const [result, setResult] = useState<BacktestResult | null>(null);

  const run = () => {
    const res = runBacktest(candles, {
      minSetupScore: 70,
      highQualityScore: 80,
      cooldownPeriodCandles: 2,
      maxCandleRangeMultiplier: 2.8,
      weights: { trend: 20, priceAction: 20, supportResistance: 20, momentum: 15, emaStructure: 10, volatility: 10, htfConfirmation: 5 }
    });
    setResult(res);
  };

  return (
    <div className="p-3 rounded-xl border border-slate-800 bg-slate-900 text-xs space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-bold text-slate-200">HISTORICAL BACKTEST (1M)</span>
        <button onClick={run} className="px-3 py-1 bg-blue-600 rounded text-white font-bold">Simulate</button>
      </div>
      {result && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
          <div className="p-1.5 bg-slate-950 rounded">
            <span className="text-[9px] text-slate-500 block">WIN RATE</span>
            <span className="text-emerald-400 font-bold">{result.winRate}%</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded">
            <span className="text-[9px] text-slate-500 block">WINS / LOSSES</span>
            <span className="text-white font-bold">{result.wins} / {result.losses}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded">
            <span className="text-[9px] text-slate-500 block">NO TRADES</span>
            <span className="text-amber-400 font-bold">{result.noTradeCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}
