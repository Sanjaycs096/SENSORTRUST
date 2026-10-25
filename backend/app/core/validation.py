"""
SensorTrust — Deterministic Validation Engine
Enforces schema compliance, PM2.5 physical bounds, timestamp freshness, and deduplication.
Ported from and functionally identical to TypeScript src/core/validation.ts.
"""

from typing import Dict, Any, Set, Optional, Tuple
from datetime import datetime, timezone
from app.schemas.observation import ValidationResult, ValidationChecks

PM25_MIN_VALID = 0.0
PM25_MAX_VALID = 1000.0  # Above 1000 ug/m3 is physically implausible without sensor saturation/fire explosion
MAX_FUTURE_DRIFT_SECONDS = 5 * 60  # 5 minutes clock tolerance
MAX_STALE_AGE_SECONDS = 24 * 60 * 60  # 24 hours historical submission window


def parse_iso8601_utc(ts_str: str) -> Optional[datetime]:
    """Parses an ISO 8601 timestamp string into an aware UTC datetime."""
    if not ts_str or not isinstance(ts_str, str):
        return None
    try:
        # Handle trailing 'Z'
        clean_str = ts_str.strip()
        if clean_str.endswith("Z"):
            clean_str = clean_str[:-1] + "+00:00"
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def validate_observation_payload(
    payload: Dict[str, Any],
    known_observation_ids: Set[str],
    known_sensor_timesteps: Set[str],
    reference_now: Optional[datetime] = None
) -> ValidationResult:
    """
    Executes the 4 deterministic validation gates:
    1. Schema validity
    2. Physical measurement bounds
    3. Timestamp freshness (past 24h to future +5m)
    4. Uniqueness / deduplication
    """
    reasons = []
    schema_valid = True
    range_valid = True
    timestamp_fresh = True
    duplicate_detected = False

    obs_id = payload.get("observationId")
    sensor_id = payload.get("sensorId")
    pollutant = payload.get("pollutant")
    unit = payload.get("unit")
    value = payload.get("value")
    timestamp_observed = payload.get("timestampObserved")
    location = payload.get("location")
    sensor_metadata = payload.get("sensorMetadata")

    # 1. Schema Check
    if not obs_id or not isinstance(obs_id, str) or not obs_id.strip():
        schema_valid = False
        reasons.append("ERR_SCHEMA_MISSING_ID: observationId must be a valid non-empty string")

    if not sensor_id or not isinstance(sensor_id, str) or not sensor_id.strip():
        schema_valid = False
        reasons.append("ERR_SCHEMA_MISSING_SENSOR: sensorId must be a non-empty string")

    if pollutant != "PM2.5":
        schema_valid = False
        reasons.append("ERR_SCHEMA_INVALID_POLLUTANT: MVP only supports pollutant PM2.5")

    if unit != "ug/m3":
        schema_valid = False
        reasons.append("ERR_SCHEMA_INVALID_UNIT: unit must be ug/m3")

    if value is None or not isinstance(value, (int, float)) or isinstance(value, bool):
        schema_valid = False
        range_valid = False
        reasons.append("ERR_SCHEMA_INVALID_VALUE: value must be a valid finite number")
    else:
        # 2. Physical Range Check
        if value < PM25_MIN_VALID:
            range_valid = False
            reasons.append(f"ERR_RANGE_NEGATIVE: PM2.5 value ({value}) cannot be negative")
        elif value > PM25_MAX_VALID:
            range_valid = False
            reasons.append(
                f"ERR_RANGE_EXCEEDED: PM2.5 value ({value}) exceeds max plausible threshold (1000 ug/m3)"
            )

    # 3. Timestamp Freshness
    now = reference_now or datetime.now(timezone.utc)
    if not timestamp_observed:
        timestamp_fresh = False
        reasons.append("ERR_TIMESTAMP_MISSING: timestampObserved is required")
    else:
        dt_obs = parse_iso8601_utc(timestamp_observed)
        if dt_obs is None:
            timestamp_fresh = False
            reasons.append("ERR_TIMESTAMP_MALFORMED: timestampObserved is not valid ISO 8601")
        else:
            diff_seconds = (dt_obs - now).total_seconds()
            if diff_seconds > MAX_FUTURE_DRIFT_SECONDS:
                timestamp_fresh = False
                reasons.append(
                    f"ERR_TIMESTAMP_FUTURE: timestampObserved is in the future by >{MAX_FUTURE_DRIFT_SECONDS}s"
                )
            elif diff_seconds < -MAX_STALE_AGE_SECONDS:
                timestamp_fresh = False
                reasons.append(
                    "ERR_TIMESTAMP_STALE: timestampObserved is older than 24 hours window"
                )

    # 4. Deduplication Check
    if obs_id and obs_id in known_observation_ids:
        duplicate_detected = True
        reasons.append(
            f"ERR_DUPLICATE_OBSERVATION_ID: Record with observationId '{obs_id}' already ingested"
        )

    if sensor_id and timestamp_observed:
        sensor_key = f"{sensor_id}:{timestamp_observed}"
        if sensor_key in known_sensor_timesteps:
            duplicate_detected = True
            reasons.append(
                f"ERR_DUPLICATE_SENSOR_TIMESTEP: Sensor '{sensor_id}' already submitted an observation at {timestamp_observed}"
            )

    is_valid = schema_valid and range_valid and timestamp_fresh and not duplicate_detected

    return ValidationResult(
        isValid=is_valid,
        validatedAt=now.isoformat().replace("+00:00", "Z"),
        checks=ValidationChecks(
            schemaValid=schema_valid,
            rangeValid=range_valid,
            timestampFresh=timestamp_fresh,
            duplicateDetected=duplicate_detected
        ),
        rejectionReasons=reasons
    )
