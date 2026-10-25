"""
SensorTrust — Deterministic Validation Engine Tests
Tests physical bounds (0–1000 ug/m3), clock freshness, schema checks, and deduplication.
"""

from datetime import datetime, timezone, timedelta
from app.core.validation import validate_observation_payload


def test_validation_accepts_valid_observation():
    now = datetime(2026, 10, 23, 11, 0, 0, tzinfo=timezone.utc)
    obs_time = (now - timedelta(minutes=5)).isoformat().replace("+00:00", "Z")

    payload = {
        "observationId": "urn:uuid:test-valid-01",
        "sensorId": "sensor-delhi-01",
        "pollutant": "PM2.5",
        "value": 48.5,
        "unit": "ug/m3",
        "timestampObserved": obs_time,
        "timestampSubmitted": now.isoformat().replace("+00:00", "Z"),
        "location": {
            "gridLat": 28.61,
            "gridLon": 77.20,
            "countryCode": "IN",
            "zoneId": "delhi-ncr"
        },
        "sensorMetadata": {
            "sensorType": "LOW_COST_IOT",
            "calibrationStatus": "FACTORY_CALIBRATED"
        }
    }

    res = validate_observation_payload(
        payload=payload,
        known_observation_ids=set(),
        known_sensor_timesteps=set(),
        reference_now=now
    )

    assert res.isValid is True
    assert res.checks.schemaValid is True
    assert res.checks.rangeValid is True
    assert res.checks.timestampFresh is True
    assert res.checks.duplicateDetected is False
    assert len(res.rejectionReasons) == 0


def test_validation_rejects_negative_pm25():
    now = datetime(2026, 10, 23, 11, 0, 0, tzinfo=timezone.utc)
    payload = {
        "observationId": "urn:uuid:test-neg-01",
        "sensorId": "sensor-faulty-01",
        "pollutant": "PM2.5",
        "value": -12.5,
        "unit": "ug/m3",
        "timestampObserved": now.isoformat().replace("+00:00", "Z")
    }

    res = validate_observation_payload(
        payload=payload,
        known_observation_ids=set(),
        known_sensor_timesteps=set(),
        reference_now=now
    )

    assert res.isValid is False
    assert res.checks.rangeValid is False
    assert any("ERR_RANGE_NEGATIVE" in r for r in res.rejectionReasons)


def test_validation_rejects_exceeded_physical_threshold():
    now = datetime(2026, 10, 23, 11, 0, 0, tzinfo=timezone.utc)
    payload = {
        "observationId": "urn:uuid:test-exceeded-01",
        "sensorId": "sensor-saturated-01",
        "pollutant": "PM2.5",
        "value": 1450.0,
        "unit": "ug/m3",
        "timestampObserved": now.isoformat().replace("+00:00", "Z")
    }

    res = validate_observation_payload(
        payload=payload,
        known_observation_ids=set(),
        known_sensor_timesteps=set(),
        reference_now=now
    )

    assert res.isValid is False
    assert res.checks.rangeValid is False
    assert any("ERR_RANGE_EXCEEDED" in r for r in res.rejectionReasons)


def test_validation_rejects_future_drift_and_stale_timestamps():
    now = datetime(2026, 10, 23, 11, 0, 0, tzinfo=timezone.utc)

    # Future by 10 minutes (exceeds 5m drift limit)
    future_time = (now + timedelta(minutes=10)).isoformat().replace("+00:00", "Z")
    res_future = validate_observation_payload(
        payload={"observationId": "obs-future", "sensorId": "s1", "pollutant": "PM2.5", "value": 25.0, "unit": "ug/m3", "timestampObserved": future_time},
        known_observation_ids=set(),
        known_sensor_timesteps=set(),
        reference_now=now
    )
    assert res_future.isValid is False
    assert res_future.checks.timestampFresh is False
    assert any("ERR_TIMESTAMP_FUTURE" in r for r in res_future.rejectionReasons)

    # Stale by 2 days (exceeds 24h limit)
    stale_time = (now - timedelta(days=2)).isoformat().replace("+00:00", "Z")
    res_stale = validate_observation_payload(
        payload={"observationId": "obs-stale", "sensorId": "s1", "pollutant": "PM2.5", "value": 25.0, "unit": "ug/m3", "timestampObserved": stale_time},
        known_observation_ids=set(),
        known_sensor_timesteps=set(),
        reference_now=now
    )
    assert res_stale.isValid is False
    assert res_stale.checks.timestampFresh is False
    assert any("ERR_TIMESTAMP_STALE" in r for r in res_stale.rejectionReasons)


def test_validation_detects_duplicate_id_and_timestep():
    now = datetime(2026, 10, 23, 11, 0, 0, tzinfo=timezone.utc)
    ts = now.isoformat().replace("+00:00", "Z")

    known_ids = {"urn:uuid:already-exists"}
    known_steps = {"sensor-dup:2026-10-23T11:00:00.000Z"}

    # Duplicate observationId
    res_dup_id = validate_observation_payload(
        payload={"observationId": "urn:uuid:already-exists", "sensorId": "other-sensor", "pollutant": "PM2.5", "value": 30.0, "unit": "ug/m3", "timestampObserved": ts},
        known_observation_ids=known_ids,
        known_sensor_timesteps=set(),
        reference_now=now
    )
    assert res_dup_id.isValid is False
    assert res_dup_id.checks.duplicateDetected is True
    assert any("ERR_DUPLICATE_OBSERVATION_ID" in r for r in res_dup_id.rejectionReasons)

    # Duplicate sensor + timestamp
    res_dup_step = validate_observation_payload(
        payload={"observationId": "urn:uuid:new-id", "sensorId": "sensor-dup", "pollutant": "PM2.5", "value": 30.0, "unit": "ug/m3", "timestampObserved": "2026-10-23T11:00:00.000Z"},
        known_observation_ids=set(),
        known_sensor_timesteps=known_steps,
        reference_now=now
    )
    assert res_dup_step.isValid is False
    assert res_dup_step.checks.duplicateDetected is True
    assert any("ERR_DUPLICATE_SENSOR_TIMESTEP" in r for r in res_dup_step.rejectionReasons)
