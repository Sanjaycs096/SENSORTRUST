import React from 'react';
import { sensorTrustApi } from '../../services/api.ts';

interface SampleDataNoticeProps {
  onReset?: () => void;
  className?: string;
}

export const SampleDataNotice: React.FC<SampleDataNoticeProps> = ({ onReset, className = '' }) => {
  const handleReset = () => {
    sensorTrustApi.resetToDefaultSeed();
    if (onReset) onReset();
    window.location.reload();
  };

  return (
    <div
      role="region"
      aria-label="Prototype environment notice"
      className={`bg-stone-100/90 border border-stone-200/90 text-stone-700 rounded-lg px-3.5 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${className}`}
    >
      <div className="flex items-start sm:items-center gap-2.5">
        <span className="material-symbols-outlined text-amber-700 text-lg shrink-0 mt-0.5 sm:mt-0">
          info
        </span>
        <div className="text-[11px] sm:text-xs leading-relaxed text-stone-600">
          <span className="font-semibold text-stone-900 font-mono">
            IEEE ClimateChain 2026 Prototype Environment:
          </span>{' '}
          Evaluating multi-basin air-quality records with client-simulated EVM Hardhat (31337) state. Pure RFC 8785 canonicalization &amp; SHA-256 verification.
        </div>
      </div>
      <button
        type="button"
        onClick={handleReset}
        className="px-2.5 py-1 rounded-md bg-stone-200 hover:bg-stone-300/80 text-stone-800 font-mono text-[11px] font-medium self-start sm:self-auto shrink-0 transition flex items-center gap-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-600"
      >
        <span className="material-symbols-outlined text-sm">restart_alt</span>
        <span>Reset Seed Data</span>
      </button>
    </div>
  );
};
