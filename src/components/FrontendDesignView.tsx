import React, { useState } from 'react';

export const FrontendDesignView: React.FC = () => {
  const [activeScreenIndex, setActiveScreenIndex] = useState<number>(0);

  const screens = [
    {
      id: 'dashboard',
      num: 1,
      name: 'Screen 1 — Monitoring Dashboard',
      route: '/',
      purpose: 'High-level real-time overview of network health, observation throughput, flagged queues, and recent stream.',
      keyWidgets: [
        'Global KPI Cards (Total Ingested, Auto-Approved, In Review Queue, Anchored On-Chain)',
        'Active Basin Regional Selector (e.g. Delhi NCR, Bangalore Urban)',
        'Recent Observation Stream Table with color-coded status badges and quick inspect links',
        'Simulated Sensor Activity pulse indicator'
      ],
      userActions: [
        'Filter table by status (Clean, Flagged, In Review, Rejected)',
        'Click observation row to navigate to Screen 3 (Details)',
        'Click "Review Queue" badge to jump to Screen 4'
      ],
      emptyAndErrorStates: [
        'Empty Stream: "No observations ingested in active time window"',
        'Network Error: "Unable to reach ingestion gateway; displaying cached telemetry"'
      ]
    },
    {
      id: 'submit',
      num: 2,
      name: 'Screen 2 — Submit Observation',
      route: '/submit',
      purpose: 'Direct entry point for IoT devices, automated gateways, or manual citizen-science test submissions.',
      keyWidgets: [
        'PM2.5 Value Input (with inline physical range validator 0..1000 ug/m3)',
        'Sensor ID & Type Selector (Official Reference, Low-Cost IoT, Citizen)',
        'Quantized Location Picker (Grid Lat/Lon with ~1.1km privacy truncation notice)',
        'Observation Timestamp picker with "Set to Current UTC" button',
        'Quick Preset Buttons: "Load Clean Ref", "Load Spike Anomaly", "Load Stuck Sensor"'
      ],
      userActions: [
        'Submit observation -> triggers validation engine & displays instant feedback banner',
        'One-click preset buttons for 3-minute hackathon demo reproducibility'
      ],
      emptyAndErrorStates: [
        'Validation Failure: Displays exact rejection reasons (e.g. "ERR_RANGE_NEGATIVE")',
        'Duplicate Rejection: Displays "ERR_DUPLICATE_OBSERVATION_ID" with conflict notice'
      ]
    },
    {
      id: 'details',
      num: 3,
      name: 'Screen 3 — Observation Details & Audit',
      route: '/observations/:id',
      purpose: 'Deep forensic view of an individual observation, its physical validation gates, anomaly evidence, and review history.',
      keyWidgets: [
        'Measurement Hero Card: Large PM2.5 concentration, AQI classification, timestamp',
        'Validation Audit Card: 4-gate status (Schema, Range, Freshness, Dedup)',
        'Explainable Anomaly Card: Delta rate-of-change, peer cluster scatter comparison, reason codes',
        'Blockchain Provenance Card: Canonical SHA-256 digest, Hardhat block number, txHash link',
        'Independent Verification Action Box: "Recompute & Verify on Chain" button'
      ],
      userActions: [
        'Click "Verify On-Chain" to recalculate SHA-256 and confirm smart contract match',
        'Click "Review Observation" (if user has reviewer role) to navigate to Screen 4'
      ],
      emptyAndErrorStates: [
        '404 Not Found: "Observation ID does not exist in local persistence layer"',
        'Tamper Warning: Red alert if recomputed digest diverges from on-chain anchor'
      ]
    },
    {
      id: 'reviewer',
      num: 4,
      name: 'Screen 4 — Reviewer Workspace',
      route: '/reviewer/queue',
      purpose: 'Dedicated operational queue for environmental compliance officers to investigate anomalies and record accountable decisions.',
      keyWidgets: [
        'Flagged Queue List: Sorted by severity (Critical -> High -> Medium)',
        'Split-Screen Investigation Panel: Selected observation evidence on left, verdict form on right',
        'Decision Radio Group: [Approve Observation, Reject Observation, Request Recalibration]',
        'Mandatory Justification Textarea: Enforces >= 10 character explanation'
      ],
      userActions: [
        'Select observation from queue',
        'Inspect contextual peer divergence',
        'Submit decision -> calls /api/v1/reviews/:id/decision and anchors decision digest on EVM'
      ],
      emptyAndErrorStates: [
        'Empty Queue: "All flagged observations have been reviewed. Network nominal."',
        'Missing Reason Error: "Decision rejected: justification explanation is mandatory."'
      ]
    },
    {
      id: 'explorer',
      num: 5,
      name: 'Screen 5 — Public Provenance Explorer',
      route: '/provenance',
      purpose: 'Independent public auditing portal for citizens and researchers to inspect immutable records and test hash integrity.',
      keyWidgets: [
        'Search Bar: Query by Observation UUID, Sensor ID, or Blockchain Tx Hash',
        'Tamper-Verification Playground: Paste custom JSON to verify against on-chain digest',
        'Chronological Audit Trail: Ingestion -> Anchoring -> Review Decisions',
        'Raw Canonical Byte-Stream Inspector'
      ],
      userActions: [
        'Search and verify any historical record',
        'Test intentional single-character modification to demonstrate avalanche effect'
      ],
      emptyAndErrorStates: [
        'Hash Mismatch Alert: "Digest does not match smart contract record!"',
        'Node Offline: "Blockchain RPC node unavailable; displaying local verification cache"'
      ]
    }
  ];

  const active = screens[activeScreenIndex] || screens[0];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400">web</span>
          Frontend Information Architecture &amp; Screen Specifications
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          The SensorTrust frontend is designed as a crisp, data-first environmental portal. Built with mobile-first responsiveness, semantic HTML, visible focus states, zero unnecessary decorative charts, and strictly Google Material Symbols.
        </p>
      </div>

      {/* Screen Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {screens.map((s, idx) => {
          const isSelected = activeScreenIndex === idx;
          return (
            <button
              key={s.id}
              onClick={() => setActiveScreenIndex(idx)}
              className={`p-3 rounded-lg border text-left transition ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-mono mb-1 text-slate-400">Screen {s.num}</div>
              <div className="text-xs font-semibold text-slate-200 line-clamp-1">{s.name.replace(`Screen ${s.num} — `, '')}</div>
              <div className="text-[10px] font-mono text-emerald-400/80 mt-1">{s.route}</div>
            </button>
          );
        })}
      </div>

      {/* Active Screen Wireframe Blueprint Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <h4 className="text-base font-bold text-white">{active.name}</h4>
            <div className="text-xs text-slate-400 mt-0.5">{active.purpose}</div>
          </div>
          <span className="px-3 py-1 rounded bg-slate-800 text-emerald-300 font-mono text-xs border border-slate-700 self-start sm:self-auto">
            Route: {active.route}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm">
          {/* Key Components */}
          <div className="space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-emerald-400">
              <span className="material-symbols-outlined text-sm">widgets</span>
              Key UI Components
            </div>
            <ul className="space-y-2 text-slate-300 text-xs">
              {active.keyWidgets.map((w, i) => (
                <li key={i} className="flex items-start gap-2 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="material-symbols-outlined text-emerald-400 text-xs mt-0.5">check_box_outline_blank</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* User Actions */}
          <div className="space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-cyan-400">
              <span className="material-symbols-outlined text-sm">touch_app</span>
              Core User Actions
            </div>
            <ul className="space-y-2 text-slate-300 text-xs">
              {active.userActions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="material-symbols-outlined text-cyan-400 text-xs mt-0.5">arrow_forward</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Error & Empty States */}
          <div className="space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-amber-400">
              <span className="material-symbols-outlined text-sm">error_outline</span>
              Empty &amp; Error States
            </div>
            <ul className="space-y-2 text-slate-300 text-xs">
              {active.emptyAndErrorStates.map((e, i) => (
                <li key={i} className="flex items-start gap-2 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="material-symbols-outlined text-amber-400 text-xs mt-0.5">info</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
