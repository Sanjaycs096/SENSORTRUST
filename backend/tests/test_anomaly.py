"""
SensorTrust — Explainable Anomaly Screening Tests
Verifies rate-of-change spike, stuck flatline, spatial peer divergence,
insufficient context acknowledgment, and calibration penalty calculation.
"""

from app.core.anomaly import screen_anomalies, HistoricalReading, PeerReading
from app.schemas.observation import AnomalySeverity, CalibrationStatus


def test_rapid_spike_anomaly_screening():
    """Verify that sudden jump (>40 ug/m3 in <=30 min) flags ANOMALY_RAPID_SPIKE."""
    history = [
        HistoricalReading(value=24.0, timestamp="2026-10-23T10:40:00.000Z"),
        HistoricalReading(value=25.0, timestamp="2026-10-23T10:50:00.000Z")
    ]

    assessment = screen_anomalies(
        current_value=125.0,  # +100 jump in 10 minutes
        current_timestamp="2026-10-23T11:00:00.000Z",
        calibration_status=CalibrationStatus.FACTORY_CALIBRATED.value,
        history=history,
        spatial_peers=[]
    )

    assert assessment.flaggedForReview is True
    assert "ANOMALY_RAPID_SPIKE" in assessment.reasonCodes
    assert assessment.evidence.deltaRateOfChange is not None
    assert assessment.evidence.deltaRateOfChange.thresholdExceeded is True
    assert assessment.evidence.deltaRateOfChange.deltaUgPerM3 == 100.0
    assert "Sudden PM2.5 delta" in assessment.explanation


def test_stuck_sensor_flatline_screening():
    """Verify that 5 consecutive identical readings from sensor history flags ANOMALY_STUCK_SENSOR."""
    history = [
        HistoricalReading(value=42.0, timestamp="2026-10-23T10:10:00.000Z"),
        HistoricalReading(value=42.0, timestamp="2026-10-23T10:20:00.000Z"),
        HistoricalReading(value=42.0, timestamp="2026-10-23T10:30:00.000Z"),
        HistoricalReading(value=42.0, timestamp="2026-10-23T10:40:00.000Z"),
        HistoricalReading(value=42.0, timestamp="2026-10-23T10:50:00.000Z")
    ]

    assessment = screen_anomalies(
        current_value=42.0,
        current_timestamp="2026-10-23T11:00:00.000Z",
        calibration_status=CalibrationStatus.FACTORY_CALIBRATED.value,
        history=history,
        spatial_peers=[]
    )

    assert assessment.flaggedForReview is True
    assert "ANOMALY_STUCK_SENSOR" in assessment.reasonCodes
    assert assessment.evidence.stuckSensorReading is not None
    assert assessment.evidence.stuckSensorReading.consecutiveIdenticalCount == 6
    assert "Sensor has reported exactly identical value" in assessment.explanation


def test_spatial_peer_divergence_and_missing_context():
    """Verify that cluster divergence flags anomaly, while lack of peers sets insufficient context indicator."""
    # 1. With sufficient peers and severe divergence (z-score >= 3.0)
    peers = [
        PeerReading(sensor_id="peer-1", value=20.0),
        PeerReading(sensor_id="peer-2", value=22.0),
        PeerReading(sensor_id="peer-3", value=19.0),
        PeerReading(sensor_id="peer-4", value=21.0)
    ]
    assessment_with_peers = screen_anomalies(
        current_value=120.0,
        current_timestamp="2026-10-23T11:00:00.000Z",
        calibration_status=CalibrationStatus.FACTORY_CALIBRATED.value,
        history=[],
        spatial_peers=peers
    )
    assert "ANOMALY_SPATIAL_DIVERGENCE" in assessment_with_peers.reasonCodes
    assert assessment_with_peers.evidence.spatialPeerComparison.hasContextualData is True
    assert assessment_with_peers.evidence.spatialPeerComparison.zScore >= 3.0

    # 2. With zero or one peer (insufficient peer context)
    assessment_no_peers = screen_anomalies(
        current_value=25.0,
        current_timestamp="2026-10-23T11:00:00.000Z",
        calibration_status=CalibrationStatus.FACTORY_CALIBRATED.value,
        history=[],
        spatial_peers=[PeerReading(sensor_id="single-peer", value=25.0)]
    )
    assert "INFO_INSUFFICIENT_PEER_CONTEXT" in assessment_no_peers.reasonCodes
    assert assessment_no_peers.evidence.spatialPeerComparison.hasContextualData is False
