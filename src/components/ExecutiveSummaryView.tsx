import React from 'react';

export const ExecutiveSummaryView: React.FC = () => {
  const principles = [
    {
      title: '1. Data Quality ≠ Physical Truth',
      icon: 'rule',
      description: 'A validation pass or anomaly score cannot independently prove physical atmospheric truth. It certifies schema compliance and peer consistency.'
    },
    {
      title: '2. AI Assists, Never Dictates',
      icon: 'psychology',
      description: 'Suspicious observations are flagged for human investigation with explainable evidence, never silently censored or auto-rejected.'
    },
    {
      title: '3. Blockchain Preserves Evidence, Not Accuracy',
      icon: 'lock_clock',
      description: 'An on-chain transaction proves an exact observation digest existed at a verifiable timestamp. It does not validate physical sensor chemistry.'
    },
    {
      title: '4. Privacy by Design',
      icon: 'pin_drop',
      description: 'Zero raw GPS, citizen home addresses, or device serials on-chain. Off-chain coordinates are quantized to a 2-decimal grid (~1.1 km resolution).'
    },
    {
      title: '5. Append-Only Audit History',
      icon: 'history_edu',
      description: 'Reviewer decisions, recalibration requests, and superseding verdicts form an immutable event chain. History is never overwritten or deleted.'
    },
    {
      title: '6. Evidence-Based Evaluation',
      icon: 'analytics',
      description: 'Anomaly screening efficacy is quantified via precision, recall, and false positive rates benchmarked against labeled confusion matrices.'
    },
    {
      title: '7. Honest Prototype Boundaries',
      icon: 'fact_check',
      description: 'Synthetic test data, simulated relayer responses, and local EVM testnet states are clearly tagged and never passed off as live telemetry.'
    },
    {
      title: '8. End-to-End Demonstrability',
      icon: 'timer',
      description: 'The entire end-to-end lifecycle (Ingest -> Validate -> Flag -> Human Review -> Anchor -> Verify) is reproducible within a 3-5 minute demo.'
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Banner */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/30 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="material-symbols-outlined text-sm">flag</span>
              IEEE ClimateChain Global Hackathon 2026 &bull; Climate Data Track
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              SensorTrust: AI-Assisted Environmental Data Integrity &amp; Provenance
            </h3>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Bridging the credibility gap between low-cost citizen IoT sensors and official regulatory monitoring stations. SensorTrust couples deterministic physical validation and explainable anomaly screening with role-authorized human review and tamper-evident blockchain anchoring.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0 text-center">
            <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <div className="text-2xl font-bold font-mono text-emerald-400">PM2.5</div>
              <div className="text-xs text-slate-400 mt-0.5">MVP Pollutant Scope</div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <div className="text-2xl font-bold font-mono text-cyan-400">RFC 8785</div>
              <div className="text-xs text-slate-400 mt-0.5">Deterministic Hashes</div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <div className="text-2xl font-bold font-mono text-amber-400">0 PII</div>
              <div className="text-xs text-slate-400 mt-0.5">Quantized Off-Chain</div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <div className="text-2xl font-bold font-mono text-indigo-400">&lt; 3.0s</div>
              <div className="text-xs text-slate-400 mt-0.5">End-to-End Latency</div>
            </div>
          </div>
        </div>
      </div>

      {/* Problem vs Solution Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-rose-900/40 bg-rose-950/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-semibold">
            <span className="material-symbols-outlined">warning</span>
            <h3>The Environmental Data Integrity Crisis</h3>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-rose-400 text-sm mt-0.5">close</span>
              <span><strong>Hardware Drift &amp; Saturation:</strong> Low-cost sensors degrade over time, submitting uncalibrated or saturated PM2.5 readings.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-rose-400 text-sm mt-0.5">close</span>
              <span><strong>Revisionist Alterations:</strong> Centralized databases allow retrospective record edits or silent deletion of industrial pollution spikes.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-rose-400 text-sm mt-0.5">close</span>
              <span><strong>Opaque Black-Box AI:</strong> Automated filters discard critical outlier events without human explainability or audit trails.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <span className="material-symbols-outlined">check_circle</span>
            <h3>The SensorTrust Architectural Solution</h3>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-sm mt-0.5">check</span>
              <span><strong>Deterministic Physical Invariants:</strong> Instant checks on physical bounds (0..1000 µg/m³), freshness, and duplicate timesteps.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-sm mt-0.5">check</span>
              <span><strong>Explainable Anomaly Screening:</strong> Transparent heuristics (rate-of-change, flatlines, peer z-scores) with contextual evidence.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-sm mt-0.5">check</span>
              <span><strong>Append-Only Provenance Registry:</strong> Solidity contract stores SHA-256 digests and authorized reviewer decisions.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 8 Core Principles Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">verified</span>
            The 8 Core Architectural Principles
          </h3>
          <span className="text-xs text-slate-400">Non-negotiable system boundaries</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {principles.map((p, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-2 hover:border-slate-700 transition"
            >
              <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined text-base">{p.icon}</span>
              </div>
              <h4 className="font-semibold text-sm text-white">{p.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Module Responsibility Matrix */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400">grid_view</span>
          System Module Responsibility Matrix
        </h3>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-800/80 text-slate-300 font-mono text-xs border-b border-slate-700">
              <tr>
                <th className="p-3">Module</th>
                <th className="p-3">Runtime</th>
                <th className="p-3">Core Responsibilities</th>
                <th className="p-3">Negative Invariants (Must NEVER Do)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr className="hover:bg-slate-900/40">
                <td className="p-3 font-semibold text-emerald-300">A. Frontend SPA</td>
                <td className="p-3 text-slate-400">Browser / React</td>
                <td className="p-3">Telemetry display, ingestion form, reviewer queue actions, hash verification viewer.</td>
                <td className="p-3 text-rose-400">Execute private keys; authorize reviews client-side; modify historical records.</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="p-3 font-semibold text-cyan-300">B. Ingestion &amp; Validation</td>
                <td className="p-3 text-slate-400">FastAPI Gateway</td>
                <td className="p-3">Enforce schema; check 0..1000 µg/m³ bounds; verify clock drift; reject duplicates.</td>
                <td className="p-3 text-rose-400">Fabricate missing fields; silently modify numbers; submit invalid data to chain.</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="p-3 font-semibold text-amber-300">C. Anomaly Screener</td>
                <td className="p-3 text-slate-400">Worker / Heuristics</td>
                <td className="p-3">Rate-of-change; stuck flatline detector; peer z-scores; transparent evidence generation.</td>
                <td className="p-3 text-rose-400">Issue automated rejections without humans; invent synthetic peer data.</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="p-3 font-semibold text-purple-300">D. Human Review Service</td>
                <td className="p-3 text-slate-400">FastAPI (Authorized)</td>
                <td className="p-3">Enforce reviewer RBAC; require justification reasons; append-only decision logging.</td>
                <td className="p-3 text-rose-400">Accept unsigned actions; allow empty reasons; overwrite earlier decisions.</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="p-3 font-semibold text-indigo-300">E. Provenance Contract</td>
                <td className="p-3 text-slate-400">EVM (Hardhat/Solidity)</td>
                <td className="p-3">Anchor SHA-256 digests; enforce unique observation IDs; emit immutable events.</td>
                <td className="p-3 text-rose-400">Store raw GPS / PII; certify physical truth; allow unauthorized relayer roles.</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="p-3 font-semibold text-blue-300">F. Persistence Layer</td>
                <td className="p-3 text-slate-400">SQLite / Postgres</td>
                <td className="p-3">Store canonical payloads off-chain; cache verification states; index audit events.</td>
                <td className="p-3 text-rose-400">Drop history tables; mutate canonical history records in place.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
