import React, { useState, useEffect } from 'react';
import { sensorTrustApi } from '../services/api.ts';
import {
  EnrichedObservation,
  VerificationResponse
} from '../core/contracts.ts';
import { StatusBadge, SeverityBadge } from '../components/shared/StatusBadge.tsx';
import { SampleDataNotice } from '../components/shared/SampleDataNotice.tsx';
import { PageHeader } from '../components/shared/PageHeader.tsx';
import { CopyDigest } from '../components/shared/CopyDigest.tsx';

interface DetailsPageProps {
  observationId: string;
  onNavigate: (path: string) => void;
}

export const DetailsPage: React.FC<DetailsPageProps> = ({ observationId, onNavigate }) => {
  const [observation, setObservation] = useState<EnrichedObservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchObservation = async () => {
      setLoading(true);
      try {
        const obs = await sensorTrustApi.getObservationById(observationId);
        if (mounted) setObservation(obs);
      } catch (err) {
        console.error('Failed to load observation:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchObservation();
    return () => {
      mounted = false;
    };
  }, [observationId]);

  const handleVerify = async () => {
    if (!observation) return;
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await sensorTrustApi.verifyProvenance({
        observationId: observation.observation.observationId,
        candidatePayload: observation.observation
      });
      setVerificationResult(res);
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <span className="material-symbols-outlined text-4xl animate-spin text-emerald-700">
          progress_activity
        </span>
        <p className="text-sm text-stone-500">Retrieving observation record &amp; audit history...</p>
      </div>
    );
  }

  if (!observation) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-12 text-center space-y-4 max-w-lg mx-auto shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <span className="material-symbols-outlined text-2xl">search_off</span>
        </div>
        <div>
          <h3 className="text-base font-bold text-stone-900">Observation Not Found</h3>
          <p className="text-xs text-stone-500 mt-1 font-mono break-all">
            No record matches ID: {observationId}
          </p>
        </div>
        <button
          onClick={() => onNavigate('/')}
          className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { observation: payload, validation, anomaly, provenance, reviewHistory, status } = observation;

  return (
    <div className="space-y-6">
      <SampleDataNotice />

      {/* Page Header with Breadcrumbs & Action Buttons */}
      <PageHeader
        title={payload.sensorId}
        subtitle={`Observation ID: ${payload.observationId}`}
        icon="analytics"
        iconColor="text-emerald-700"
        badge={{
          text: payload.location.zoneId,
          variant: 'neutral'
        }}
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => onNavigate('/') },
          { label: 'Observations', onClick: () => onNavigate('/') },
          { label: payload.sensorId }
        ]}
        actions={
          <div className="flex items-center gap-2">
            {status === 'FLAGGED' && (
              <button
                onClick={() => onNavigate('/reviewer/queue')}
                className="px-3 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-medium flex items-center gap-1.5 transition border border-amber-300 shadow-2xs"
              >
                <span className="material-symbols-outlined text-sm text-amber-700">rate_review</span>
                <span>Open in Review Queue</span>
              </button>
            )}
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-medium shadow-xs transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              {verifying ? (
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm">verified</span>
              )}
              <span>Verify Cryptographic Digest</span>
            </button>
          </div>
        }
      />

      {/* Verification Result Banner (if triggered) */}
      {verificationResult && (
        <div
          role="region"
          aria-label="Verification result"
          className={`rounded-xl border p-4 sm:p-5 text-xs space-y-3 transition shadow-xs ${
            verificationResult.isMatched
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
              : 'bg-rose-50/90 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-semibold">
            <span className="flex items-center gap-2 text-sm sm:text-base">
              <span className={`material-symbols-outlined text-lg ${verificationResult.isMatched ? 'text-emerald-700' : 'text-rose-700'}`}>
                {verificationResult.isMatched ? 'verified' : 'gpp_bad'}
              </span>
              <span>
                {verificationResult.isMatched
                  ? 'Cryptographic Provenance Match Confirmed'
                  : 'Digest Mismatch Detected'}
              </span>
            </span>
            <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-white border border-current self-start sm:self-auto font-bold">
              {verificationResult.verificationLevel}
            </span>
          </div>

          <p className="leading-relaxed text-xs sm:text-sm">
            {verificationResult.explanation}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-current/20 font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-white/70 border border-current/15 space-y-1">
              <span className="text-[10px] text-stone-500 font-sans uppercase font-bold block">Recomputed SHA-256 Digest:</span>
              <CopyDigest value={verificationResult.recomputedDigest} />
            </div>
            <div className="p-2.5 rounded-lg bg-white/70 border border-current/15 space-y-1">
              <span className="text-[10px] text-stone-500 font-sans uppercase font-bold block">On-Chain Recorded Digest:</span>
              <CopyDigest value={verificationResult.onChainDigest} />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Observation Summary & Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Core Measurement & Evidence */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Measurement Card */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">
                  PM2.5 Mass Concentration
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold font-mono text-stone-900 tabular-nums">
                    {payload.value.toFixed(1)}
                  </span>
                  <span className="text-stone-500 font-mono text-base font-semibold">{payload.unit}</span>
                </div>
              </div>

              <div className="sm:text-right space-y-2 self-start sm:self-auto">
                <StatusBadge status={status} size="md" />
                <div className="text-[11px] text-stone-500 font-mono">
                  Station: <span className="font-semibold text-stone-800">{payload.sensorId}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-4 border-t border-stone-100 text-xs">
              <div>
                <span className="text-stone-400 block text-[11px] font-medium">Observed Time (UTC)</span>
                <span className="font-mono text-stone-800 text-[11px] font-semibold">
                  {new Date(payload.timestampObserved).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px] font-medium">Basin Zone</span>
                <span className="font-semibold text-stone-800">{payload.location.zoneId}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px] font-medium">Grid Coordinates</span>
                <span className="font-mono text-stone-800 text-[11px]">
                  {payload.location.gridLat}, {payload.location.gridLon}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px] font-medium">Calibration Status</span>
                <span className="font-mono text-stone-800 text-[11px]">
                  {payload.sensorMetadata.calibrationStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Validation Checklist Card */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-stone-100">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-700 text-base">fact_check</span>
                <span>Deterministic Validation Gates</span>
              </h2>
              <span className="text-[11px] font-mono text-stone-500">
                Validated at {new Date(validation.validatedAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-stone-50 border border-stone-200/80">
                <span
                  className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${
                    validation.checks.schemaValid ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {validation.checks.schemaValid ? 'check_circle' : 'cancel'}
                </span>
                <div>
                  <span className="font-semibold text-stone-900 block">Schema Integrity</span>
                  <span className="text-[11px] text-stone-500">Required fields &amp; ISO 8601 formatting</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-stone-50 border border-stone-200/80">
                <span
                  className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${
                    validation.checks.rangeValid ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {validation.checks.rangeValid ? 'check_circle' : 'cancel'}
                </span>
                <div>
                  <span className="font-semibold text-stone-900 block">Physical Range Gate</span>
                  <span className="text-[11px] text-stone-500">0.0 to 1000.0 µg/m³ bounds</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-stone-50 border border-stone-200/80">
                <span
                  className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${
                    validation.checks.timestampFresh ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {validation.checks.timestampFresh ? 'check_circle' : 'cancel'}
                </span>
                <div>
                  <span className="font-semibold text-stone-900 block">Timestamp Freshness</span>
                  <span className="text-[11px] text-stone-500">Clock drift tolerance &lt; 5m, age &lt; 24h</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-stone-50 border border-stone-200/80">
                <span
                  className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${
                    !validation.checks.duplicateDetected ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {!validation.checks.duplicateDetected ? 'check_circle' : 'cancel'}
                </span>
                <div>
                  <span className="font-semibold text-stone-900 block">Duplicate Check</span>
                  <span className="text-[11px] text-stone-500">Unique observation ID &amp; sensor timestep</span>
                </div>
              </div>
            </div>
          </div>

          {/* Explainable Anomaly Screening Evidence */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-700 text-base">psychology</span>
                <span>Anomaly Screening &amp; Evidence</span>
              </h2>
              <SeverityBadge severity={anomaly.severity} />
            </div>

            <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3.5 rounded-lg border border-stone-200">
              {anomaly.explanation}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs pt-1">
              {anomaly.evidence.deltaRateOfChange && (
                <div className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/60 space-y-2">
                  <span className="font-semibold text-stone-900 block text-xs">Rate-of-Change Analysis</span>
                  <div className="text-stone-600 space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Delta Value:</span>
                      <span className="font-bold text-stone-800">+{anomaly.evidence.deltaRateOfChange.deltaUgPerM3} µg/m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Observation Window:</span>
                      <span>{anomaly.evidence.deltaRateOfChange.timeDeltaMinutes} mins</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Rate of Rise:</span>
                      <span className="font-bold text-amber-800">{anomaly.evidence.deltaRateOfChange.ratePerMinute} µg/m³/min</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/60 space-y-2">
                <span className="font-semibold text-stone-900 block text-xs">Spatial Peer Comparison</span>
                {anomaly.evidence.spatialPeerComparison?.hasContextualData ? (
                  <div className="text-stone-600 space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Active Peer Stations:</span>
                      <span className="font-bold text-stone-800">{anomaly.evidence.spatialPeerComparison.peerCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Peer Spatial Mean:</span>
                      <span>{anomaly.evidence.spatialPeerComparison.peerMean} µg/m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Relative Z-Score:</span>
                      <span className="font-bold text-stone-900">{anomaly.evidence.spatialPeerComparison.zScore} σ</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-amber-800 text-[11px] leading-relaxed italic bg-amber-50/60 p-2.5 rounded border border-amber-200">
                    No neighboring sensors in active 0.01° grid. Acknowledged as insufficient peer context rather than assumed nominal.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Provenance & Review History */}
        <div className="space-y-6">
          {/* Blockchain Provenance Card */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-indigo-700 text-base">token</span>
                <span>EVM Provenance</span>
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono border font-bold ${
                  provenance.status === 'CONFIRMED'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : provenance.status === 'NOT_ANCHORED'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : provenance.status === 'FAILED'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-stone-50 text-stone-700 border-stone-300'
                }`}
              >
                {provenance.status}
              </span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-[10px] text-stone-500 block uppercase font-bold">Canonical Digest (SHA-256)</span>
                <CopyDigest value={provenance.observationDigest} truncateLength={20} />
              </div>

              {provenance.status === 'CONFIRMED' ? (
                <>
                  <div className="space-y-1">
                    <span className="text-[10px] text-stone-500 block uppercase font-bold">Hardhat EVM Block</span>
                    <span className="text-stone-900 text-xs font-bold">Block #{provenance.blockNumber ?? 'Mined'}</span>
                  </div>

                  {provenance.txHash && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-stone-500 block uppercase font-bold">Transaction Hash</span>
                      <CopyDigest value={provenance.txHash} truncateLength={18} />
                    </div>
                  )}

                  {provenance.blockTimestamp && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-stone-500 block uppercase font-bold">Mined Timestamp</span>
                      <span className="text-stone-700 text-[11px]">
                        {new Date(provenance.blockTimestamp).toLocaleString()}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-stone-600 text-[11px] leading-relaxed">
                  {provenance.status === 'NOT_ANCHORED' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                        <span className="material-symbols-outlined text-sm">info</span>
                        <span>Database Integrity Verified</span>
                      </div>
                      <p>Observation payload is verified at the database integrity level (RFC 8785 canonical hash). EVM on-chain anchoring was not executed or node was offline.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-rose-800">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        <span>Anchoring Reverted / Failed</span>
                      </div>
                      <p>Blockchain transaction execution encountered an error or was reverted by the smart contract.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Accountable Review History Card */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-purple-700 text-base">history_edu</span>
                <span>Review &amp; Audit Trail</span>
              </h2>
              <span className="text-[10px] font-mono text-stone-400">
                {reviewHistory.length} Recorded
              </span>
            </div>

            {reviewHistory.length === 0 ? (
              <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 text-center text-xs text-stone-500">
                No human review actions recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewHistory.map((rev, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 font-mono">{rev.decision}</span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        {new Date(rev.timestampDecided).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-stone-700 text-xs leading-relaxed italic bg-white p-2.5 rounded border border-stone-200/80">
                      "{rev.reason}"
                    </p>
                    <div className="text-[10px] text-stone-500 font-mono pt-1 border-t border-stone-200 flex items-center justify-between">
                      <span>Reviewer:</span>
                      <CopyDigest value={rev.reviewerId} truncateLength={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
