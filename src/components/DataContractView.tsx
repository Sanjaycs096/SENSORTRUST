import React, { useState, useMemo } from 'react';
import { canonicalizeJson, computeSha256HexSync } from '../core/canonicalize.ts';
import {
  SAMPLE_OBSERVATION_CLEAN,
  SAMPLE_OBSERVATION_SPIKE,
  SAMPLE_OBSERVATION_STUCK
} from '../data/mockData.ts';

export const DataContractView: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<'clean' | 'spike' | 'stuck' | 'custom'>('clean');
  const [customJsonInput, setCustomJsonInput] = useState<string>(
    JSON.stringify(SAMPLE_OBSERVATION_CLEAN, null, 2)
  );
  const [tampered, setTampered] = useState<boolean>(false);

  // Compute active payload
  const activePayload = useMemo(() => {
    try {
      return JSON.parse(customJsonInput);
    } catch {
      return null;
    }
  }, [customJsonInput]);

  // Compute canonical JSON and SHA-256 hash
  const canonicalString = useMemo(() => {
    if (!activePayload) return 'Invalid JSON';
    return canonicalizeJson(activePayload);
  }, [activePayload]);

  const sha256Digest = useMemo(() => {
    if (!activePayload) return 'N/A';
    return computeSha256HexSync(canonicalString);
  }, [activePayload, canonicalString]);

  const loadPreset = (preset: 'clean' | 'spike' | 'stuck') => {
    setSelectedPreset(preset);
    setTampered(false);
    let sample = SAMPLE_OBSERVATION_CLEAN;
    if (preset === 'spike') sample = SAMPLE_OBSERVATION_SPIKE;
    if (preset === 'stuck') sample = SAMPLE_OBSERVATION_STUCK;
    setCustomJsonInput(JSON.stringify(sample, null, 2));
  };

  const handleTamper = () => {
    try {
      const obj = JSON.parse(customJsonInput);
      obj.value = Number((obj.value + 0.1).toFixed(2));
      setCustomJsonInput(JSON.stringify(obj, null, 2));
      setTampered(true);
    } catch (e) {
      console.error(e);
    }
  };

  const schemaFields = [
    { name: 'observationId', type: 'string (UUID v4)', req: 'Yes', desc: 'Unique identifier for global deduplication' },
    { name: 'sensorId', type: 'string', req: 'Yes', desc: 'Pseudonymous station/device identifier' },
    { name: 'pollutant', type: 'literal "PM2.5"', req: 'Yes', desc: 'Locked to PM2.5 for MVP scope' },
    { name: 'value', type: 'number (float)', req: 'Yes', desc: 'Measured concentration in ug/m3 (0.0 to 1000.0)' },
    { name: 'unit', type: 'literal "ug/m3"', req: 'Yes', desc: 'Standardized mass concentration unit' },
    { name: 'timestampObserved', type: 'string (ISO 8601)', req: 'Yes', desc: 'UTC measurement acquisition time' },
    { name: 'timestampSubmitted', type: 'string (ISO 8601)', req: 'Yes', desc: 'UTC ingestion gateway receipt time' },
    { name: 'location.gridLat', type: 'number (2 decimals)', req: 'Yes', desc: 'Quantized latitude (~1.1 km bounding box)' },
    { name: 'location.gridLon', type: 'number (2 decimals)', req: 'Yes', desc: 'Quantized longitude (~1.1 km bounding box)' },
    { name: 'sensorMetadata.sensorType', type: 'Enum', req: 'Yes', desc: 'OFFICIAL_REFERENCE | LOW_COST_IOT | CITIZEN_SCIENCE' },
    { name: 'sensorMetadata.calibrationStatus', type: 'Enum', req: 'Yes', desc: 'FACTORY_CALIBRATED | CO_LOCATED_VERIFIED | EXPIRED | UNKNOWN' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Overview */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">data_object</span>
            Canonical PM2.5 Observation Schema &amp; Hashing Strategy
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic RFC 8785 JSON canonicalization ensures identical byte streams and SHA-256 digests across any programming language.
          </p>
        </div>

        {/* Schema Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800 text-slate-300 font-mono">
              <tr>
                <th className="p-2.5">Field</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Required</th>
                <th className="p-2.5">Validation &amp; Privacy Rule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {schemaFields.map((f, i) => (
                <tr key={i} className="hover:bg-slate-900/50">
                  <td className="p-2.5 font-mono font-medium text-emerald-300">{f.name}</td>
                  <td className="p-2.5 font-mono text-cyan-300">{f.type}</td>
                  <td className="p-2.5 text-slate-400">{f.req}</td>
                  <td className="p-2.5 text-slate-300">{f.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Hasher Playground */}
      <div className="rounded-xl border border-emerald-500/30 bg-slate-900/90 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">fingerprint</span>
              Interactive Deterministic Hasher &amp; Tamper Playground
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select a preset or edit JSON below to observe canonicalization and cryptographic hash generation in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadPreset('clean')}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
                selectedPreset === 'clean'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Preset: Clean Ref
            </button>
            <button
              onClick={() => loadPreset('spike')}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
                selectedPreset === 'spike'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Preset: Spike Anomaly
            </button>
            <button
              onClick={() => loadPreset('stuck')}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
                selectedPreset === 'stuck'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Preset: Stuck Sensor
            </button>
            <button
              onClick={handleTamper}
              className="px-3 py-1.5 rounded text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">edit_attributes</span>
              Tamper (+0.1 ug)
            </button>
          </div>
        </div>

        {/* Live Hasher Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Raw JSON Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">Input JSON Payload (Editable)</span>
              {tampered && (
                <span className="text-rose-400 font-mono text-[11px] flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">warning</span>
                  Tampered with +0.1 ug/m3
                </span>
              )}
            </div>
            <textarea
              value={customJsonInput}
              onChange={(e) => {
                setCustomJsonInput(e.target.value);
                setSelectedPreset('custom');
              }}
              rows={14}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500/50 resize-y"
              spellCheck={false}
            />
          </div>

          {/* Column 2: Canonical RFC 8785 & SHA-256 Digest */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono">RFC 8785 Canonical Serialized Stream</span>
                <span className="text-emerald-400 font-mono text-[11px]">Sorted Keys &bull; No Whitespace</span>
              </div>
              <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-emerald-300/90 break-all max-h-36 overflow-y-auto">
                {canonicalString}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono">Deterministic SHA-256 Digest (On-Chain Anchor)</span>
                <span className="text-cyan-400 font-mono text-[11px]">32 Bytes &bull; 64 Hex Chars</span>
              </div>
              <div className="rounded-lg bg-slate-950 border border-cyan-500/40 p-3 text-xs font-mono text-cyan-300 break-all select-all flex items-center justify-between gap-2">
                <span>{sha256Digest}</span>
                <span className="material-symbols-outlined text-sm text-cyan-400 shrink-0">lock</span>
              </div>
            </div>

            {/* Verification State Callout */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5 space-y-1.5 text-xs">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-400 text-sm">verified</span>
                Independent Reproducibility Guarantee
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Any verifier in Python (`json.dumps(obj, sort_keys=True, separators=(',', ':'))`), Node.js, or Rust will arrive at the exact same hexadecimal digest. If a malicious party alters a single coordinate or reading, the hash completely changes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Observation Status State Machine */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-400">sync_alt</span>
          Observation Status State Transitions
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/50 space-y-1">
            <span className="font-mono font-bold text-slate-300">SUBMITTED</span>
            <p className="text-slate-400 text-[11px]">Initial ingress through POST /api/v1/observations before validation.</p>
          </div>
          <div className="p-3 rounded-lg border border-emerald-900/50 bg-emerald-950/20 space-y-1">
            <span className="font-mono font-bold text-emerald-300">APPROVED / AUTO</span>
            <p className="text-slate-400 text-[11px]">Passed schema, bounds, freshness, and normal anomaly screener bounds.</p>
          </div>
          <div className="p-3 rounded-lg border border-amber-900/50 bg-amber-950/20 space-y-1">
            <span className="font-mono font-bold text-amber-300">FLAGGED / REVIEW</span>
            <p className="text-slate-400 text-[11px]">Passed physical range, but triggered spike, stuck, or spatial divergence rules.</p>
          </div>
          <div className="p-3 rounded-lg border border-rose-900/50 bg-rose-950/20 space-y-1">
            <span className="font-mono font-bold text-rose-300">REJECTED</span>
            <p className="text-slate-400 text-[11px]">Rejected by authorized reviewer with mandatory documented rationale.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
