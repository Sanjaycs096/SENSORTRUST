import React, { useState } from 'react';

export const HandoffRoadmapView: React.FC = () => {
  const [phase2Checks, setPhase2Checks] = useState<Record<string, boolean>>({
    'p2-1': true,
    'p2-2': true,
    'p2-3': true,
    'p2-4': false,
    'p2-5': false,
    'p2-6': false
  });

  const [phase3Checks, setPhase3Checks] = useState<Record<string, boolean>>({
    'p3-1': false,
    'p3-2': false,
    'p3-3': false,
    'p3-4': false
  });

  const togglePhase2 = (key: string) => {
    setPhase2Checks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePhase3 = (key: string) => {
    setPhase3Checks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400">checklist</span>
          Handoff Roadmaps, Quality Gates &amp; Hackathon Scope
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Clear, unambiguous handoff requirements connecting Phase 1 (Architecture Blueprint) to Phase 2 (Google AI Studio Frontend Generation) and Phases 3–6 (Antigravity Backend &amp; Blockchain Implementation).
        </p>
      </div>

      {/* Scope Priority Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/15 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-emerald-400 font-mono">P0: Essential Scope (Mandatory)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
              Oct 25 Target
            </span>
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-sm mt-0.5">check_circle</span>
              <span>PM2.5 Observation Ingestion &amp; Deterministic Range Validation (0..1000 ug/m3)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-sm mt-0.5">check_circle</span>
              <span>Explainable Rule-Based Anomaly Screening (Delta Spike, Flatline, Peer Z-Score)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-sm mt-0.5">check_circle</span>
              <span>Human Reviewer Queue with mandatory rationale justification</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-sm mt-0.5">check_circle</span>
              <span>Solidity Hash Anchoring Contract (`SensorTrustProvenance.sol`) on local Hardhat</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-sm mt-0.5">check_circle</span>
              <span>Independent Hash Verification Portal &amp; 3-Minute Reproducible Demo Script</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-300 font-mono">P1: Secondary Scope (If Time Permits)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
              Post-P0 Freeze
            </span>
          </div>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-slate-500 text-sm mt-0.5">pending</span>
              <span>Lightweight Scikit-learn Isolation Forest model with measured confusion matrix</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-slate-500 text-sm mt-0.5">pending</span>
              <span>Public Sepolia Testnet deployment with live Etherscan links</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-slate-500 text-sm mt-0.5">pending</span>
              <span>Exportable Cryptographic Compliance Certificate (JSON-LD format)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Checklists Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phase 2 Checklist */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">view_quilt</span>
              Phase 2 Handoff Checklist (Google AI Studio)
            </h4>
            <span className="text-xs font-mono text-emerald-400">Frontend SPA</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={phase2Checks['p2-1']}
                onChange={() => togglePhase2('p2-1')}
                className="mt-0.5 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="text-slate-300">
                1. Locked component conventions: Tailwind CSS, shadcn-inspired layout, Google Material Symbols exclusively.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={phase2Checks['p2-2']}
                onChange={() => togglePhase2('p2-2')}
                className="mt-0.5 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="text-slate-300">
                2. Adopt `canonicalizeJson()` and `computeSha256HexSync()` from `src/core/canonicalize.ts`.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={phase2Checks['p2-3']}
                onChange={() => togglePhase2('p2-3')}
                className="mt-0.5 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="text-slate-300">
                3. Align state machine &amp; badge colors with `ObservationStatus` enums.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={phase2Checks['p2-4']}
                onChange={() => togglePhase2('p2-4')}
                className="mt-0.5 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="text-slate-300">
                4. Build Screen 1 (Dashboard) with KPI counters and recent activity table.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={phase2Checks['p2-5']}
                onChange={() => togglePhase2('p2-5')}
                className="mt-0.5 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="text-slate-300">
                5. Build Screen 2 (Submit) with instant 0..1000 ug/m3 bounds check and "Load Spike" preset.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={phase2Checks['p2-6']}
                onChange={() => togglePhase2('p2-6')}
                className="mt-0.5 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="text-slate-300">
                6. Build Screen 4 (Reviewer Queue) &amp; Screen 5 (Provenance Hash Explorer).
              </span>
            </label>
          </div>
        </div>

        {/* Phases 3–6 Checklist */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400">terminal</span>
              Phases 3–6 Checklist (Antigravity)
            </h4>
            <span className="text-xs font-mono text-cyan-400">Backend &amp; Blockchain</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={phase3Checks['p3-1']}
                onChange={() => togglePhase3('p3-1')}
                className="mt-0.5 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span className="text-slate-300">
                Phase 3: Implement Python FastAPI service for ingestion, range validation, and anomaly heuristics.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={phase3Checks['p3-2']}
                onChange={() => togglePhase3('p3-2')}
                className="mt-0.5 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span className="text-slate-300">
                Phase 4: Deploy `SensorTrustProvenance.sol` on local Hardhat node (`31337`) and configure relayer.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={phase3Checks['p3-3']}
                onChange={() => togglePhase3('p3-3')}
                className="mt-0.5 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span className="text-slate-300">
                Phase 5: Wire full-stack integration; verify append-only review decisions and tx confirmation receipts.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={phase3Checks['p3-4']}
                onChange={() => togglePhase3('p3-4')}
                className="mt-0.5 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span className="text-slate-300">
                Phase 6: Run Playwright automated E2E test suite covering all 5 user flows before final submission.
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 3-Minute Hackathon Demo Script */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400">timer</span>
          The 3-Minute Hackathon Demo Script (Deterministic Runbook)
        </h4>

        <div className="space-y-3 text-xs sm:text-sm text-slate-300">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-emerald-400 font-bold">Minute 0:00 – 0:45: The Problem &amp; Ingestion</span>
            <p className="text-slate-400 text-xs">
              Show Dashboard with regional air quality stations. Open Screen 2 (Submit) and click "Load Spike Preset" (PM2.5 = 284.6 ug/m3). Submit and demonstrate instant physical range pass but immediate AI anomaly flag.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-amber-400 font-bold">Minute 0:45 – 1:45: Reviewer Investigation</span>
            <p className="text-slate-400 text-xs">
              Navigate to Screen 4 (Reviewer Queue). Inspect the flagged reading: peer mean is 31.8 ug/m3 (z-score +8.1). Environmental reviewer selects "Reject", enters mandatory reason ("Sensor inlet contaminated by generator soot"), and confirms.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-cyan-400 font-bold">Minute 1:45 – 2:30: Blockchain Anchoring &amp; Verification</span>
            <p className="text-slate-400 text-xs">
              Open Screen 5 (Public Provenance Explorer). Show the newly mined block transaction on Hardhat. Click "Verify Hash" to display green verification confirmation.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-mono text-purple-400 font-bold">Minute 2:30 – 3:00: Tamper Resistance Test</span>
            <p className="text-slate-400 text-xs">
              Manually change 284.6 to 284.7 ug/m3 in the verifier. Instant red alert: "Digest Mismatch Detected!" Demonstrates why centralized databases can be falsified but SensorTrust cannot.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
