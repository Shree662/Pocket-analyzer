'use client';

import React, { useState, useEffect } from 'react';
import { Candle, AnalysisOutput } from '../lib/types';
import { MockMarketAdapter } from '../lib/adapters/MockMarketAdapter';
import { analyzeMarket } from '../lib/signalEngine';
import { calculateSupportResistance } from '../lib/supportResistance';
import CandlestickChart from '../components/CandlestickChart';
import SignalCard from '../components/SignalCard';
import ScreenshotUploader from '../components/ScreenshotUploader';
import RiskCalculator from '../components/RiskCalculator';
import BacktestPanel from '../components/BacktestPanel';
import SignalHistoryTable from '../components/SignalHistoryTable';

const ASSETS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'];

export default function Home() {
  const [asset, setAsset] = useState('EUR/USD');
  const [tab, setTab] = useState<'TERMINAL' | 'SCREENSHOT' | 'BACKTEST'>('TERMINAL');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisOutput | null>(null);
  const [history, setHistory] = useState<AnalysisOutput[]>([]);
  const [killSwitch, setKillSwitch] = useState(false);

  const adapter = new MockMarketAdapter();

  const refreshData = async () => {
    try {
      const data = await adapter.getCandles(asset, '1M', 75);
      setCandles(data);

      if (!killSwitch) {
        const out = analyzeMarket(data, [], asset, adapter.getDataSourceType());
        setAnalysis(out);
        setHistory(prev => [out, ...prev.slice(0, 20)]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshData();
    const timer = setInterval(refreshData, 5000);
    return () => clearInterval(timer);
  }, [asset, killSwitch]);

  const levels = candles.length > 0 ? calculateSupportResistance(candles) : null;

  return (
    <main className="min-h-screen bg-[#06090F] text-slate-100 flex justify-center p-2 sm:p-4">
      <div className="w-full max-w-md space-y-3 pb-8">
        <header className="flex justify-between items-center border-b border-slate-800 pb-2">
          <h1 className="text-sm font-black text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AI MARKET ANALYZER
          </h1>
          <div className="flex bg-slate-900 border border-slate-800 rounded p-0.5 text-[10px]">
            {(['TERMINAL', 'SCREENSHOT', 'BACKTEST'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-2 py-0.5 rounded font-bold ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </header>

        <div className="flex gap-2">
          <select
            value={asset}
            onChange={e => setAsset(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 font-bold text-xs text-white"
          >
            {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {tab === 'TERMINAL' && (
          <>
            {analysis && <SignalCard data={analysis} killSwitchActive={killSwitch} />}
            <CandlestickChart
              candles={candles}
              levels={levels}
              indicatorsEnabled={{ ema9: true, ema21: true, ema50: true, levels: true }}
            />
            <RiskCalculator killSwitch={killSwitch} onToggleKillSwitch={() => setKillSwitch(!killSwitch)} />
            <SignalHistoryTable history={history} />
          </>
        )}

        {tab === 'SCREENSHOT' && (
          <ScreenshotUploader
            onAnalysisComplete={res => {
              setAnalysis(res);
              setTab('TERMINAL');
            }}
          />
        )}

        {tab === 'BACKTEST' && <BacktestPanel candles={candles} />}

        <p className="text-center text-[10px] text-slate-600 pt-2">
          Manual execution assistant only. No auto-trades. Always manage risk.
        </p>
      </div>
    </main>
  );
}
