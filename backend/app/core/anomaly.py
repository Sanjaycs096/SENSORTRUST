"""
SensorTrust — Explainable Anomaly Screening Service
Multi-tier heuristic screening for rate-of-change spikes, stuck flatline sensor faults,
spatial neighbor divergence, and calibration penalty factors.
Ported from and functionally identical to TypeScript src/core/anomaly.ts.
"""

import math
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.schemas.observation import (
    AnomalyAssessment,
    AnomalySeverity,
    AnomalyEvidence,
    DeltaRateEvidence,
    StuckSensorEvidence,
    SpatialPeerEvidence,
    CalibrationStatus
)
from app.core.validation import parse_iso8601_utc


class HistoricalReading:
    def __init__(self, value: float, timestamp: str):
        self.value = value
        self.timestamp = timestamp


class PeerReading:
    def __init__(self, sensor_id: str, value: float, distance_km: float = 1.2):
        self.sensor_id = sensor_id
        self.value = value
        self.distance_km = distance_km


def screen_anomalies(
    current_value: float,
    current_timestamp: str,
    calibration_status: str,
    history: List[HistoricalReading],
    spatial_peers: List[PeerReading]
) -> AnomalyAssessment:
    """
    Executes explainable multi-tier anomaly screening.
    Ensures missing context (e.g., absence of local peer sensors) is transparently acknowledged.
    """
    reason_codes: List[str] = []
    explanation_parts: List[str] = []
    risk_score = 0.0

    delta_rate_evidence: Optional[DeltaRateEvidence] = None
    stuck_evidence: Optional[StuckSensorEvidence] = None
    spatial_evidence: Optional[SpatialPeerEvidence] = None

    curr_dt = parse_iso8601_utc(current_timestamp)
    curr_epoch_ms = (curr_dt.timestamp() * 1000) if curr_dt else 0.0

    # 1. Rate of Change Screening (Spike / Step-Jump)
    if history:
        previous = history[-1]
        prev_dt = parse_iso8601_utc(previous.timestamp)
        prev_epoch_ms = (prev_dt.timestamp() * 1000) if prev_dt else 0.0

        delta_ms = max(6000.0, curr_epoch_ms - prev_epoch_ms)
        delta_minutes = max(0.1, delta_ms / (60.0 * 1000.0))
        delta_value = abs(current_value - previous.value)
        rate_per_min = delta_value / delta_minutes

        threshold_exceeded = (delta_minutes <= 30.0) and (delta_value > 40.0)

        delta_rate_evidence = DeltaRateEvidence(
            previousValue=round(previous.value, 2),
            deltaUgPerM3=round(delta_value, 2),
            timeDeltaMinutes=round(delta_minutes, 1),
            ratePerMinute=round(rate_per_min, 2),
            thresholdExceeded=threshold_exceeded
        )

        if threshold_exceeded:
            risk_score += 0.45
            reason_codes.append("ANOMALY_RAPID_SPIKE")
            explanation_parts.append(
                f"Sudden PM2.5 delta of +{delta_value:.1f} ug/m3 in {delta_minutes:.1f} minutes "
                f"(rate: {rate_per_min:.2f} ug/m3/min)."
            )

    # 2. Stuck Sensor Screening (Flatline detection)
    if len(history) >= 5:
        recent5 = history[-5:]
        all_identical = all(abs(pt.value - current_value) < 0.001 for pt in recent5)
        if all_identical:
            first_stuck_dt = parse_iso8601_utc(recent5[0].timestamp)
            first_stuck_ms = (first_stuck_dt.timestamp() * 1000) if first_stuck_dt else 0.0
            duration_min = max(0.0, (curr_epoch_ms - first_stuck_ms) / (60.0 * 1000.0))

            stuck_evidence = StuckSensorEvidence(
                consecutiveIdenticalCount=len(recent5) + 1,
                durationMinutes=int(round(duration_min))
            )
            risk_score += 0.50
            reason_codes.append("ANOMALY_STUCK_SENSOR")
            explanation_parts.append(
                f"Sensor has reported exactly identical value ({current_value} ug/m3) for "
                f"{len(recent5) + 1} consecutive cycles ({int(round(duration_min))} mins)."
            )

    # 3. Spatial Peer Comparison
    if len(spatial_peers) >= 2:
        peer_values = [p.value for p in spatial_peers]
        peer_mean = sum(peer_values) / len(peer_values)
        variance = sum((v - peer_mean) ** 2 for v in peer_values) / len(peer_values)
        peer_std_dev = max(1.0, math.sqrt(variance))
        z_score = (current_value - peer_mean) / peer_std_dev

        spatial_evidence = SpatialPeerEvidence(
            peerCount=len(spatial_peers),
            peerMean=round(peer_mean, 2),
            peerStdDev=round(peer_std_dev, 2),
            zScore=round(z_score, 2),
            hasContextualData=True
        )

        if abs(z_score) >= 3.0:
            risk_score += 0.40
            reason_codes.append("ANOMALY_SPATIAL_DIVERGENCE")
            explanation_parts.append(
                f"Value deviates by {z_score:.2f} standard deviations from {len(spatial_peers)} "
                f"localized peers (Cluster Mean: {peer_mean:.1f} ug/m3)."
            )
    else:
        # Acknowledge lack of peer context instead of fabricating peer data
        spatial_evidence = SpatialPeerEvidence(
            peerCount=len(spatial_peers),
            peerMean=0.0,
            peerStdDev=0.0,
            zScore=0.0,
            hasContextualData=False
        )
        reason_codes.append("INFO_INSUFFICIENT_PEER_CONTEXT")

    # 4. Elevated Concentration Screening (Hazardous Emergency Threshold)
    if current_value >= 200.0:
        risk_score += 0.40
        reason_codes.append("ANOMALY_ELEVATED_CONCENTRATION")
        explanation_parts.append(
            "Hazardous concentration threshold exceeded (level exceeds 200 ug/m3 emergency baseline)."
        )

    # 5. Calibration Status Penalty Factor
    if calibration_status == CalibrationStatus.EXPIRED.value:
        risk_score += 0.15
        reason_codes.append("WARN_CALIBRATION_EXPIRED")
        explanation_parts.append("Sensor calibration certificate is expired.")
    elif calibration_status == CalibrationStatus.UNKNOWN.value:
        risk_score += 0.05
        reason_codes.append("INFO_CALIBRATION_UNKNOWN")

    # Clamp risk score
    risk_score = min(1.0, max(0.0, round(risk_score, 2)))

    # Determine Severity tier
    if risk_score >= 0.75:
        severity = AnomalySeverity.CRITICAL
    elif risk_score >= 0.50:
        severity = AnomalySeverity.HIGH
    elif risk_score >= 0.25:
        severity = AnomalySeverity.MEDIUM
    elif risk_score > 0.0:
        severity = AnomalySeverity.LOW
    else:
        severity = AnomalySeverity.NORMAL

    flagged_for_review = (
        risk_score >= 0.35
        or "ANOMALY_RAPID_SPIKE" in reason_codes
        or "ANOMALY_STUCK_SENSOR" in reason_codes
    )

    final_explanation = (
        " ".join(explanation_parts)
        if explanation_parts
        else "Observation is within normal nominal bounds; no anomalous spatial or temporal patterns detected."
    )

    return AnomalyAssessment(
        score=risk_score,
        severity=severity,
        reasonCodes=reason_codes,
        explanation=final_explanation,
        evidence=AnomalyEvidence(
            deltaRateOfChange=delta_rate_evidence,
            stuckSensorReading=stuck_evidence,
            spatialPeerComparison=spatial_evidence
        ),
        flaggedForReview=flagged_for_review
    )
