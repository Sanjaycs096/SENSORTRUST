import React from 'react';

interface HeaderProps {
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-mono">SensorTrust</h1>
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                Phase 1 Blueprint
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-950 text-blue-300 border border-blue-700/50">
                IEEE ClimateChain 2026
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Trust the Data. Verify the History. &bull; Environmental Data Integrity &amp; Provenance Architecture
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700/70 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Local EVM: Hardhat (31337)</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700/70 text-slate-300">
            <span className="material-symbols-outlined text-sm text-cyan-400">tune</span>
            <span>Target: PM2.5 MVP</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/50 text-slate-400">
            <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
            <span>Deadline: Oct 25, 2026</span>
          </div>
        </div>
      </div>
    </header>
  );
};
