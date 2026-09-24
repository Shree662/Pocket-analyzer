'use client';

import React from 'react';
import { AnalysisOutput } from '../lib/types';

export default function SignalHistoryTable({ history }: { history: AnalysisOutput[] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs">
      <div className="font-bold text-slate-200 mb-2">SIGNAL AUDIT LOG</div>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {history.length === 0 ? (
          <div className="text-slate-600 text-center py-2">No signals logged yet.</div>
        ) : (
          history.map((h, i) => (
            <div key={i} className="flex justify-between items-center p-1.5 bg-slate-950 rounded border border-slate-850 text-[11px]">
              <span className="font-bold text-slate-300">{h.asset}</span>
              <span className={h.signal === 'CALL' ? 'text-emerald-400 font-bold' : h.signal === 'PUT' ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                {h.signal}
              </span>
              <span className="text-slate-400">{h.setupScore}/100</span>
              <span className="text-slate-500">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
