'use client';

import React from 'react';
import { AnalysisOutput } from '../lib/types';

interface Props {
  data: AnalysisOutput;
  killSwitchActive: boolean;
}

export default function SignalCard({ data, killSwitchActive }: Props) {
  if (killSwitchActive) {
    return (
      <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-center text-rose-400 font-bold text-sm">
        CIRCUIT BREAKER: Signal Engine Disabled.
      </div>
    );
  }

  const isCall = data.signal === 'CALL';
  const isPut = data.signal === 'PUT';

  return (
    <div className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3.5 space-y-3 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
          <span className="text-sm font-black text-white">{data.asset}</span>
          <span className="text-[10px] text-slate-400 ml-2">1M • MANUAL ONLY</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
          {data.dataSource.replace('_', ' ')}
        </span>
      </div>

      <div className={`p-3 rounded-lg flex items-center justify-between border ${
        isCall ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400' :
        isPut ? 'bg-rose-950/40 border-rose-500/50 text-rose-400' :
        'bg-slate-800/40 border-slate-700 text-slate-300'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{isCall ? '🟢' : isPut ? '🔴' : '⚪'}</span>
          <div>
            <div className="text-xl font-black">{data.signal.replace('_', ' ')}</div>
            <div className="text-[10px] text-slate-400">{data.entry}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-slate-400">SETUP SCORE</div>
          <div className="text-lg font-black text-white">{data.setupScore}/100</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-500 block">TREND / MOMENTUM</span>
          <span className="font-semibold text-slate-200">{data.trend} • {data.momentum}</span>
        </div>
        <div className="p-2 rounded bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-500 block">EXPIRY GUIDANCE</span>
          <span className="font-semibold text-slate-200">{data.expiryGuidance}</span>
        </div>
      </div>

      {data.confirmations.length > 0 && (
        <div className="text-[11px] text-emerald-400 bg-emerald-950/20 p-2 rounded border border-emerald-900/30">
          ✓ {data.confirmations.join(' | ')}
        </div>
      )}

      {data.riskFlags.length > 0 && (
        <div className="text-[11px] text-amber-400 bg-amber-950/20 p-2 rounded border border-amber-900/30">
          ⚠ {data.riskFlags.join(' | ')}
        </div>
      )}

      <div className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded border border-slate-800">
        <span className="text-slate-500 font-bold block">REASON:</span>
        {data.reason}
      </div>
    </div>
  );
}
