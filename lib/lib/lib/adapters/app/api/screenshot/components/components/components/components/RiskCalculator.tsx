'use client';

import React, { useState } from 'react';

export default function RiskCalculator({ killSwitch, onToggleKillSwitch }: { killSwitch: boolean; onToggleKillSwitch: () => void }) {
  const [balance, setBalance] = useState(100);
  const [risk, setRisk] = useState(2);

  const maxStake = (balance * (risk / 100)).toFixed(2);

  return (
    <div className="p-3 rounded-xl border border-slate-800 bg-slate-900 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-200">RISK GUARD</span>
        <button
          onClick={onToggleKillSwitch}
          className={`px-2.5 py-1 rounded text-[10px] font-bold ${
            killSwitch ? 'bg-rose-600 text-white' : 'bg-slate-800 text-rose-400 border border-rose-900'
          }`}
        >
          {killSwitch ? 'ENGINE DISABLED' : 'KILL SWITCH'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          value={balance}
          onChange={e => setBalance(Number(e.target.value))}
          placeholder="Balance $"
          className="bg-slate-950 border border-slate-800 rounded p-1.5 text-white"
        />
        <input
          type="number"
          value={risk}
          onChange={e => setRisk(Number(e.target.value))}
          placeholder="Risk %"
          className="bg-slate-950 border border-slate-800 rounded p-1.5 text-white"
        />
      </div>
      <div className="text-[11px] text-slate-400">
        Max Recommended Stake: <span className="text-emerald-400 font-bold">${maxStake}</span>
      </div>
    </div>
  );
}
