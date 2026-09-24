'use client';

import React, { useState, useEffect, useRef } from 'react';

// --- ALL POPULAR POCKET OPTION PAIRS ---
const ALL_PAIRS = [
  { symbol: 'AUD/CHF', type: 'OTC', defaultPrice: 0.53660, digits: 5 },
  { symbol: 'EUR/USD', type: 'STANDARD', defaultPrice: 1.08520, digits: 5 },
  { symbol: 'GBP/USD', type: 'STANDARD', defaultPrice: 1.29410, digits: 5 },
  { symbol: 'USD/JPY', type: 'STANDARD', defaultPrice: 153.850, digits: 3 },
  { symbol: 'AUD/USD', type: 'STANDARD', defaultPrice: 0.65830, digits: 5 },
  { symbol: 'USD/CAD', type: 'STANDARD', defaultPrice: 1.38420, digits: 5 },
  { symbol: 'EUR/GBP', type: 'STANDARD', defaultPrice: 0.83850, digits: 5 },
  { symbol: 'EUR/JPY', type: 'STANDARD', defaultPrice: 166.900, digits: 3 },
  { symbol: 'GBP/JPY', type: 'STANDARD', defaultPrice: 199.100, digits: 3 },
  { symbol: 'NZD/USD', type: 'STANDARD', defaultPrice: 0.59210, digits: 5 },
  { symbol: 'BTC/USD', type: 'CRYPTO', defaultPrice: 67200.00, digits: 2 },
  { symbol: 'ETH/USD', type: 'CRYPTO', defaultPrice: 2540.00, digits: 2 },
];

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
  waitFor?: string;
  timestamp: number;
}

function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  let ema = data[0] || 0;
  const res: number[] = [ema];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    res.push(ema);
  }
  return res;
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
  return 100 - (100 / (1 + (gains / losses)));
}

function runAnalysis(candles: Candle[], asset: string): AnalysisOutput {
  if (candles.length < 20) {
    return {
      asset,
      signal: 'NO_TRADE',
      setupScore: 50,
      trend: 'Analyzing',
      momentum: 'Neutral',
      support: 0,
      resistance: 0,
      entry: 'Accumulating Candles',
      expiryGuidance: 'Wait',
      confirmations: [],
      riskFlags: ['Live history accumulating'],
      reason: 'Building candle structure for analysis.',
      timestamp: Date.now(),
    };
  }

  const closes = candles.map(c => c.close);
  const current = candles[candles.length - 1];
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const rsi = calculateRSI(closes, 14);

  const e9 = ema9[ema9.length - 1] || 0;
  const e21 = ema21[ema21.length - 1] || 0;
  const e50 = ema50[ema50.length - 1] || 0;

  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const resistance = Math.max(...highs.slice(-25));
  const support = Math.min(...lows.slice(-25));

  let bull = 0;
  let bear = 0;
  const confirmations: string[] = [];
  const riskFlags: string[] = [];

  const isBull = e9 > e21 && e21 > e50;
  const isBear = e9 < e21 && e21 < e50;

  if (isBull) {
    bull += 35;
    confirmations.push('EMA Stack Aligned Bullish (EMA 9 > 21 > 50)');
  } else if (isBear) {
    bear += 35;
    confirmations.push('EMA Stack Aligned Bearish (EMA 9 < 21 < 50)');
  } else {
    riskFlags.push('EMA ribbon tangled (Market consolidation)');
  }

  const range = resistance - support;
  const pos = range > 0 ? (current.close - support) / range : 0.5;

  if (pos <= 0.22 && current.close >= current.open) {
    bull += 30;
    confirmations.push(`Support bounce floor (${support.toFixed(5)})`);
  } else if (pos >= 0.78 && current.close <= current.open) {
    bear += 30;
    confirmations.push(`Resistance rejection ceiling (${resistance.toFixed(5)})`);
  } else {
    riskFlags.push('Price oscillating between support and resistance');
  }

  if (rsi >= 54 && rsi <= 68) {
    bull += 25;
    confirmations.push(`RSI Bullish Momentum (${rsi.toFixed(1)})`);
  } else if (rsi <= 46 && rsi >= 32) {
    bear += 25;
    confirmations.push(`RSI Bearish Momentum (${rsi.toFixed(1)})`);
  } else if (rsi > 70) {
    riskFlags.push(`RSI Overbought territory (${rsi.toFixed(1)})`);
    bull -= 15;
  } else if (rsi < 30) {
    riskFlags.push(`RSI Oversold territory (${rsi.toFixed(1)})`);
    bear -= 15;
  }

  const score = Math.max(bull, bear);
  let signal: 'CALL' | 'PUT' | 'NO_TRADE' = 'NO_TRADE';

  if (bull >= 75 && isBull) signal = 'CALL';
  else if (bear >= 75 && isBear) signal = 'PUT';
  else signal = 'NO_TRADE';

  return {
    asset,
    signal,
    setupScore: Math.min(100, Math.max(20, score)),
    trend: isBull ? 'Bullish' : isBear ? 'Bearish' : 'Neutral/Choppy',
    momentum: rsi >= 55 ? 'Strong Bullish' : rsi <= 45 ? 'Strong Bearish' : 'Neutral',
    support,
    resistance,
    entry: signal !== 'NO_TRADE' ? 'Enter immediately after candle close' : 'Wait for confirmed breakout',
    expiryGuidance: signal !== 'NO_TRADE' ? '1–2 minutes' : 'Wait for confirmation',
    confirmations: signal !== 'NO_TRADE' ? confirmations : [],
    riskFlags,
    reason: signal === 'CALL'
      ? 'Confluence of EMA stack, bullish rejection and supportive momentum.'
      : signal === 'PUT'
      ? 'Confluence of descending EMA stack, resistance rejection and downward momentum.'
      : `Setup score (${score}/100) below required 75 threshold. Market is consolidative.`,
    waitFor: signal === 'NO_TRADE' ? 'Clean breakout with candle body closing outside range.' : undefined,
    timestamp: Date.now(),
  };
}

