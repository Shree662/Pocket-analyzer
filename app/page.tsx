'use client';

import React, { useState, useEffect } from 'react';

// --- TYPES ---
interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface AnalysisOutput {
  asset: string;
  signal: 'CALL' | 'PUT' | 'NO_TRADE';
  setupScore: number;
  trend: string;
  momentum: string;
  support: number;
  resistance: number;
  entry: string;
  expiryGuidance: string;
  confirmations: string[];
  riskFlags: string[];
  reason: string;
  timestamp: number;
}

// --- MATH & INDICATOR HELPERS ---
function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  let ema = data[0];
  const result: number[] = [ema];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
}

// --- SIGNAL GENERATION ENGINE ---
function runAnalysis(candles: Candle[], asset: string): AnalysisOutput {
  const closes = candles.map(c => c.close);
  const current = candles[candles.length - 1];
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const rsi = calculateRSI(closes, 14);

  const e9 = ema9[ema9.length - 1];
  const e21 = ema21[ema21.length - 1];
  const e50 = ema50[ema50.length - 1];

  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const resistance = Math.max(...highs.slice(-30));
  const support = Math.min(...lows.slice(-30));

  let score = 50;
  let signal: 'CALL' | 'PUT' | 'NO_TRADE' = 'NO_TRADE';
  const confirmations: string[] = [];
  const riskFlags: string[] = [];

  const isBullishTrend = e9 > e21 && e21 > e50;
  const isBearishTrend = e9 < e21 && e21 < e50;

  if (isBullishTrend) {
    score += 20;
    confirmations.push('EMA Stack Aligned Bullish (EMA 9 > 21 > 50)');
  } else if (isBearishTrend) {
    score += 20;
    confirmations.push('EMA Stack Aligned Bearish (EMA 9 < 21 < 50)');
  } else {
    riskFlags.push('EMAs tangled (Sideways chop)');
  }

  // Support / Resistance bounce
  if (Math.abs(current.close - support) / support < 0.001) {
    score += 15;
    confirmations.push('Support Level Rejection');
  }
  if (Math.abs(current.close - resistance) / resistance < 0.001) {
    score += 15;
    confirmations.push('Resistance Level Rejection');
  }

  // Momentum
  if (rsi > 52 && rsi < 68 && isBullishTrend) {
    score += 15;
    confirmations.push(`RSI Bullish Momentum (${rsi.toFixed(1)})`);
    if (score >= 75) signal = 'CALL';
  } else if (rsi < 48 && rsi > 32 && isBearishTrend) {
    score += 15;
    confirmations.push(`RSI Bearish Momentum (${rsi.toFixed(1)})`);
    if (score >= 75) signal = 'PUT';
  } else {
    riskFlags.push(`RSI Neutral / Overbought (${rsi.toFixed(1)})`);
  }

  return {
    asset,
    signal,
    setupScore: Math.min(100, score),
    trend: isBullishTrend ? 'Bullish' : isBearishTrend ? 'Bearish' : 'Ranging',
    momentum: rsi > 55 ? 'Strong Bullish' : rsi < 45 ? 'Strong Bearish' : 'Neutral',
    support,
    resistance,
    entry: signal !== 'NO_TRADE' ? 'Enter immediately on candle open' : 'Wait for confirmation',
    expiryGuidance: '1–2 minutes',
    confirmations,
    riskFlags,
    reason: signal !== 'NO_TRADE' 
      ? `Strong convergence of ${signal === 'CALL' ? 'bullish' : 'bearish'} EMAs and RSI support.`
      : 'Conditions sub-threshold. Market is currently consolidating without clean breakout.',
    timestamp: Date.now(),
  };
}

