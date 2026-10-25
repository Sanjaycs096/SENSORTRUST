import React, { useState } from 'react';

export const SystemArchitectureView: React.FC = () => {
  const [selectedFlowStep, setSelectedFlowStep] = useState<number>(1);

  const workflowSteps = [
    {
      step: 1,
      title: 'Observation Submission',
      actor: 'Low-Cost Sensor / Citizen Device',
      action: 'Submits PM2.5 reading (e.g. 284.6 ug/m3) via POST /api/v1/observations',
      boundary: 'Off-Chain Ingestion Gateway',
      detail: 'Device submits measurement, timestamp, quantized grid coordinates (2 decimals), and firmware/calibration metadata.'
    },
    {
      step: 2,
      title: 'Deterministic Invariant Validation',
      actor: 'Validation Engine (FastAPI)',
      action: 'Enforces schema integrity, physical bounds (0..1000 ug/m3), clock freshness (-24h to +5m), and duplicate checks.',
      boundary: 'Application Core',
      detail: 'If checks fail (e.g. negative reading, expired timestamp, duplicate ID), the record is rejected immediately with structured error codes.'
    },
    {
      step: 3,
      title: 'Explainable Anomaly Screening',
      actor: 'Screening Engine (Heuristics + ML Baseline)',
      action: 'Calculates delta rate-of-change, consecutive flatline count, and spatial peer z-scores.',
      boundary: 'Worker Service',
      detail: 'Produces a normalized risk score (0..1), structured reason codes (e.g. ANOMALY_RAPID_SPIKE), and plain-English explanation. Flags observation for review.'
    },
    {
      step: 4,
      title: 'Canonical Digest Anchoring',
      actor: 'Relayer Service -> Solidity Contract',
      action: 'Computes RFC 8785 canonical SHA-256 digest and executes anchorObservation(obsId, digest).',
      boundary: 'EVM Smart Contract (Hardhat 31337)',
      detail: 'Contract stores observationId => digest mapping, validates caller has RELAYER_ROLE, and emits ObservationAnchored event.'
    },
    {
      step: 5,
      title: 'Human Review Investigation',
      actor: 'Authorized Environmental Officer',
      action: 'Inspects flagged queue, examines sensor history, peer cluster divergence, and calibration status.',
      boundary: 'Reviewer Workspace UI',
      detail: 'Decision cannot be submitted without a mandatory rationale string (minimum 10 characters). RBAC role is validated on backend.'
    },
    {
      step: 6,
      title: 'Append-Only Decision Attestation',
      actor: 'Reviewer -> Provenance Smart Contract',
      action: 'Invokes recordReviewDecision(obsId, decisionDigest, REJECT, reasonUri).',
      boundary: 'EVM Smart Contract',
      detail: 'Smart contract appends review event to the observation history array. Prior records are preserved; state transition is tamper-evident.'
    },
    {
      step: 7,
      title: 'Independent Public Verification',
      actor: 'Public Researcher / Auditor',
      action: 'Submits observation JSON payload; client recalculates RFC 8785 hash and verifies against contract.',
      boundary: 'Provenance Explorer & Public Node',
      detail: 'If a single coordinate, timestamp digit, or value is altered, the SHA-256 avalanche effect creates an immediate mismatch alert.'
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Visual System Architecture Diagram */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">schema</span>
              Layered System Architecture &amp; Data Pipeline
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Zero-PII decoupled architecture isolating off-chain telemetry from on-chain cryptographic digests.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono self-start sm:self-auto border border-slate-700">
            5 Logical Subsystems
          </span>
        </div>

        {/* Interactive Architecture Flow Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Layer 1: Client */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
              <span>Layer 1</span>
              <span className="material-symbols-outlined text-sm">laptop_mac</span>
            </div>
            <h4 className="font-bold text-sm text-white">Client SPA</h4>
            <p className="text-[11px] text-slate-400">
              Vite + React 19 + Tailwind. Role-aware UI: Dashboard, Ingestion, Reviewer Queue, Provenance Explorer.
            </p>
            <div className="pt-2 border-t border-emerald-900/30 text-[10px] font-mono text-emerald-300">
              Google Material Symbols
            </div>
          </div>

          {/* Layer 2: API Gateway */}
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
              <span>Layer 2</span>
              <span className="material-symbols-outlined text-sm">dns</span>
            </div>
            <h4 className="font-bold text-sm text-white">FastAPI Gateway</h4>
            <p className="text-[11px] text-slate-400">
              Versioned REST API (`/api/v1/*`). API token authentication for sensors; JWT RBAC for human reviewers.
            </p>
            <div className="pt-2 border-t border-cyan-900/30 text-[10px] font-mono text-cyan-300">
              Strict Pydantic Envelopes
            </div>
          </div>

          {/* Layer 3: Validation & Screening */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-amber-400">
              <span>Layer 3</span>
              <span className="material-symbols-outlined text-sm">tune</span>
            </div>
            <h4 className="font-bold text-sm text-white">Screening Engine</h4>
            <p className="text-[11px] text-slate-400">
              Deterministic physical bounds (0..1000 ug/m3), spike rate, stuck sensor flatline, and spatial peer z-scores.
            </p>
            <div className="pt-2 border-t border-amber-900/30 text-[10px] font-mono text-amber-300">
              Explainable Reason Codes
            </div>
          </div>

          {/* Layer 4: Storage */}
          <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-purple-400">
              <span>Layer 4</span>
              <span className="material-symbols-outlined text-sm">database</span>
            </div>
            <h4 className="font-bold text-sm text-white">Audit DB</h4>
            <p className="text-[11px] text-slate-400">
              PostgreSQL / SQLite off-chain persistence. Stores complete canonical observation and append-only decision audit log.
            </p>
            <div className="pt-2 border-t border-purple-900/30 text-[10px] font-mono text-purple-300">
              Quantized Bounding Box
            </div>
          </div>

          {/* Layer 5: Blockchain */}
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-indigo-400">
              <span>Layer 5</span>
              <span className="material-symbols-outlined text-sm">token</span>
            </div>
            <h4 className="font-bold text-sm text-white">Provenance Chain</h4>
            <p className="text-[11px] text-slate-400">
              Solidity smart contract (`SensorTrustProvenance.sol`). Stores SHA-256 digests and emits immutable review events.
            </p>
            <div className="pt-2 border-t border-indigo-900/30 text-[10px] font-mono text-indigo-300">
              Hardhat Node (31337)
            </div>
          </div>
        </div>
      </div>

      {/* End-to-End Workflow Sequence Inspector */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-400">route</span>
            End-to-End Workflow Sequence (7 Discrete Stages)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Click on any step below to inspect actors, execution boundaries, and cryptographic actions.
          </p>
        </div>

        {/* Step Numbers Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {workflowSteps.map((s) => {
            const isSelected = selectedFlowStep === s.step;
            return (
              <button
                key={s.step}
                onClick={() => setSelectedFlowStep(s.step)}
                className={`p-3 rounded-lg border text-left transition ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-sm shadow-emerald-950'
                    : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span>Step {s.step}</span>
                  {isSelected && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
                </div>
                <div className="text-xs font-semibold text-slate-200 line-clamp-1">{s.title}</div>
              </button>
            );
          })}
        </div>

        {/* Active Step Detail Card */}
        {(() => {
          const active = workflowSteps.find((s) => s.step === selectedFlowStep) || workflowSteps[0];
          return (
            <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-xs font-bold">
                    {active.step}
                  </span>
                  <h4 className="text-base font-bold text-white">{active.title}</h4>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                    Actor: {active.actor}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800/60 text-emerald-300 font-mono">
                    {active.boundary}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="space-y-1.5">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Core Action:</div>
                  <div className="text-slate-200 font-medium leading-relaxed">{active.action}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Technical Details:</div>
                  <div className="text-slate-300 leading-relaxed">{active.detail}</div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* On-Chain vs Off-Chain Boundary Matrix */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-400">swap_horiz</span>
          Cryptographic Data Boundary (On-Chain vs Off-Chain)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/15 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-emerald-400">
              <span className="material-symbols-outlined">shield</span>
              <span>Stored On-Chain (`SensorTrustProvenance.sol`)</span>
            </div>
            <ul className="space-y-1.5 text-slate-300">
              <li className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-emerald-400 text-xs mt-0.5">check</span>
                <span>`observationId` (32-byte UUID digest)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-emerald-400 text-xs mt-0.5">check</span>
                <span>`observationDigest` (SHA-256 of canonical RFC 8785 JSON)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-emerald-400 text-xs mt-0.5">check</span>
                <span>`decisionDigest` (SHA-256 of reviewer verdict and justification)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-emerald-400 text-xs mt-0.5">check</span>
                <span>`decisionType` enum (0: APPROVE, 1: REJECT, 2: RECALIBRATE)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-emerald-400 text-xs mt-0.5">check</span>
                <span>Block timestamp and authorized reviewer address</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-slate-300">
              <span className="material-symbols-outlined text-slate-400">lock</span>
              <span>Preserved Off-Chain (Privacy &amp; Efficiency)</span>
            </div>
            <ul className="space-y-1.5 text-slate-400">
              <li className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-slate-400 text-xs mt-0.5">remove</span>
                <span>Raw GPS coordinates (quantized to 2 decimals off-chain)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-slate-400 text-xs mt-0.5">remove</span>
                <span>Citizen account emails, names, or device MAC addresses</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-slate-400 text-xs mt-0.5">remove</span>
                <span>Complete human review rationale text (stored in DB, referenced by hash)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-slate-400 text-xs mt-0.5">remove</span>
                <span>High-frequency raw sensor telemetry timeseries</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
