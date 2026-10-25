import React, { useState, useEffect } from 'react';
import { sensorTrustApi } from '../services/api.ts';
import {
  EnrichedObservation,
  ReviewDecisionType,
  AnomalySeverity
} from '../core/contracts.ts';
import { StatusBadge, SeverityBadge } from '../components/shared/StatusBadge.tsx';
import { SampleDataNotice } from '../components/shared/SampleDataNotice.tsx';
import { PageHeader } from '../components/shared/PageHeader.tsx';
import { CopyDigest } from '../components/shared/CopyDigest.tsx';

interface ReviewerQueuePageProps {
  onNavigate: (path: string) => void;
}

export const ReviewerQueuePage: React.FC<ReviewerQueuePageProps> = ({ onNavigate }) => {
  const [queue, setQueue] = useState<EnrichedObservation[]>([]);
  const [selectedObsId, setSelectedObsId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  // Decision Form State
  const [selectedDecision, setSelectedDecision] = useState<ReviewDecisionType>(ReviewDecisionType.REJECT);
  const [justificationReason, setJustificationReason] = useState('');
  const [reviewerIdentity] = useState('reviewer:officer-auth0|certified');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadQueue = async (preferredId?: string | null) => {
    setLoading(true);
    try {
      const items = await sensorTrustApi.getReviewQueue({ severity: severityFilter });
      setQueue(items);

      if (items.length > 0) {
        const idToSelect = preferredId && items.some((i) => i.observation.observationId === preferredId)
          ? preferredId
          : items[0].observation.observationId;
        setSelectedObsId(idToSelect);
      } else {
        setSelectedObsId(null);
      }
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue(selectedObsId);
  }, [severityFilter]);

  const selectedObservation = queue.find(
    (o) => o.observation.observationId === selectedObsId
  );

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObservation) return;

    if (!justificationReason || justificationReason.trim().length < 10) {
      setDecisionFeedback({
        type: 'error',
        message: 'A mandatory justification reason of at least 10 characters is required for accountability.'
      });
      return;
    }

    setSubmittingDecision(true);
    setDecisionFeedback(null);

    try {
      const res = await sensorTrustApi.submitReviewDecision({
        observationId: selectedObservation.observation.observationId,
        decision: selectedDecision,
        reason: justificationReason.trim(),
        reviewerId: reviewerIdentity
      });

      const txPreview = res.blockchainTx?.txHash ? `Tx: ${res.blockchainTx.txHash.substring(0, 16)}...` : 'Database integrity verified';
      const blockPreview = res.blockchainTx?.blockNumber ? `(Block #${res.blockchainTx.blockNumber})` : '';
      setDecisionFeedback({
        type: 'success',
        message: `Decision successfully recorded and anchored! ${txPreview} ${blockPreview}`.trim()
      });

      // Clear justification reason and reload queue, advancing to next pending item
      setJustificationReason('');
      await loadQueue(null);
    } catch (err: any) {
      setDecisionFeedback({
        type: 'error',
        message: err.message || 'Failed to submit review decision.'
      });
    } finally {
      setSubmittingDecision(false);
    }
  };

  const isFormValid = justificationReason.trim().length >= 10;

  return (
    <div className="space-y-6">
      <SampleDataNotice />

      {/* Page Header */}
      <PageHeader
        title="Reviewer Workspace"
        subtitle="Operational triage queue for authorized environmental officers to investigate anomalies and record accountable verdicts."
        icon="rate_review"
        iconColor="text-amber-700"
        badge={{
          text: `${queue.length} Pending Ingestion Triage`,
          variant: queue.length > 0 ? 'amber' : 'emerald'
        }}
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => onNavigate('/') },
          { label: 'Reviewer Workspace' }
        ]}
        actions={
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider font-mono mr-1">
              Filter:
            </span>
            {(['ALL', AnomalySeverity.CRITICAL, AnomalySeverity.HIGH, AnomalySeverity.MEDIUM] as const).map(
              (sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                    severityFilter === sev
                      ? 'bg-stone-900 text-white shadow-xs font-semibold'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  {sev === 'ALL' ? 'All' : sev}
                </button>
              )
            )}
          </div>
        }
      />

      {/* Reviewer Simulation Auth Disclaimer Banner */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg px-3.5 py-2 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-700 text-base">badge</span>
          <span>
            <strong>Simulation Mode:</strong> Authenticated as authorized officer (
            <code className="bg-amber-100 px-1 py-0.2 rounded font-mono text-[11px] text-amber-900">
              {reviewerIdentity}
            </code>
            ). Antigravity will enforce JWT / RBAC permissions.
          </span>
        </div>
        <span className="text-[10px] font-mono text-amber-800 font-semibold uppercase tracking-wider">
          Auditable Ledger Mode
        </span>
      </div>

      {/* Main Split-View: Queue List on Left, Active Investigation on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Flagged Queue List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-stone-600 px-1">
            <span className="font-semibold uppercase tracking-wider">Flagged Observations Queue</span>
            <span className="font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
              {queue.length} Pending
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-stone-500 bg-white rounded-xl border border-stone-200">
              <span className="material-symbols-outlined text-2xl animate-spin text-emerald-700">
                progress_activity
              </span>
              <p className="text-xs mt-2">Loading queue telemetry...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-8 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
                <span className="material-symbols-outlined text-2xl">task_alt</span>
              </div>
              <h4 className="text-sm font-semibold text-stone-900">Review Queue is Clear</h4>
              <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
                No observations currently pending reviewer investigation. All anomalies have been audited.
              </p>
              <button
                onClick={() => onNavigate('/')}
                className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {queue.map((obs) => {
                const isSelected = obs.observation.observationId === selectedObsId;
                return (
                  <button
                    key={obs.observation.observationId}
                    onClick={() => {
                      setSelectedObsId(obs.observation.observationId);
                      setDecisionFeedback(null);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition shadow-2xs flex flex-col gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-700'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-900 text-xs truncate max-w-[180px]">
                        {obs.observation.sensorId}
                      </span>
                      <SeverityBadge severity={obs.anomaly.severity} />
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div className="font-mono text-base font-extrabold text-stone-900">
                        {obs.observation.value.toFixed(1)}{' '}
                        <span className="text-xs font-normal text-stone-500">µg/m³</span>
                      </div>
                      <span className="text-[11px] text-stone-500 font-mono">
                        {new Date(obs.observation.timestampObserved).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed bg-white/60 p-2 rounded border border-stone-200/50">
                      {obs.anomaly.explanation}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono pt-1 border-t border-stone-200/60">
                      <span>{obs.observation.location.zoneId}</span>
                      <span>Block #{obs.provenance.blockNumber}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Investigation & Decision Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {selectedObservation ? (
            <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 space-y-6 shadow-2xs">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-stone-900">
                      Station: {selectedObservation.observation.sensorId}
                    </h3>
                    <StatusBadge status={selectedObservation.status} size="sm" />
                  </div>
                  <div className="text-xs text-stone-500 font-mono flex items-center gap-1.5">
                    <span>UUID:</span>
                    <CopyDigest value={selectedObservation.observation.observationId} truncateLength={20} />
                  </div>
                </div>

                <button
                  onClick={() => onNavigate(`/observations/${selectedObservation.observation.observationId}`)}
                  className="text-xs text-emerald-800 font-medium hover:underline flex items-center gap-1 self-start sm:self-auto focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-700 rounded px-1"
                >
                  <span>Full Record Details</span>
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </button>
              </div>

              {/* Measurement & Anomaly Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
                <div className="space-y-1">
                  <span className="text-stone-500 text-[10px] uppercase font-mono block font-bold">Measurement</span>
                  <span className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
                    {selectedObservation.observation.value.toFixed(1)} µg/m³
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-stone-500 text-[10px] uppercase font-mono block font-bold">Anomaly Risk Score</span>
                  <span className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
                    {selectedObservation.anomaly.score.toFixed(2)} / 1.00
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-stone-500 text-[10px] uppercase font-mono block font-bold">Calibration State</span>
                  <span className="font-semibold text-stone-800 block text-xs mt-1">
                    {selectedObservation.observation.sensorMetadata.calibrationStatus}
                  </span>
                </div>
              </div>

              {/* Anomaly Explanation & Contextual Comparisons */}
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500 block">
                  Explainable Screening Evidence
                </span>
                <p className="text-xs text-stone-800 leading-relaxed bg-amber-50/70 p-3.5 rounded-lg border border-amber-200">
                  {selectedObservation.anomaly.explanation}
                </p>

                {selectedObservation.anomaly.evidence.spatialPeerComparison?.hasContextualData && (
                  <div className="text-[11px] text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span>
                      Regional Peer Cluster Mean:{' '}
                      <strong className="text-stone-900">{selectedObservation.anomaly.evidence.spatialPeerComparison.peerMean} µg/m³</strong>
                    </span>
                    <span>
                      Standard Deviation Divergence:{' '}
                      <strong className="text-stone-900">{selectedObservation.anomaly.evidence.spatialPeerComparison.zScore} σ</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Decision Feedback Banner */}
              {decisionFeedback && (
                <div
                  role="alert"
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border shadow-2xs ${
                    decisionFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg shrink-0">
                    {decisionFeedback.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span className="leading-relaxed">{decisionFeedback.message}</span>
                </div>
              )}

              {/* Decision Action Form */}
              <form onSubmit={handleDecisionSubmit} className="space-y-5 pt-4 border-t border-stone-200">
                <div className="space-y-2.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-700">
                    Reviewer Decision *
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedDecision(ReviewDecisionType.APPROVE)}
                      className={`p-3 rounded-xl border text-xs font-medium transition flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                        selectedDecision === ReviewDecisionType.APPROVE
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-700 font-bold shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg text-emerald-700">check_circle</span>
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDecision(ReviewDecisionType.REJECT)}
                      className={`p-3 rounded-xl border text-xs font-medium transition flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 ${
                        selectedDecision === ReviewDecisionType.REJECT
                          ? 'border-rose-700 bg-rose-50 text-rose-950 ring-1 ring-rose-700 font-bold shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg text-rose-700">cancel</span>
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDecision(ReviewDecisionType.REQUEST_RECALIBRATION)}
                      className={`p-3 rounded-xl border text-xs font-medium transition flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 ${
                        selectedDecision === ReviewDecisionType.REQUEST_RECALIBRATION
                          ? 'border-purple-700 bg-purple-50 text-purple-950 ring-1 ring-purple-700 font-bold shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg text-purple-700">build_circle</span>
                      <span>Recalibrate</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-stone-800">
                      Accountable Justification Reason *
                    </label>
                    <span
                      className={`text-[11px] font-mono font-medium ${
                        isFormValid ? 'text-emerald-800' : 'text-amber-800'
                      }`}
                    >
                      {isFormValid
                        ? `✓ ${justificationReason.trim().length} chars (ready to anchor)`
                        : `${justificationReason.trim().length} / 10 chars minimum`}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={justificationReason}
                    onChange={(e) => setJustificationReason(e.target.value)}
                    placeholder="Provide evidence-based justification for this decision (e.g. 'Physical inspection confirms faulty optical chamber; unshielded sensor siting violating standards.')..."
                    className={`w-full p-3 rounded-xl border text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 shadow-2xs ${
                      isFormValid
                        ? 'border-emerald-500 focus:border-emerald-600 focus:ring-emerald-600'
                        : 'border-stone-200 focus:border-stone-400 focus:ring-stone-400'
                    }`}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-stone-500 font-mono truncate max-w-[280px]">
                    Actor: {reviewerIdentity} <span className="text-stone-400 font-sans text-[10px]">(Prototype Session)</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingDecision || !isFormValid}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  >
                    {submittingDecision ? (
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-sm">gavel</span>
                    )}
                    <span>Record &amp; Anchor Decision</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 space-y-2">
              <span className="material-symbols-outlined text-3xl text-stone-300">touch_app</span>
              <p className="text-xs">Select an observation from the queue to review evidence.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
