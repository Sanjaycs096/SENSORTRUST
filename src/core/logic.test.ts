/**
 * SensorTrust — Pure Logic Unit Tests
 * Testing RFC 8785 Canonical Serialization, Validation Engine, and Anomaly Screening
 * Executable via `npx --yes tsx --test src/core/logic.test.ts`
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeJson, computeSha256HexSync } from './canonicalize.ts';
import { validateObservation, ValidationContext } from './validation.ts';
import { screenObservationAnomalies } from './anomaly.ts';
import {
  ObservationPayload,
  SensorType,
  CalibrationStatus,
  AnomalySeverity
} from './contracts.ts';

test('1. Canonical JSON serializer determinism across arbitrary key ordering', () => {
  const objA = {
    b: 2,
    a: 1,
    nested: { z: 10, m: 5 }
  };
  const objB = {
    nested: { m: 5, z: 10 },
    a: 1,
    b: 2
  };

  const canonA = canonicalizeJson(objA);
  const canonB = canonicalizeJson(objB);

  assert.equal(canonA, canonB, 'Key order must not alter canonical JSON');
  assert.equal(canonA, '{"a":1,"b":2,"nested":{"m":5,"z":10}}');

  const hashA = computeSha256HexSync(canonA);
  const hashB = computeSha256HexSync(canonB);
  assert.equal(hashA, hashB, 'Hashes must match identically');
  assert.match(hashA, /^0x[a-f0-9]{64}$/, 'Hash must be 64-char hex string prefixed with 0x');
});

test('2. Observation Range Validation accepts valid PM2.5 and rejects invalid values', () => {
  const emptyContext: ValidationContext = {
    knownObservationIds: new Set(),
    knownSensorTimestamps: new Set(),
    referenceCurrentTimeMs: new Date('2026-10-23T11:00:00Z').getTime()
  };

  // Valid observation
  const validObs: Partial<ObservationPayload> = {
    observationId: 'urn:uuid:11111111-2222-3333-4444-555555555555',
    sensorId: 'sensor-iot-delhi-04',
    pollutant: 'PM2.5',
    value: 48.5,
    unit: 'ug/m3',
    timestampObserved: '2026-10-23T10:55:00Z'
  };

  const resValid = validateObservation(validObs, emptyContext);
  assert.equal(resValid.isValid, true);
  assert.equal(resValid.rejectionReasons.length, 0);

  // Negative value
  const resNegative = validateObservation({ ...validObs, value: -5.0 }, emptyContext);
  assert.equal(resNegative.isValid, false);
  assert.ok(resNegative.rejectionReasons.some((r) => r.includes('ERR_RANGE_NEGATIVE')));

  // Exceeds upper physical bound (1000 ug/m3)
  const resExceeded = validateObservation({ ...validObs, value: 1450.0 }, emptyContext);
  assert.equal(resExceeded.isValid, false);
  assert.ok(resExceeded.rejectionReasons.some((r) => r.includes('ERR_RANGE_EXCEEDED')));
});

test('3. Timestamp Freshness validation catches future drift and ancient submissions', () => {
  const context: ValidationContext = {
    knownObservationIds: new Set(),
    knownSensorTimestamps: new Set(),
    referenceCurrentTimeMs: new Date('2026-10-23T11:00:00Z').getTime()
  };

  const baseObs: Partial<ObservationPayload> = {
    observationId: 'urn:uuid:freshness-test',
    sensorId: 'sensor-01',
    pollutant: 'PM2.5',
    value: 25.0,
    unit: 'ug/m3'
  };

  // Future timestamp (+10 mins ahead)
  const resFuture = validateObservation({
    ...baseObs,
    timestampObserved: '2026-10-23T11:10:00Z'
  }, context);
  assert.equal(resFuture.isValid, false);
  assert.ok(resFuture.rejectionReasons.some((r) => r.includes('ERR_TIMESTAMP_FUTURE')));

  // Stale timestamp (2 days ago)
  const resStale = validateObservation({
    ...baseObs,
    timestampObserved: '2026-10-21T09:00:00Z'
  }, context);
  assert.equal(resStale.isValid, false);
  assert.ok(resStale.rejectionReasons.some((r) => r.includes('ERR_TIMESTAMP_STALE')));
});

test('4. Duplicate observation detection prevents double recording', () => {
  const context: ValidationContext = {
    knownObservationIds: new Set(['obs-already-exists']),
    knownSensorTimestamps: new Set(['sensor-01:2026-10-23T10:00:00Z']),
    referenceCurrentTimeMs: new Date('2026-10-23T11:00:00Z').getTime()
  };

  const duplicateIdObs: Partial<ObservationPayload> = {
    observationId: 'obs-already-exists',
    sensorId: 'sensor-99',
    pollutant: 'PM2.5',
    value: 20.0,
    unit: 'ug/m3',
    timestampObserved: '2026-10-23T10:45:00Z'
  };

  const resDupId = validateObservation(duplicateIdObs, context);
  assert.equal(resDupId.isValid, false);
  assert.ok(resDupId.rejectionReasons.some((r) => r.includes('ERR_DUPLICATE_OBSERVATION_ID')));

  const duplicateTimestepObs: Partial<ObservationPayload> = {
    observationId: 'obs-new-unique-id',
    sensorId: 'sensor-01',
    pollutant: 'PM2.5',
    value: 20.0,
    unit: 'ug/m3',
    timestampObserved: '2026-10-23T10:00:00Z'
  };

  const resDupStep = validateObservation(duplicateTimestepObs, context);
  assert.equal(resDupStep.isValid, false);
  assert.ok(resDupStep.rejectionReasons.some((r) => r.includes('ERR_DUPLICATE_SENSOR_TIMESTEP')));
});

test('5. Anomaly Screening flags rapid spikes with explainable metrics', () => {
  const currentObs: ObservationPayload = {
    observationId: 'obs-spike-01',
    sensorId: 'sensor-iot-09',
    pollutant: 'PM2.5',
    value: 125.0, // sudden spike from 25
    unit: 'ug/m3',
    timestampObserved: '2026-10-23T11:00:00Z',
    timestampSubmitted: '2026-10-23T11:00:05Z',
    location: {
      gridLat: 28.61,
      gridLon: 77.20,
      countryCode: 'IN',
      zoneId: 'delhi-ncr'
    },
    sensorMetadata: {
      sensorType: SensorType.LOW_COST_IOT,
      calibrationStatus: CalibrationStatus.FACTORY_CALIBRATED
    }
  };

  const history = [
    { value: 24.0, timestamp: '2026-10-23T10:40:00Z' },
    { value: 25.0, timestamp: '2026-10-23T10:50:00Z' }
  ];

  const assessment = screenObservationAnomalies({
    current: currentObs,
    historyForSensor: history,
    spatialPeers: []
  });

  assert.equal(assessment.flaggedForReview, true);
  assert.ok(assessment.reasonCodes.includes('ANOMALY_RAPID_SPIKE'));
  assert.ok(assessment.evidence.deltaRateOfChange?.thresholdExceeded);
  assert.equal(assessment.evidence.deltaRateOfChange?.deltaUgPerM3, 100);
  assert.ok(assessment.explanation.includes('Sudden PM2.5 delta'));
  // Acknowledges lack of peer context instead of fabricating it:
  assert.ok(assessment.reasonCodes.includes('INFO_INSUFFICIENT_PEER_CONTEXT'));
});

test('6. Anomaly Screening flags stuck/flatlined sensor readings', () => {
  const currentObs: ObservationPayload = {
    observationId: 'obs-stuck-01',
    sensorId: 'sensor-iot-stuck',
    pollutant: 'PM2.5',
    value: 42.0,
    unit: 'ug/m3',
    timestampObserved: '2026-10-23T11:00:00Z',
    timestampSubmitted: '2026-10-23T11:00:05Z',
    location: { gridLat: 12.97, gridLon: 77.59, countryCode: 'IN', zoneId: 'bangalore-urban' },
    sensorMetadata: { sensorType: SensorType.LOW_COST_IOT, calibrationStatus: CalibrationStatus.FACTORY_CALIBRATED }
  };

  // 5 consecutive identical readings
  const history = [
    { value: 42.0, timestamp: '2026-10-23T10:10:00Z' },
    { value: 42.0, timestamp: '2026-10-23T10:20:00Z' },
    { value: 42.0, timestamp: '2026-10-23T10:30:00Z' },
    { value: 42.0, timestamp: '2026-10-23T10:40:00Z' },
    { value: 42.0, timestamp: '2026-10-23T10:50:00Z' }
  ];

  const assessment = screenObservationAnomalies({
    current: currentObs,
    historyForSensor: history,
    spatialPeers: []
  });

  assert.equal(assessment.flaggedForReview, true);
  assert.ok(assessment.reasonCodes.includes('ANOMALY_STUCK_SENSOR'));
  assert.equal(assessment.evidence.stuckSensorReading?.consecutiveIdenticalCount, 6);
  assert.ok(assessment.explanation.includes('Sensor has reported exactly identical value'));
});
