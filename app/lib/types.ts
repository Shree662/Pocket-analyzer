export type SignalType = 'CALL' | 'PUT' | 'NO_TRADE';
export type DataSourceType = 'LIVE_DATA' | 'DELAYED_DATA' | 'SCREENSHOT_DATA' | 'DEMO_DATA';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface EngineWeights {
  trend: number;
  priceAction: number;
  supportResistance: number;
  momentum: number;
  emaStructure: number;
  volatility: number;
  htfConfirmation: number;
}

export interface SignalEngineConfig {
  minSetupScore: number;
  highQualityScore: number;
  weights: EngineWeights;
  cooldownPeriodCandles: number;
  maxCandleRangeMultiplier: number;
}

export interface TechnicalIndicators {
  ema9: (number | null)[];
  ema21: (number | null)[];
  ema50: (number | null)[];
  rsi14: (number | null)[];
  macd: {
    macdLine: (number | null)[];
    signalLine: (number | null)[];
    histogram: (number | null)[];
  };
  bollingerBands: {
    upper: (number | null)[];
    middle: (number | null)[];
    lower: (number | null)[];
  };
  atr14: (number | null)[];
}

export interface KeyLevels {
  support: number;
  resistance: number;
  recentSwingHigh: number;
  recentSwingLow: number;
  breakoutZone: boolean;
  retestZone: boolean;
}

export interface AnalysisOutput {
  asset: string;
  timeframe: string;
  dataSource: DataSourceType;
  signal: SignalType;
  setupScore: number;
  trend: 'Bullish' | 'Bearish' | 'Neutral/Choppy';
  momentum: 'Strong Bullish' | 'Moderate Bullish' | 'Strong Bearish' | 'Moderate Bearish' | 'Conflicted';
  volatility: 'Low' | 'Normal' | 'Expanding' | 'Excessive';
  currentPrice: number;
  support: number;
  resistance: number;
  entry: string;
  expiryGuidance: '1 minute' | '1–2 minutes' | '2–3 minutes' | 'Wait for confirmation';
  confirmations: string[];
  riskFlags: string[];
  reason: string;
  waitFor?: string;
  timestamp: number;
}

export interface BacktestResult {
  totalSignals: number;
  callSignals: number;
  putSignals: number;
  noTradeCount: number;
  wins: number;
  losses: number;
  winRate: number;
  maxLosingStreak: number;
  averageSetupScore: number;
}