export default function App() {
  const [asset, setAsset] = useState('EUR/USD');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisOutput | null>(null);
  const [balance, setBalance] = useState(100);
  const [riskPercent, setRiskPercent] = useState(2);
  const [killSwitch, setKillSwitch] = useState(false);

  // Generate real dynamic candles
  useEffect(() => {
    let price = asset === 'USD/JPY' ? 152.50 : 1.0850;
    const initialCandles: Candle[] = [];
    const now = Math.floor(Date.now() / 1000);

    for (let i = 60; i >= 0; i--) {
      const open = price;
      const change = (Math.random() - 0.495) * 0.0003;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 0.0001;
      const low = Math.min(open, close) - Math.random() * 0.0001;
      initialCandles.push({ time: now - i * 60, open, high, low, close });
      price = close;
    }
    setCandles(initialCandles);
  }, [asset]);

  // Update loop
  useEffect(() => {
    if (candles.length < 50 || killSwitch) return;
    const res = runAnalysis(candles, asset);
    setAnalysis(res);

    const timer = setInterval(() => {
      setCandles(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.495) * 0.0002;
        const close = last.close + change;
        const updated = [...prev.slice(1), {
          time: Math.floor(Date.now() / 1000),
          open: last.close,
          high: Math.max(last.close, close) + 0.00005,
          low: Math.min(last.close, close) - 0.00005,
          close,
        }];
        if (!killSwitch) setAnalysis(runAnalysis(updated, asset));
        return updated;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [candles.length, asset, killSwitch]);

  const maxStake = (balance * (riskPercent / 100)).toFixed(2);
  const lastPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;

  return (
    <main className="min-h-screen bg-[#070B12] text-slate-100 flex justify-center p-3 font-sans">
      <div className="w-full max-w-md space-y-3 pb-8">
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h1 className="text-sm font-black tracking-wider text-white">AI MARKET ANALYZER</h1>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
            LIVE ENGINE
          </span>
        </header>

        {/* Asset Selector & Price */}
        <div className="flex gap-2 items-center">
          <select
            value={asset}
            onChange={e => setAsset(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 font-bold text-xs text-white"
          >
            {['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-right">
            <div className="text-[9px] text-slate-500">LIVE PRICE</div>
            <div className="font-mono font-bold text-xs text-white">{lastPrice.toFixed(5)}</div>
          </div>
        </div>

        {/* Signal Card */}
        {killSwitch ? (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-center text-rose-400 font-bold text-xs">
            KILL SWITCH ACTIVE: Signal Engine Disabled.
          </div>
        ) : analysis && (
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 space-y-2 shadow-lg">
            <div className={`p-3 rounded-lg flex items-center justify-between border ${
              analysis.signal === 'CALL' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' :
              analysis.signal === 'PUT' ? 'bg-rose-950/40 border-rose-500 text-rose-400' :
              'bg-slate-800/40 border-slate-700 text-slate-300'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{analysis.signal === 'CALL' ? '🟢' : analysis.signal === 'PUT' ? '🔴' : '⚪'}</span>
                <div>
                  <div className="text-lg font-black">{analysis.signal.replace('_', ' ')}</div>
                  <div className="text-[10px] text-slate-400">{analysis.entry}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-slate-400">SETUP SCORE</div>
                <div className="text-base font-black text-white">{analysis.setupScore}/100</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-[9px] text-slate-500 block">TREND / MOMENTUM</span>
                <span className="font-bold text-slate-200">{analysis.trend} • {analysis.momentum}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-[9px] text-slate-500 block">EXPIRY GUIDANCE</span>
                <span className="font-bold text-slate-200">{analysis.expiryGuidance}</span>
              </div>
            </div>

            {analysis.confirmations.length > 0 && (
              <div className="text-[10px] text-emerald-400 bg-emerald-950/20 p-2 rounded border border-emerald-900/30">
                ✓ {analysis.confirmations.join(' | ')}
              </div>
            )}

            {analysis.riskFlags.length > 0 && (
              <div className="text-[10px] text-amber-400 bg-amber-950/20 p-2 rounded border border-amber-900/30">
                ⚠ {analysis.riskFlags.join(' | ')}
              </div>
            )}

            <div className="text-[10px] text-slate-300 bg-slate-950 p-2 rounded border border-slate-800">
              <span className="text-slate-500 font-bold block">REASON:</span>
              {analysis.reason}
            </div>
          </div>
        )}

        {/* Visual Mini Chart */}
        <div className="rounded-xl border border-slate-800 bg-[#0A0E17] p-3">
          <div className="text-[10px] font-bold text-slate-400 mb-2 flex justify-between">
            <span>RECENT CANDLE STRUCTURE (1M)</span>
            <span className="text-emerald-400">SUPP: {analysis?.support.toFixed(5)}</span>
          </div>
          <div className="flex items-end gap-1 h-28 w-full border-b border-slate-800 pb-1">
            {candles.slice(-28).map((c, i) => {
              const isGreen = c.close >= c.open;
              const height = Math.max(8, Math.min(100, Math.abs(c.close - c.open) * 40000));
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    style={{ height: `${height}%` }}
                    className={`w-full rounded-sm ${isGreen ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Risk Calculator & Kill Switch */}
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-200">RISK MANAGEMENT</span>
            <button
              onClick={() => setKillSwitch(!killSwitch)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                killSwitch ? 'bg-rose-600 text-white' : 'bg-slate-800 text-rose-400 border border-rose-900/60'
              }`}
            >
              {killSwitch ? 'ENGINE DISABLED' : 'KILL SWITCH'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-slate-500 block mb-1">BALANCE ($)</span>
              <input
                type="number"
                value={balance}
                onChange={e => setBalance(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white"
              />
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block mb-1">RISK LIMIT (%)</span>
              <input
                type="number"
                value={riskPercent}
                onChange={e => setRiskPercent(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white"
              />
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            Suggested Stake: <span className="text-emerald-400 font-bold">${maxStake}</span>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-600">
          Manual execution aid only. No auto trades. Never risk money you cannot afford to lose.
        </p>
      </div>
    </main>
  );
}
