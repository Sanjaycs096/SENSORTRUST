/**
 * SensorTrust — Explainable Anomaly Screening Service
 * Core principles:
 * 1. AI assists human decisions, does not issue automatic bans.
 * 2. Transparent rule baselines first; missing context is acknowledged, not fabricated.
 * 3. Anomaly scores are normalized indicators (0..1), not fake probability percentages.
 */

import {
  ObservationPayload,
  AnomalyAssessment,
  AnomalySeverity,
  CalibrationStatus
} from './contracts.ts';

export interface HistoricalSensorPoint {
  value: number;
  timestamp: string;
}

export interface PeerSensorPoint {
  sensorId: string;
  value: number;
  distanceKm: number;
}

export interface AnomalyScreeningInput {
  current: ObservationPayload;
  historyForSensor: HistoricalSensorPoint[]; // ordered chronologically leading up to this observation
  spatialPeers: PeerSensorPoint[];           // simultaneous readings in local geographic cluster
}

export function screenObservationAnomalies(input: AnomalyScreeningInput): AnomalyAssessment {
  const { current, historyForSensor, spatialPeers } = input;
  const reasonCodes: string[] = [];
  const explanationParts: string[] = [];
  let riskScore = 0.0;

  // Evidence container
  const evidence: AnomalyAssessment['evidence'] = {};

  // 1. Rate of Change Screening (Spike / Step-Jump)
  if (historyForSensor.length > 0) {
    const previous = historyForSensor[historyForSensor.length - 1];
    const prevTime = new Date(previous.timestamp).getTime();
    const currTime = new Date(current.timestampObserved).getTime();
    const deltaMinutes = Math.max(0.1, (currTime - prevTime) / (60 * 1000));
    const deltaValue = Math.abs(current.value - previous.value);
    const ratePerMin = deltaValue / deltaMinutes;

    const thresholdExceeded = deltaMinutes <= 30 && deltaValue > 40.0;
    evidence.deltaRateOfChange = {
      previousValue: previous.value,
      deltaUgPerM3: Number(deltaValue.toFixed(2)),
      timeDeltaMinutes: Number(deltaMinutes.toFixed(1)),
      ratePerMinute: Number(ratePerMin.toFixed(2)),
      thresholdExceeded
    };

    if (thresholdExceeded) {
      riskScore += 0.45;
      reasonCodes.push('ANOMALY_RAPID_SPIKE');
      explanationParts.push(
        `Sudden PM2.5 delta of +${deltaValue.toFixed(1)} ug/m3 in ${deltaMinutes.toFixed(1)} minutes (rate: ${ratePerMin.toFixed(2)} ug/m3/min).`
      );
    }
  }

  // 2. Stuck Sensor Screening (Flatline detection)
  if (historyForSensor.length >= 5) {
    const recent5 = historyForSensor.slice(-5);
    const allIdentical = recent5.every((pt) => Math.abs(pt.value - current.value) < 0.001);
    if (allIdentical) {
      const durationMin = (new Date(current.timestampObserved).getTime() - new Date(recent5[0].timestamp).getTime()) / (60 * 1000);
      evidence.stuckSensorReading = {
        consecutiveIdenticalCount: recent5.length + 1,
        durationMinutes: Math.round(durationMin)
      };
      riskScore += 0.50;
      reasonCodes.push('ANOMALY_STUCK_SENSOR');
      explanationParts.push(
        `Sensor has reported exactly identical value (${current.value} ug/m3) for ${recent5.length + 1} consecutive cycles (${Math.round(durationMin)} mins).`
      );
    }
  }

  // 3. Spatial Peer Comparison
  if (spatialPeers.length >= 2) {
    const peerValues = spatialPeers.map((p) => p.value);
    const peerMean = peerValues.reduce((acc, v) => acc + v, 0) / peerValues.length;
    const variance = peerValues.reduce((acc, v) => acc + Math.pow(v - peerMean, 2), 0) / peerValues.length;
    const peerStdDev = Math.max(1.0, Math.sqrt(variance)); // prevent divide by zero
    const zScore = (current.value - peerMean) / peerStdDev;

    evidence.spatialPeerComparison = {
      peerCount: spatialPeers.length,
      peerMean: Number(peerMean.toFixed(2)),
      peerStdDev: Number(peerStdDev.toFixed(2)),
      zScore: Number(zScore.toFixed(2)),
      hasContextualData: true
    };

    if (Math.abs(zScore) >= 3.0) {
      riskScore += 0.40;
      reasonCodes.push('ANOMALY_SPATIAL_DIVERGENCE');
      explanationParts.push(
        `Value deviates by ${zScore.toFixed(2)} standard deviations from ${spatialPeers.length} localized peers (Cluster Mean: ${peerMean.toFixed(1)} ug/m3).`
      );
    }
  } else {
    // Acknowledge absence of peer context instead of inventing it
    evidence.spatialPeerComparison = {
      peerCount: spatialPeers.length,
      peerMean: 0,
      peerStdDev: 0,
      zScore: 0,
      hasContextualData: false
    };
    reasonCodes.push('INFO_INSUFFICIENT_PEER_CONTEXT');
  }

  // 4. Calibration Status Penalty Factor
  if (current.sensorMetadata.calibrationStatus === CalibrationStatus.EXPIRED) {
    riskScore += 0.15;
    reasonCodes.push('WARN_CALIBRATION_EXPIRED');
    explanationParts.push('Sensor calibration certificate is expired.');
  } else if (current.sensorMetadata.calibrationStatus === CalibrationStatus.UNKNOWN) {
    riskScore += 0.05;
    reasonCodes.push('INFO_CALIBRATION_UNKNOWN');
  }

  // Clamp score
  riskScore = Math.min(1.0, Math.max(0.0, Number(riskScore.toFixed(2))));

  // Determine Severity
  let severity: AnomalySeverity = AnomalySeverity.NORMAL;
  if (riskScore >= 0.75) {
    severity = AnomalySeverity.CRITICAL;
  } else if (riskScore >= 0.50) {
    severity = AnomalySeverity.HIGH;
  } else if (riskScore >= 0.25) {
    severity = AnomalySeverity.MEDIUM;
  } else if (riskScore > 0.0) {
    severity = AnomalySeverity.LOW;
  }

  const flaggedForReview = riskScore >= 0.35 || reasonCodes.includes('ANOMALY_RAPID_SPIKE') || reasonCodes.includes('ANOMALY_STUCK_SENSOR');

  const finalExplanation = explanationParts.length > 0
    ? explanationParts.join(' ')
    : 'Observation is within normal nominal bounds; no anomalous spatial or temporal patterns detected.';

  return {
    score: riskScore,
    severity,
    reasonCodes,
    explanation: finalExplanation,
    evidence,
    flaggedForReview
  };
}
