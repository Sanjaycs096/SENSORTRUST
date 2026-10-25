/**
 * SensorTrust — Deterministic Validation Engine
 * Enforces schema compliance, PM2.5 physical bounds, timestamp freshness, and deduplication.
 */

import { ObservationPayload, ValidationResult } from './contracts.ts';

export const PM25_MIN_VALID = 0.0;
export const PM25_MAX_VALID = 1000.0; // Above 1000 ug/m3 is physically implausible without sensor saturation/fire explosion
export const MAX_FUTURE_DRIFT_MS = 5 * 60 * 1000; // 5 minutes clock tolerance
export const MAX_STALE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours historical submission window

export interface ValidationContext {
  knownObservationIds: Set<string>;
  knownSensorTimestamps: Set<string>; // `${sensorId}:${timestampObserved}`
  referenceCurrentTimeMs?: number;
}

export function validateObservation(
  payload: Partial<ObservationPayload>,
  context: ValidationContext
): ValidationResult {
  const reasons: string[] = [];
  let schemaValid = true;
  let rangeValid = true;
  let timestampFresh = true;
  let duplicateDetected = false;

  // 1. Schema check
  if (!payload.observationId || typeof payload.observationId !== 'string') {
    schemaValid = false;
    reasons.push('ERR_SCHEMA_MISSING_ID: observationId must be a valid non-empty string');
  }

  if (!payload.sensorId || typeof payload.sensorId !== 'string') {
    schemaValid = false;
    reasons.push('ERR_SCHEMA_MISSING_SENSOR: sensorId must be a non-empty string');
  }

  if (payload.pollutant !== 'PM2.5') {
    schemaValid = false;
    reasons.push('ERR_SCHEMA_INVALID_POLLUTANT: MVP only supports pollutant PM2.5');
  }

  if (payload.unit !== 'ug/m3') {
    schemaValid = false;
    reasons.push('ERR_SCHEMA_INVALID_UNIT: unit must be ug/m3');
  }

  if (typeof payload.value !== 'number' || isNaN(payload.value)) {
    schemaValid = false;
    rangeValid = false;
    reasons.push('ERR_SCHEMA_INVALID_VALUE: value must be a valid finite number');
  } else {
    // 2. Physical range check
    if (payload.value < PM25_MIN_VALID) {
      rangeValid = false;
      reasons.push(`ERR_RANGE_NEGATIVE: PM2.5 value (${payload.value}) cannot be negative`);
    } else if (payload.value > PM25_MAX_VALID) {
      rangeValid = false;
      reasons.push(`ERR_RANGE_EXCEEDED: PM2.5 value (${payload.value}) exceeds max plausible threshold (1000 ug/m3)`);
    }
  }

  // 3. Timestamp Freshness
  const nowMs = context.referenceCurrentTimeMs || Date.now();
  if (!payload.timestampObserved) {
    timestampFresh = false;
    reasons.push('ERR_TIMESTAMP_MISSING: timestampObserved is required');
  } else {
    const obsTime = new Date(payload.timestampObserved).getTime();
    if (isNaN(obsTime)) {
      timestampFresh = false;
      reasons.push('ERR_TIMESTAMP_MALFORMED: timestampObserved is not valid ISO 8601');
    } else {
      if (obsTime > nowMs + MAX_FUTURE_DRIFT_MS) {
        timestampFresh = false;
        reasons.push(`ERR_TIMESTAMP_FUTURE: timestampObserved is in the future by >${MAX_FUTURE_DRIFT_MS / 1000}s`);
      }
      if (obsTime < nowMs - MAX_STALE_AGE_MS) {
        timestampFresh = false;
        reasons.push(`ERR_TIMESTAMP_STALE: timestampObserved is older than 24 hours window`);
      }
    }
  }

  // 4. Duplicate Check
  if (payload.observationId && context.knownObservationIds.has(payload.observationId)) {
    duplicateDetected = true;
    reasons.push(`ERR_DUPLICATE_OBSERVATION_ID: Record with observationId '${payload.observationId}' already ingested`);
  }

  if (payload.sensorId && payload.timestampObserved) {
    const sensorKey = `${payload.sensorId}:${payload.timestampObserved}`;
    if (context.knownSensorTimestamps.has(sensorKey)) {
      duplicateDetected = true;
      reasons.push(`ERR_DUPLICATE_SENSOR_TIMESTEP: Sensor '${payload.sensorId}' already submitted an observation at ${payload.timestampObserved}`);
    }
  }

  const isValid = schemaValid && rangeValid && timestampFresh && !duplicateDetected;

  return {
    isValid,
    validatedAt: new Date(nowMs).toISOString(),
    checks: {
      schemaValid,
      rangeValid,
      timestampFresh,
      duplicateDetected
    },
    rejectionReasons: reasons
  };
}
