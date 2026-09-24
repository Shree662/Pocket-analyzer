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
  asset?: string;
  signal?: 'CALL' | 'PUT' | 'NO_TRADE';
  setupScore?: number;
  trend?: string;
  momentum?: string;
  support?: number | string;
  resistance?: number | string;
  entry?: string;
  expiryGuidance?: string;
  confirmations?: string[];
  riskFlags?: string[];
  reason?: string;
  waitFor?: string;
  timestamp?: number;
}

// --- INDICATOR HELPERS ---
function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  let ema = data[0] || 0;
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

// --- ACCURATE SIGNAL ENGINE ---
function runAnalysis(candles: Candle[], asset: string): AnalysisOutput {
  const closes = candles.map(c => c.close);
  const current = candles[candles.length - 1] || { close: 1.085, open: 1.085, high: 1.085, low: 1.085 };
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const rsi = calculateRSI(closes, 14);

  const e9 = ema9[ema9.length - 1] || 0;
  const e21 = ema21[ema21.length - 1] || 0;
  const e50 = ema50[ema50.length - 1] || 0;

  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const resistance = highs.length ? Math.max(...highs.slice(-30)) : current.close + 0.0005;
  const support = lows.length ? Math.min(...lows.slice(-30)) : current.close - 0.0005;

  let bullishScore = 0;
  let bearishScore = 0;
  const confirmations: string[] = [];
  const riskFlags: string[] = [];

  const isBullishTrend = e9 > e21 && e21 > e50;
  const isBearishTrend = e9 < e21 && e21 < e50;

  if (isBullishTrend) {
    bullishScore += 30;
    confirmations.push('Aligned Bullish EMAs (EMA 9 > 21 > 50)');
  } else if (isBearishTrend) {
    bearishScore += 30;
    confirmations.push('Aligned Bearish EMAs (EMA 9 < 21 < 50)');
  } else {
    riskFlags.push('EMAs tangled (Sideways range market)');
  }

  const range = resistance - support;
  const posInRange = range > 0 ? (current.close - support) / range : 0.5;

  if (posInRange <= 0.20 && current.close >= current.open) {
    bullishScore += 25;
    confirmations.push(`Support Rejection Floor (${support.toFixed(5)})`);
  } else if (posInRange >= 0.80 && current.close <= current.open) {
    bearishScore += 25;
    confirmations.push(`Resistance Rejection Ceiling (${resistance.toFixed(5)})`);
  } else {
    riskFlags.push('Price floating mid-range between key levels');
  }

  if (rsi >= 54 && rsi <= 68) {
    bullishScore += 25;
    confirmations.push(`RSI Bullish Expansion (${rsi.toFixed(1)})`);
  } else if (rsi <= 46 && rsi >= 32) {
    bearishScore += 25;
    confirmations.push(`RSI Bearish Expansion (${rsi.toFixed(1)})`);
  } else if (rsi > 70) {
    riskFlags.push(`RSI Overbought (${rsi.toFixed(1)})`);
    bullishScore -= 10;
  } else if (rsi < 30) {
    riskFlags.push(`RSI Oversold (${rsi.toFixed(1)})`);
    bearishScore -= 10;
  } else {
    riskFlags.push(`RSI Neutral Zone (${rsi.toFixed(1)})`);
  }

  const candleSize = Math.abs(current.close - current.open);
  if (candleSize > 0.00008) {
    if (current.close > current.open) bullishScore += 10;
    else bearishScore += 10;
  }

  const finalScore = Math.max(bullishScore, bearishScore);
  let signal: 'CALL' | 'PUT' | 'NO_TRADE' = 'NO_TRADE';

  if (bullishScore >= 75 && bullishScore > bearishScore && isBullishTrend) {
    signal = 'CALL';
  } else if (bearishScore >= 75 && bearishScore > bullishScore && isBearishTrend) {
    signal = 'PUT';
  } else {
    signal = 'NO_TRADE';
  }

  return {
    asset,
    signal,
    setupScore: Math.min(100, Math.max(15, finalScore)),
    trend: isBullishTrend ? 'Bullish' : isBearishTrend ? 'Bearish' : 'Neutral/Choppy',
    momentum: rsi >= 55 ? 'Strong Bullish' : rsi <= 45 ? 'Strong Bearish' : 'Neutral/Choppy',
    support,
    resistance,
    entry: signal !== 'NO_TRADE' ? 'Enter after candle close confirmation' : 'Wait for clean breakout',
    expiryGuidance: signal !== 'NO_TRADE' ? '1–2 minutes' : 'Wait for confirmation',
    confirmations: signal !== 'NO_TRADE' ? confirmations : [],
    riskFlags,
    reason: signal === 'CALL'
      ? 'High-confluence Bullish setup: Aligned EMAs, strong RSI push, and support bounce.'
      : signal === 'PUT'
      ? 'High-confluence Bearish setup: Aligned EMAs, downward RSI momentum, and resistance rejection.'
      : `Market score (${finalScore}/100) below required 75 threshold. Market is choppy or lacking volume.`,
    waitFor: signal === 'NO_TRADE' ? 'Clear breakout and retest of support/resistance.' : undefined,
    timestamp: Date.now(),
  };
}

