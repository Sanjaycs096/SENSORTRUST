import React, { useState, useEffect } from 'react';
import { sensorTrustApi } from '../services/api.ts';
import { EnrichedObservation, VerificationResponse } from '../core/contracts.ts';
import { canonicalizeJson, computeSha256HexSync } from '../core/canonicalize.ts';
import { StatusBadge } from '../components/shared/StatusBadge.tsx';
import { SampleDataNotice } from '../components/shared/SampleDataNotice.tsx';
import { PageHeader } from '../components/shared/PageHeader.tsx';
import { CopyDigest } from '../components/shared/CopyDigest.tsx';

interface ProvenanceExplorerPageProps {
  onNavigate: (path: string) => void;
}

export const ProvenanceExplorerPage: React.FC<ProvenanceExplorerPageProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [observations, setObservations] = useState<EnrichedObservation[]>([]);
  const [selectedObs, setSelectedObs] = useState<EnrichedObservation | null>(null);
  const [candidateJson, setCandidateJson] = useState<string>('');
  const [tampered, setTampered] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResponse | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await sensorTrustApi.getObservations({ limit: 20 });
        setObservations(res.items);
        if (res.items.length > 0) {
          const first = res.items[0];
          setSelectedObs(first);
          setCandidateJson(JSON.stringify(first.observation, null, 2));
        }
      } catch (err) {
        console.error('Failed to load observations for provenance explorer:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSelectObservation = (obs: EnrichedObservation) => {
    setSelectedObs(obs);
    setCandidateJson(JSON.stringify(obs.observation, null, 2));
    setTampered(false);
    setVerificationResult(null);
    setJsonError(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim().toLowerCase();
    const found = observations.find(
      (o) =>
        o.observation.observationId.toLowerCase().includes(q) ||
        o.observationDigest.toLowerCase().includes(q) ||
        (o.provenance.txHash ? o.provenance.txHash.toLowerCase().includes(q) : false) ||
        o.observation.sensorId.toLowerCase().includes(q)
    );
    if (found) {
      handleSelectObservation(found);
    }
  };

  const handleTamperValue = () => {
    try {
      const obj = JSON.parse(candidateJson);
      obj.value = Number(((obj.value || 0) + 0.1).toFixed(2));
      setCandidateJson(JSON.stringify(obj, null, 2));
      setTampered(true);
      setVerificationResult(null);
      setJsonError(null);
    } catch (e: any) {
      setJsonError('Cannot tamper: Candidate JSON is malformed (' + e.message + ')');
    }
  };

  const handleResetPayload = () => {
    if (!selectedObs) return;
    setCandidateJson(JSON.stringify(selectedObs.observation, null, 2));
    setTampered(false);
    setVerificationResult(null);
    setJsonError(null);
  };

  const handleVerifyCandidate = () => {
    if (!selectedObs) return;
    setJsonError(null);
    try {
      const parsedCandidate = JSON.parse(candidateJson);
      const canonicalCandidate = canonicalizeJson(parsedCandidate);
      const recomputedDigest = computeSha256HexSync(canonicalCandidate);
      const onChainDigest = selectedObs.observationDigest;

      const isMatched = recomputedDigest.toLowerCase() === onChainDigest.toLowerCase();

      setVerificationResult({
        isMatched,
        existsOnChain: true,
        recomputedDigest,
        onChainDigest,
        blockNumber: selectedObs.provenance.blockNumber,
        blockTimestamp: selectedObs.provenance.blockTimestamp,
        submitter: selectedObs.provenance.anchoredBy,
        verificationLevel: 'LOCAL_RECOMPUTATION',
        explanation: isMatched
          ? 'Cryptographic match confirmed! The candidate payload byte-stream matches the on-chain SHA-256 digest identically. Note: Cryptographic verification confirms digest consistency, not physical measurement accuracy.'
          : 'Digest mismatch detected! Altering even a single digit or coordinate changes the SHA-256 hash completely via the cryptographic avalanche effect.'
      });
    } catch (err: any) {
      setJsonError('Invalid JSON in candidate payload editor: ' + (err.message || 'Syntax error'));
    }
  };

  const [verifyingOnChain, setVerifyingOnChain] = useState(false);

  const handleVerifyOnChain = async () => {
    if (!selectedObs) return;
    setJsonError(null);
    setVerifyingOnChain(true);
    try {
      const parsedCandidate = JSON.parse(candidateJson);
      const res = await sensorTrustApi.verifyProvenance({
        observationId: selectedObs.observation.observationId,
        candidatePayload: parsedCandidate
      });
      setVerificationResult(res);
    } catch (err: any) {
      setJsonError('On-chain verification error: ' + (err.message || 'Server error'));
    } finally {
      setVerifyingOnChain(false);
    }
  };

  return (
    <div className="space-y-6">
      <SampleDataNotice />

      {/* Page Header */}
      <PageHeader
        title="Public Provenance Explorer"
        subtitle="Independent auditing portal to inspect immutable chronological timelines and verify cryptographic SHA-256 hashes."
        icon="verified"
        iconColor="text-indigo-700"
        badge={{ text: 'Tamper-Evident Ledger', variant: 'indigo' }}
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => onNavigate('/') },
          { label: 'Provenance Explorer' }
        ]}
        actions={
          <form onSubmit={handleSearch} className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-stone-400 text-lg select-none">
              search
            </span>
            <input
              type="text"
              placeholder="Search UUID, Digest, or Station..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
            />
          </form>
        }
      />

      {loading ? (
        <div className="p-16 text-center text-stone-500 space-y-2">
          <span className="material-symbols-outlined text-3xl animate-spin text-emerald-700">
            progress_activity
          </span>
          <p className="text-xs">Loading provenance ledger records...</p>
        </div>
      ) : selectedObs ? (
        <div className="space-y-6">
          {/* Quick Record Switcher Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-stone-600 font-mono text-[11px] shrink-0 font-semibold uppercase tracking-wider">
              Select Record:
            </span>
            {observations.map((o) => {
              const isSelected = o.observation.observationId === selectedObs.observation.observationId;
              return (
                <button
                  key={o.observation.observationId}
                  onClick={() => handleSelectObservation(o)}
                  className={`px-3 py-1.5 rounded-full font-mono text-xs whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                    isSelected
                      ? 'bg-stone-900 text-white font-semibold shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  {o.observation.sensorId} ({o.observation.value.toFixed(1)} µg)
                </button>
              );
            })}
          </div>

          {/* Provenance Record Meta Card */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-stone-900">
                    Station: {selectedObs.observation.sensorId}
                  </h3>
                  <StatusBadge status={selectedObs.status} size="sm" />
                </div>
                <div className="text-xs text-stone-500 font-mono flex items-center gap-1.5">
                  <span>UUID:</span>
                  <CopyDigest value={selectedObs.observation.observationId} truncateLength={22} />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 border border-stone-200 font-semibold">
                  Block #{selectedObs.provenance.blockNumber}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                  {selectedObs.provenance.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1.5">
                <span className="text-[10px] text-stone-500 uppercase font-bold block">On-Chain Observation Digest</span>
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                  <CopyDigest value={selectedObs.observationDigest} truncateLength={32} />
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-stone-500 uppercase font-bold block">Hardhat Transaction Hash</span>
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                  {selectedObs.provenance.txHash ? (
                    <CopyDigest value={selectedObs.provenance.txHash} truncateLength={32} />
                  ) : (
                    <span className="text-[11px] text-stone-500 font-mono italic">Not anchored to EVM</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chronological Audit Timeline */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-purple-700 text-base">timeline</span>
                <span>Chronological Provenance Timeline (Append-Only)</span>
              </h4>
              <span className="text-[11px] font-mono text-stone-400">
                Immutable Lifecycle
              </span>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
              {/* Event 1: Ingestion */}
              <div className="relative space-y-1 text-xs">
                <div className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white" />
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">1. Observation Ingestion &amp; Validation</span>
                  <span className="text-stone-500 font-mono text-[10px]">
                    {new Date(selectedObs.observation.timestampSubmitted).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  Physical measurement of <strong>{selectedObs.observation.value.toFixed(1)} µg/m³ PM2.5</strong> ingested and passed 4 deterministic validation gates.
                </p>
              </div>

              {/* Event 2: Anomaly Screening */}
              <div className="relative space-y-1 text-xs">
                <div className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-white" />
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">2. Explainable Anomaly Screening</span>
                  <span className="text-stone-500 font-mono text-[10px]">
                    Risk Score: {selectedObs.anomaly.score.toFixed(2)}
                  </span>
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">{selectedObs.anomaly.explanation}</p>
              </div>

              {/* Event 3: On-Chain Anchoring */}
              <div className="relative space-y-1 text-xs">
                <div className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">3. Tamper-Evident Ledger Anchoring (Simulated EVM)</span>
                  <span className="text-stone-500 font-mono text-[10px]">
                    Block #{selectedObs.provenance.blockNumber}
                  </span>
                </div>
                <p className="text-stone-600 text-[11px] font-mono break-all leading-relaxed">
                  SHA-256 anchored on SensorTrustProvenance.sol (Local EVM 31337) by relayer {selectedObs.provenance.anchoredBy.substring(0, 10)}...
                </p>
              </div>

              {/* Event 4: Review Decisions if any */}
              {selectedObs.reviewHistory.map((rev, i) => (
                <div key={i} className="relative space-y-1 text-xs">
                  <div className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-purple-600 ring-4 ring-white" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">
                      4.{i + 1} Reviewer Verdict: {rev.decision}
                    </span>
                    <span className="text-stone-500 font-mono text-[10px]">
                      {new Date(rev.timestampDecided).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-stone-700 text-[11px] italic bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                    "{rev.reason}"
                  </p>
                  <div className="text-[10px] text-stone-500 font-mono">
                    Reviewer: {rev.reviewerId}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tamper Verification Playground */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100">
              <div>
                <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-700 text-base">security</span>
                  <span>Independent Cryptographic Tamper-Verification Panel</span>
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Recomputes the RFC 8785 canonical SHA-256 hash from candidate payload and checks against immutable record.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTamperValue}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-950 text-xs font-medium border border-rose-300 transition flex items-center gap-1 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-sm text-rose-700">edit</span>
                  <span>Tamper Value (+0.1)</span>
                </button>

                {tampered && (
                  <button
                    type="button"
                    onClick={handleResetPayload}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium border border-stone-300 transition"
                  >
                    Reset
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleVerifyCandidate}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white text-xs font-medium transition flex items-center gap-1.5 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-600"
                  title="Verify SHA-256 byte canonicalization locally"
                >
                  <span className="material-symbols-outlined text-sm">fact_check</span>
                  <span>Verify Digest</span>
                </button>

                <button
                  type="button"
                  onClick={handleVerifyOnChain}
                  disabled={verifyingOnChain}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium transition flex items-center gap-1.5 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50"
                  title="Query the deployed Solidity smart contract via eth_call"
                >
                  {verifyingOnChain ? (
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">token</span>
                  )}
                  <span>Verify On-Chain (EVM)</span>
                </button>
              </div>
            </div>

            {/* Verification Result Feedback */}
            {verificationResult && (
              <div
                role="region"
                aria-label="Tamper verification result"
                className={`p-4 rounded-xl border text-xs space-y-2.5 shadow-2xs ${
                  verificationResult.isMatched
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50/90 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-bold text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-lg ${verificationResult.isMatched ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {verificationResult.isMatched ? 'verified' : 'gpp_bad'}
                    </span>
                    <span>
                      {verificationResult.isMatched
                        ? 'Verification Succeeded: Data Untampered'
                        : 'Verification Failed: Data Mismatch Detected'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-current font-bold self-start sm:self-auto">
                    Level: {verificationResult.verificationLevel}
                  </span>
                </div>
                <p className="leading-relaxed text-xs">{verificationResult.explanation}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-current/20 font-mono text-[11px]">
                  <div className="p-2 rounded bg-white/70 border border-current/15">
                    <span className="text-[10px] text-stone-500 font-sans uppercase font-bold block">Candidate SHA-256:</span>
                    <CopyDigest value={verificationResult.recomputedDigest} />
                  </div>
                  <div className="p-2 rounded bg-white/70 border border-current/15">
                    <span className="text-[10px] text-stone-500 font-sans uppercase font-bold block">On-Chain Digest:</span>
                    <CopyDigest value={verificationResult.onChainDigest} />
                  </div>
                </div>
              </div>
            )}

            {/* JSON syntax error banner */}
            {jsonError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-rose-600 text-base shrink-0">error</span>
                <span className="font-mono">{jsonError}</span>
              </div>
            )}

            {/* Candidate JSON Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-600 font-mono">
                <span>Candidate JSON Payload (RFC 8785 Canonical Source)</span>
                {tampered && (
                  <span className="text-rose-700 font-bold flex items-center gap-1 text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    <span className="material-symbols-outlined text-xs">warning</span>
                    Tampered (+0.1 µg/m³)
                  </span>
                )}
              </div>
              <textarea
                rows={10}
                value={candidateJson}
                onChange={(e) => {
                  setCandidateJson(e.target.value);
                  setVerificationResult(null);
                }}
                className="w-full p-3.5 rounded-xl border border-stone-200 bg-stone-900 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-600 resize-y shadow-2xs selection:bg-emerald-800"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
