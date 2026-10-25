import React, { useState } from 'react';
import { screenObservationAnomalies } from '../core/anomaly.ts';
import { SAMPLE_OBSERVATION_SPIKE } from '../data/mockData.ts';
import { CalibrationStatus } from '../core/contracts.ts';

export const AiQualityView: React.FC = () => {
  const [testValue, setTestValue] = useState<number>(284.6);
  const [prevValue, setPrevValue] = useState<number>(32.0);
  const [deltaMinutes, setDeltaMinutes] = useState<number>(10);
  const [peerCount, setPeerCount] = useState<number>(4);
  const [peerMean, setPeerMean] = useState<number>(31.5);
  const [calibration, setCalibration] = useState<CalibrationStatus>(CalibrationStatus.FACTORY_CALIBRATED);

  // Compute live anomaly score
  const dynamicAssessment = React.useMemo(() => {
    const obs = {
      ...SAMPLE_OBSERVATION_SPIKE,
      value: testValue,
      sensorMetadata: {
        ...SAMPLE_OBSERVATION_SPIKE.sensorMetadata,
        calibrationStatus: calibration
      }
    };

    const history = [
      {
        value: prevValue,
        timestamp: new Date(Date.now() - deltaMinutes * 60 * 1000).toISOString()
      }
    ];

    const peers = Array.from({ length: peerCount }, (_, i) => ({
      sensorId: `peer-${i + 1}`,
      value: peerMean + (i % 2 === 0 ? 1.5 : -1.5),
      distanceKm: 0.8 + i * 0.2
    }));

    return screenObservationAnomalies({
      current: obs,
      historyForSensor: history,
      spatialPeers: peers
    });
  }, [testValue, prevValue, deltaMinutes, peerCount, peerMean, calibration]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400">psychology</span>
          Explainable Multi-Tier Anomaly Screening Pipeline
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          SensorTrust combines deterministic physical boundary checks with explainable heuristic screening. Anomaly scores (0.0 to 1.0) represent normalized deviation indexes—never arbitrary black-box probabilities. When neighboring peer sensor data is absent, the engine explicitly acknowledges missing context instead of inventing it.
        </p>
      </div>

      {/* 5 Distinct States Definition */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-3.5 space-y-1">
          <div className="font-mono font-bold text-rose-400">1. Invalid Observation</div>
          <p className="text-slate-400 text-[11px]">
            Violates schema or physical laws (e.g. negative PM2.5 or &gt;1000 ug/m3). Rejected before anomaly screening.
          </p>
        </div>

        <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3.5 space-y-1">
          <div className="font-mono font-bold text-amber-400">2. Potential Anomaly</div>
          <p className="text-slate-400 text-[11px]">
            Physically possible but exhibits rapid delta spike, flatline, or peer divergence. Enqueued for review.
          </p>
        </div>

        <div className="rounded-lg border border-blue-900/40 bg-blue-950/20 p-3.5 space-y-1">
          <div className="font-mono font-bold text-blue-400">3. Insufficient Context</div>
          <p className="text-slate-400 text-[11px]">
            Sensor lacks spatial neighbors. Flagged with `INFO_INSUFFICIENT_PEER_CONTEXT` rather than assumed valid.
          </p>
        </div>

        <div className="rounded-lg border border-purple-900/40 bg-purple-950/20 p-3.5 space-y-1">
          <div className="font-mono font-bold text-purple-400">4. Human Rejection</div>
          <p className="text-slate-400 text-[11px]">
            Authorized reviewer examines evidence and rejects reading with mandatory justification reason.
          </p>
        </div>

        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3.5 space-y-1">
          <div className="font-mono font-bold text-emerald-400">5. Human Approval</div>
          <p className="text-slate-400 text-[11px]">
            Reviewer confirms reading corresponds to a localized physical event (e.g. verified biomass smoke plume).
          </p>
        </div>
      </div>

      {/* Interactive Anomaly Screener Simulator */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 space-y-6">
        <div>
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400">tune</span>
            Live Anomaly Screener Simulator
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Adjust measurement parameters below to see instantaneous explainable risk scoring, reason codes, and evidence generation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Current Value (ug/m3)</label>
                <input
                  type="number"
                  value={testValue}
                  onChange={(e) => setTestValue(Number(e.target.value))}
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Previous Value (ug/m3)</label>
                <input
                  type="number"
                  value={prevValue}
                  onChange={(e) => setPrevValue(Number(e.target.value))}
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Delta Window (Minutes)</label>
                <input
                  type="number"
                  value={deltaMinutes}
                  onChange={(e) => setDeltaMinutes(Number(e.target.value))}
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Spatial Peer Count</label>
                <input
                  type="number"
                  value={peerCount}
                  onChange={(e) => setPeerCount(Number(e.target.value))}
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Spatial Peer Mean (ug/m3)</label>
                <input
                  type="number"
                  value={peerMean}
                  onChange={(e) => setPeerMean(Number(e.target.value))}
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Calibration Status</label>
                <select
                  value={calibration}
                  onChange={(e) => setCalibration(e.target.value as any)}
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                >
                  <option value={CalibrationStatus.FACTORY_CALIBRATED}>FACTORY_CALIBRATED</option>
                  <option value={CalibrationStatus.CO_LOCATED_VERIFIED}>CO_LOCATED_VERIFIED</option>
                  <option value={CalibrationStatus.EXPIRED}>EXPIRED (Penalty Factor)</option>
                  <option value={CalibrationStatus.UNKNOWN}>UNKNOWN</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Card */}
          <div className="lg:col-span-6 rounded-lg border border-slate-800 bg-slate-950/80 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-mono text-slate-400">Risk Assessment Output</span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                  dynamicAssessment.severity === 'CRITICAL' || dynamicAssessment.severity === 'HIGH'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : dynamicAssessment.severity === 'MEDIUM'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                Severity: {dynamicAssessment.severity}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-extrabold font-mono text-white">
                {dynamicAssessment.score.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400">
                Normalized Score (Threshold for Review Queue: &gt;= 0.35)
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-400">Reason Codes:</div>
              <div className="flex flex-wrap gap-1.5">
                {dynamicAssessment.reasonCodes.length > 0 ? (
                  dynamicAssessment.reasonCodes.map((rc, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[11px] font-mono border border-slate-700"
                    >
                      {rc}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No anomaly triggers fired</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-400">Plain-English Rationale:</div>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-2.5 rounded border border-slate-800">
                {dynamicAssessment.explanation}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Model Benchmark & Confusion Matrix */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div>
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">analytics</span>
            Benchmarking &amp; Evaluation Strategy (Phase 3 ML Enhancement)
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Target performance metrics for lightweight Isolation Forest screening trained on 10,000 labeled test cycles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <div className="text-2xl font-bold font-mono text-emerald-400">&ge; 92.0%</div>
            <div className="text-xs text-slate-400 mt-1">Recall (True Fault Sensitivity)</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <div className="text-2xl font-bold font-mono text-cyan-400">&ge; 88.0%</div>
            <div className="text-xs text-slate-400 mt-1">Precision (False Alarm Avoidance)</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <div className="text-2xl font-bold font-mono text-amber-400">&le; 6.0%</div>
            <div className="text-xs text-slate-400 mt-1">False Positive Rate (FPR)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