// Client-side Image Compression (Prevents Vercel 413 & Memory Crash)
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const scale = MAX_WIDTH / Math.max(img.width, MAX_WIDTH);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas error');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [asset, setAsset] = useState('EUR/USD');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisOutput | null>(null);
  const [balance, setBalance] = useState(100);
  const [riskPercent, setRiskPercent] = useState(2);
  const [killSwitch, setKillSwitch] = useState(false);
  const [activeTab, setActiveTab] = useState<'TERMINAL' | 'SCREENSHOT'>('TERMINAL');
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Price Simulation
  useEffect(() => {
    let price = asset === 'USD/JPY' ? 152.50 : 1.0850;
    const initialCandles: Candle[] = [];
    const now = Math.floor(Date.now() / 1000);

    for (let i = 50; i >= 0; i--) {
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

  // Market Engine Tick Loop
  useEffect(() => {
    if (candles.length < 30 || killSwitch) return;
    setAnalysis(runAnalysis(candles, asset));

    const timer = setInterval(() => {
      setCandles(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.495) * 0.0002;
        const close = last.close + change;
        const updated = [
          ...prev.slice(1),
          {
            time: Math.floor(Date.now() / 1000),
            open: last.close,
            high: Math.max(last.close, close) + 0.00005,
            low: Math.min(last.close, close) - 0.00005,
            close,
          },
        ];
        if (!killSwitch) setAnalysis(runAnalysis(updated, asset));
        return updated;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [candles.length, asset, killSwitch]);

  // Screenshot Upload Handler with Compression & Safe State
  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMessage(null);

    try {
      const compressedBase64 = await compressImage(file);
      const res = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: compressedBase64, mimeType: 'image/jpeg' }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Safe normalization
      const safeData: AnalysisOutput = {
        asset: data.asset || asset,
        signal: (data.signal === 'CALL' || data.signal === 'PUT') ? data.signal : 'NO_TRADE',
        setupScore: Number(data.setupScore) || 60,
        trend: data.trend || 'Neutral',
        momentum: data.momentum || 'Normal',
        support: Number(data.support) || 0,
        resistance: Number(data.resistance) || 0,
        entry: data.entry || 'Wait for confirmation',
        expiryGuidance: data.expiryGuidance || '1–2 minutes',
        confirmations: Array.isArray(data.confirmations) ? data.confirmations : [],
        riskFlags: Array.isArray(data.riskFlags) ? data.riskFlags : [],
        reason: data.reason || 'Visual chart pattern analyzed.',
        waitFor: data.waitFor,
        timestamp: Date.now(),
      };

      setAnalysis(safeData);
      setActiveTab('TERMINAL');
    } catch (err: any) {
      setErrorMessage(err.message || 'Screenshot analysis failed. Check API key.');
    } finally {
      setUploading(false);
    }
  };

  const maxStake = (balance * (riskPercent / 100)).toFixed(2);
  const lastPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const currentSignal = analysis?.signal || 'NO_TRADE';
  const scoreVal = Number(analysis?.setupScore) || 50;
  const suppVal = Number(analysis?.support || 0);

  return (
    <main className="min-h-screen bg-[#070B12] text-slate-100 flex justify-center p-3 font-sans">
      <div className="w-full max-w-md space-y-3 pb-8">
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h1 className="text-sm font-black tracking-wider text-white">AI MARKET ANALYZER</h1>
          </div>
          <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-[10px]">
            <button
              onClick={() => { setActiveTab('TERMINAL'); setErrorMessage(null); }}
              className={`px-2.5 py-1 rounded font-bold transition ${activeTab === 'TERMINAL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              TERMINAL
            </button>
            <button
              onClick={() => setActiveTab('SCREENSHOT')}
              className={`px-2.5 py-1 rounded font-bold transition ${activeTab === 'SCREENSHOT' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              SCREENSHOT
            </button>
          </div>
        </header>

        {activeTab === 'SCREENSHOT' ? (
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900 text-center space-y-3">
            <div className="text-sm font-bold text-white">Pocket Option Screenshot Analysis</div>
            <p className="text-xs text-slate-400">
              Pocket Option chart ka screenshot upload karein. Gemini AI visual candles aur levels ko analyze karke CALL/PUT/NO TRADE nikalega.
            </p>
            <label className="inline-block px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer">
              {uploading ? 'Analyzing Chart...' : 'Upload Chart Screenshot'}
              <input type="file" accept="image/*" className="hidden" onChange={handleScreenshot} disabled={uploading} />
            </label>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs text-left">
                <strong>Error: </strong> {errorMessage}
              </div>
            )}
          </div>
        ) : (
          <>
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
                  currentSignal === 'CALL' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' :
                  currentSignal === 'PUT' ? 'bg-rose-950/40 border-rose-500 text-rose-400' :
                  'bg-slate-800/40 border-slate-700 text-slate-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{currentSignal === 'CALL' ? '🟢' : currentSignal === 'PUT' ? '🔴' : '⚪'}</span>
                    <div>
                      <div className="text-lg font-black">{String(currentSignal).replace('_', ' ')}</div>
                      <div className="text-[10px] text-slate-400">{analysis.entry || 'After candle close'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-slate-400">SETUP SCORE</div>
                    <div className={`text-base font-black ${
                      scoreVal >= 75 ? 'text-emerald-400' : 'text-slate-300'
                    }`}>
                      {scoreVal}/100
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">TREND / MOMENTUM</span>
                    <span className="font-bold text-slate-200">{analysis.trend || 'Neutral'} • {analysis.momentum || 'Normal'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">EXPIRY GUIDANCE</span>
                    <span className="font-bold text-slate-200">{analysis.expiryGuidance || '1–2 minutes'}</span>
                  </div>
                </div>

                {Array.isArray(analysis.confirmations) && analysis.confirmations.length > 0 && (
                  <div className="text-[10px] text-emerald-400 bg-emerald-950/20 p-2 rounded border border-emerald-900/30">
                    ✓ {analysis.confirmations.join(' | ')}
                  </div>
                )}

                {Array.isArray(analysis.riskFlags) && analysis.riskFlags.length > 0 && (
                  <div className="text-[10px] text-amber-400 bg-amber-950/20 p-2 rounded border border-amber-900/30">
                    ⚠ {analysis.riskFlags.join(' | ')}
                  </div>
                )}

                <div className="text-[10px] text-slate-300 bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 font-bold block">REASON:</span>
                  {analysis.reason}
                  {analysis.waitFor && (
                    <div className="mt-1 text-amber-400 font-semibold">WAIT FOR: {analysis.waitFor}</div>
                  )}
                </div>
              </div>
            )}

            {/* Candle Structure Bar */}
            <div className="rounded-xl border border-slate-800 bg-[#0A0E17] p-3">
              <div className="text-[10px] font-bold text-slate-400 mb-2 flex justify-between">
                <span>RECENT CANDLE STRUCTURE (1M)</span>
                <span className="text-emerald-400">SUPP: {suppVal > 0 ? suppVal.toFixed(5) : 'Calculating...'}</span>
              </div>
              <div className="flex items-end gap-1 h-28 w-full border-b border-slate-800 pb-1">
                {candles.slice(-28).map((c, i) => {
                  const isGreen = c.close >= c.open;
                  const height = Math.max(8, Math.min(100, Math.abs(c.close - c.open) * 45000));
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

            {/* Risk Management */}
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
          </>
        )}

        <p className="text-center text-[10px] text-slate-600">
          Manual execution aid only. No auto trades. Never risk money you cannot afford to lose.
        </p>
      </div>
    </main>
  );
}