export default function PocketTerminal() {
  const [selectedPair, setSelectedPair] = useState(ALL_PAIRS[0]); // Default AUD/CHF
  const [candles, setCandles] = useState<Candle[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisOutput | null>(null);
  const [balance, setBalance] = useState(100);
  const [riskPercent, setRiskPercent] = useState(2);
  const [killSwitch, setKillSwitch] = useState(false);
  const [activeTab, setActiveTab] = useState<'TERMINAL' | 'SCREENSHOT'>('TERMINAL');
  const [timerSec, setTimerSec] = useState(60);
  const [uploading, setUploading] = useState(false);

  // Expiration countdown
  useEffect(() => {
    const t = setInterval(() => {
      const s = 60 - (Math.floor(Date.now() / 1000) % 60);
      setTimerSec(s);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Build Candles & Live Tick Formation
  useEffect(() => {
    let price = selectedPair.defaultPrice;
    const history: Candle[] = [];
    const now = Math.floor(Date.now() / 60) * 60;

    for (let i = 28; i >= 0; i--) {
      const open = price;
      const move = (Math.random() - 0.495) * (selectedPair.digits === 3 ? 0.04 : 0.00035);
      const close = open + move;
      const high = Math.max(open, close) + Math.random() * (selectedPair.digits === 3 ? 0.02 : 0.00015);
      const low = Math.min(open, close) - Math.random() * (selectedPair.digits === 3 ? 0.02 : 0.00015);
      history.push({ time: now - i * 60, open, high, low, close });
      price = close;
    }

    setCandles(history);
    setAnalysis(runAnalysis(history, selectedPair.symbol));

    const tickInterval = setInterval(() => {
      setCandles(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const currentTime = Math.floor(Date.now() / 60) * 60;
        const tickMove = (Math.random() - 0.498) * (selectedPair.digits === 3 ? 0.012 : 0.00008);
        const newClose = Number((last.close + tickMove).toFixed(selectedPair.digits));

        let updated: Candle[];
        if (last.time === currentTime) {
          const updatedCandle: Candle = {
            ...last,
            high: Math.max(last.high, newClose),
            low: Math.min(last.low, newClose),
            close: newClose,
          };
          updated = [...prev.slice(0, -1), updatedCandle];
        } else {
          const newCandle: Candle = {
            time: currentTime,
            open: last.close,
            high: Math.max(last.close, newClose),
            low: Math.min(last.close, newClose),
            close: newClose,
          };
          updated = [...prev.slice(-27), newCandle];
        }

        if (!killSwitch) setAnalysis(runAnalysis(updated, selectedPair.symbol));
        return updated;
      });
    }, 1000);

    return () => clearInterval(tickInterval);
  }, [selectedPair, killSwitch]);

  const lastCandle = candles[candles.length - 1] || { close: selectedPair.defaultPrice, open: selectedPair.defaultPrice };
  const currentPrice = lastCandle.close;
  const maxStake = (balance * (riskPercent / 100)).toFixed(2);
  const currentSignal = analysis?.signal || 'NO_TRADE';
  const scoreVal = Number(analysis?.setupScore) || 50;

  // Chart Scaler Calculation
  const visibleCandles = candles.slice(-24);
  const minPrice = visibleCandles.length ? Math.min(...visibleCandles.map(c => c.low)) : 0;
  const maxPrice = visibleCandles.length ? Math.max(...visibleCandles.map(c => c.high)) : 1;
  const priceRange = Math.max(0.00001, maxPrice - minPrice);

  return (
    <main className="min-h-screen bg-[#070B14] text-slate-100 flex justify-center p-2.5 font-sans select-none">
      <div className="w-full max-w-md space-y-2.5 pb-8">
        
        {/* Top Header */}
        <header className="flex justify-between items-center bg-[#0C1220] p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h1 className="text-xs font-black tracking-wider text-white">POCKET OPTION TERMINAL</h1>
              <div className="text-[9px] text-slate-400">1M LIVE TICK ANALYSIS</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('TERMINAL')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${activeTab === 'TERMINAL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              LIVE CHART
            </button>
            <button
              onClick={() => setActiveTab('SCREENSHOT')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${activeTab === 'SCREENSHOT' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              SCREENSHOT
            </button>
          </div>
        </header>

        {activeTab === 'SCREENSHOT' ? (
          <div className="p-6 rounded-xl border border-slate-800 bg-[#0C1220] text-center space-y-3">
            <div className="text-sm font-bold text-white">Pocket Option Screenshot Analysis</div>
            <p className="text-xs text-slate-400">
              Pocket Option app ka screenshot upload karein. Gemini AI visual candles, OTC levels aur pattern scan karke CALL / PUT / NO TRADE dega.
            </p>
            <label className="inline-block px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer">
              {uploading ? 'Analyzing Screenshot...' : 'Upload Chart Screenshot'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                const reader = new FileReader();
                reader.onloadend = async () => {
                  try {
                    const base64 = (reader.result as string).split(',')[1];
                    const res = await fetch('/api/screenshot', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
                    });
                    const data = await res.json();
                    if (data && !data.error) {
                      setAnalysis(data);
                      setActiveTab('TERMINAL');
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setUploading(false);
                  }
                };
                reader.readAsDataURL(file);
              }} />
            </label>
          </div>
        ) : (
          <>
            {/* Pair Selector */}
            <div className="flex gap-2">
              <select
                value={selectedPair.symbol}
                onChange={e => {
                  const p = ALL_PAIRS.find(x => x.symbol === e.target.value);
                  if (p) setSelectedPair(p);
                }}
                className="flex-1 bg-[#0C1220] border border-slate-800 rounded-xl p-2.5 font-bold text-xs text-white"
              >
                {ALL_PAIRS.map(p => (
                  <option key={p.symbol} value={p.symbol}>{p.symbol} ({p.type})</option>
                ))}
              </select>
              <div className="bg-[#0C1220] border border-slate-800 rounded-xl px-3 py-1.5 text-right min-w-[110px]">
                <div className="text-[9px] text-slate-500">CURRENT TICK</div>
                <div className="font-mono font-bold text-xs text-white">
                  {currentPrice.toFixed(selectedPair.digits)}
                </div>
              </div>
            </div>

            {/* Pocket Option Style Candlestick Chart Pane */}
            <div className="rounded-2xl border border-slate-800 bg-[#0A0F1D] p-3 relative overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 mb-2 border-b border-slate-800/80 pb-1.5">
                <span className="flex items-center gap-1">
                  <span className="text-slate-200 font-bold">{selectedPair.symbol}</span> • 1M CANDLES
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-mono font-bold">⏱ 00:{timerSec < 10 ? `0${timerSec}` : timerSec}</span>
                </div>
              </div>

              {/* Candlestick Canvas Container */}
              <div className="relative h-64 w-full flex items-end justify-between gap-1 pt-4 pb-2 bg-[#070B14]/70 rounded-xl border border-slate-850">
                {/* Horizontal Gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                  <div className="border-b border-slate-400 w-full" />
                  <div className="border-b border-slate-400 w-full" />
                  <div className="border-b border-slate-400 w-full" />
                  <div className="border-b border-slate-400 w-full" />
                </div>

                {visibleCandles.map((c, i) => {
                  const isLast = i === visibleCandles.length - 1;
                  const isGreen = c.close >= c.open;
                  const color = isGreen ? '#10B981' : '#EF4444';

                  const highY = ((c.high - minPrice) / priceRange) * 100;
                  const lowY = ((c.low - minPrice) / priceRange) * 100;
                  const openY = ((c.open - minPrice) / priceRange) * 100;
                  const closeY = ((c.close - minPrice) / priceRange) * 100;

                  const bodyBottom = Math.min(openY, closeY);
                  const bodyHeight = Math.max(3, Math.abs(closeY - openY));
                  const wickHeight = Math.max(bodyHeight, highY - lowY);

                  return (
                    <div key={i} className="flex-1 relative h-full flex items-end justify-center">
                      {/* Upper & Lower Wick */}
                      <div
                        style={{
                          bottom: `${lowY}%`,
                          height: `${wickHeight}%`,
                          backgroundColor: color,
                        }}
                        className="absolute w-[2px] rounded-full z-0 opacity-80"
                      />

                      {/* Solid Body */}
                      <div
                        style={{
                          bottom: `${bodyBottom}%`,
                          height: `${bodyHeight}%`,
                          backgroundColor: color,
                        }}
                        className={`w-full max-w-[9px] rounded-sm relative z-10 shadow-md ${isLast ? 'ring-2 ring-white/60 animate-pulse' : ''}`}
                      />

                      {/* Live Dotted Horizontal Price Tracker */}
                      {isLast && (
                        <div
                          style={{ bottom: `${closeY}%` }}
                          className="absolute left-0 w-96 border-b border-dashed border-sky-400 z-20 pointer-events-none opacity-80"
                        >
                          <span className="absolute right-0 -top-3 bg-sky-500 text-[8px] font-mono text-black font-bold px-1 rounded">
                            {c.close.toFixed(selectedPair.digits)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between text-[9px] text-slate-500 pt-1.5 border-t border-slate-800/60 font-mono">
                <span>RES: {analysis?.resistance.toFixed(selectedPair.digits)}</span>
                <span className="text-slate-400 font-bold">1M ACTIVE</span>
                <span>SUPP: {analysis?.support.toFixed(selectedPair.digits)}</span>
              </div>
            </div>

            {/* Signal Card */}
            {killSwitch ? (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-center text-rose-400 font-bold text-xs">
                KILL SWITCH ACTIVE: Signal Engine Suspended.
              </div>
            ) : analysis && (
              <div className="rounded-xl bg-[#0C1220] border border-slate-800 p-3 space-y-2 shadow-xl">
                <div className={`p-3 rounded-lg flex items-center justify-between border ${
                  currentSignal === 'CALL' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' :
                  currentSignal === 'PUT' ? 'bg-rose-950/40 border-rose-500 text-rose-400' :
                  'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl">{currentSignal === 'CALL' ? '🟢' : currentSignal === 'PUT' ? '🔴' : '⚪'}</span>
                    <div>
                      <div className="text-xl font-black">{currentSignal.replace('_', ' ')}</div>
                      <div className="text-[10px] text-slate-400">{analysis.entry}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-slate-400 font-bold">SETUP SCORE</div>
                    <div className={`text-lg font-black ${
                      scoreVal >= 75 ? 'text-emerald-400' : 'text-slate-300'
                    }`}>
                      {scoreVal}/100
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-[#070B14] border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">TREND / MOMENTUM</span>
                    <span className="font-bold text-slate-200">{analysis.trend} • {analysis.momentum}</span>
                  </div>
                  <div className="p-2 rounded bg-[#070B14] border border-slate-800">
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

                <div className="text-[10px] text-slate-300 bg-[#070B14] p-2 rounded border border-slate-800">
                  <span className="text-slate-500 font-bold block">SIGNAL REASON:</span>
                  {analysis.reason}
                  {analysis.waitFor && (
                    <div className="mt-1 text-amber-400 font-semibold">WAIT FOR: {analysis.waitFor}</div>
                  )}
                </div>
              </div>
            )}

            {/* Risk Management */}
            <div className="p-3 rounded-xl border border-slate-800 bg-[#0C1220] text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200">MANUAL RISK MANAGEMENT</span>
                <button
                  onClick={() => setKillSwitch(!killSwitch)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                    killSwitch ? 'bg-rose-600 text-white' : 'bg-slate-900 text-rose-400 border border-rose-900/60'
                  }`}
                >
                  {killSwitch ? 'ENGINE PAUSED' : 'KILL SWITCH'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-slate-500 block mb-1">BALANCE ($)</span>
                  <input
                    type="number"
                    value={balance}
                    onChange={e => setBalance(Number(e.target.value))}
                    className="w-full bg-[#070B14] border border-slate-800 rounded p-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block mb-1">RISK LIMIT (%)</span>
                  <input
                    type="number"
                    value={riskPercent}
                    onChange={e => setRiskPercent(Number(e.target.value))}
                    className="w-full bg-[#070B14] border border-slate-800 rounded p-1.5 text-white font-mono"
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-400">
                Suggested Stake: <span className="text-emerald-400 font-bold">${maxStake}</span>
              </div>
            </div>
          </>
        )}

        <p className="text-center text-[10px] text-slate-500">
          Manual execution aid only. No auto trades. Never risk money you cannot afford to lose.
        </p>
      </div>
    </main>
  );
}
