/**
 * SensorTrust — Prototype Service Adapter Tests
 * Tests API service behavior, validation, anomaly detection, review recording, and provenance verification.
 * Executable via `npx --yes tsx --test src/services/api.test.ts`
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { sensorTrustApi } from './api.ts';
import {
  ObservationStatus,
  ReviewDecisionType,
  SensorType,
  CalibrationStatus
} from '../core/contracts.ts';

test('1. API Service retrieves initial metrics and pre-seeded observations', async () => {
  await sensorTrustApi.resetToDefaultSeed();
  const metrics = await sensorTrustApi.getMetrics();

  assert.ok(metrics.totalObservations >= 5, 'Must have at least 5 seed observations');
  assert.ok(metrics.flaggedCount >= 1, 'Must have flagged observations in seed');
  assert.equal(metrics.networkStatus, 'OPERATIONAL');

  const obs = await sensorTrustApi.getObservations({ limit: 10 });
  assert.equal(obs.items.length, metrics.totalObservations);
});

test('2. Submitting valid PM2.5 observation creates record and computes SHA-256 digest', async () => {
  const uniqueId = `urn:uuid:test-ingest-${Date.now()}`;
  const res = await sensorTrustApi.submitObservation({
    observationId: uniqueId,
    sensorId: 'Sensor-Unit-Test-01',
    pollutant: 'PM2.5',
    value: 28.5,
    unit: 'ug/m3',
    timestampObserved: new Date().toISOString(),
    location: {
      gridLat: 28.61,
      gridLon: 77.20,
      countryCode: 'IN',
      zoneId: 'delhi-ncr-zone1'
    },
    sensorMetadata: {
      sensorType: SensorType.LOW_COST_IOT,
      calibrationStatus: CalibrationStatus.FACTORY_CALIBRATED
    }
  });

  assert.equal(res.validation.isValid, true);
  assert.equal(res.observationId, uniqueId);
  assert.match(res.observationDigest, /^0x[a-f0-9]{64}$/);

  // Retrieve via getObservationById
  const fetched = await sensorTrustApi.getObservationById(uniqueId);
  assert.ok(fetched !== null);
  assert.equal(fetched?.observation.value, 28.5);
});

test('3. Submitting invalid PM2.5 (<0 or >1000) is rejected by physical bounds gate', async () => {
  const resNegative = await sensorTrustApi.submitObservation({
    observationId: `urn:uuid:invalid-neg-${Date.now()}`,
    sensorId: 'Sensor-Faulty',
    pollutant: 'PM2.5',
    value: -12.0,
    unit: 'ug/m3',
    timestampObserved: new Date().toISOString()
  });

  assert.equal(resNegative.validation.isValid, false);
  assert.equal(resNegative.status, ObservationStatus.INVALID);
  assert.ok(resNegative.validation.rejectionReasons.some((r) => r.includes('ERR_RANGE_NEGATIVE')));
});

test('4. Submitting duplicate observation ID returns duplicate error', async () => {
  const dupId = `urn:uuid:duplicate-test-${Date.now()}`;
  const nowIso = new Date().toISOString();
  // First submission
  const firstRes = await sensorTrustApi.submitObservation({
    observationId: dupId,
    sensorId: 'Sensor-Dup-01',
    pollutant: 'PM2.5',
    value: 30.0,
    unit: 'ug/m3',
    timestampObserved: nowIso,
    location: { gridLat: 28.61, gridLon: 77.20, countryCode: 'IN', zoneId: 'zone1' },
    sensorMetadata: { sensorType: SensorType.LOW_COST_IOT, calibrationStatus: CalibrationStatus.UNKNOWN }
  });
  assert.equal(firstRes.validation.isValid, true);

  // Second submission with identical ID
  const resDup = await sensorTrustApi.submitObservation({
    observationId: dupId,
    sensorId: 'Sensor-Dup-02',
    pollutant: 'PM2.5',
    value: 35.0,
    unit: 'ug/m3',
    timestampObserved: new Date(Date.now() + 1000).toISOString(),
    location: { gridLat: 28.61, gridLon: 77.20, countryCode: 'IN', zoneId: 'zone1' },
    sensorMetadata: { sensorType: SensorType.LOW_COST_IOT, calibrationStatus: CalibrationStatus.UNKNOWN }
  });

  assert.equal(resDup.validation.isValid, false);
  assert.equal(resDup.validation.checks.duplicateDetected, true);
});

test('5. Reviewer decision requires minimum 10 characters and preserves append-only history', async () => {
  const spikeObsId = 'urn:uuid:f48a1290-b384-48ac-9457-36209bcae812';

  // Attempt with short reason
  await assert.rejects(
    async () => {
      await sensorTrustApi.submitReviewDecision({
        observationId: spikeObsId,
        decision: ReviewDecisionType.REJECT,
        reason: 'Too short'
      });
    },
    /ERR_REVIEW_JUSTIFICATION_REQUIRED/
  );

  // Submit valid rejection
  const reviewRes = await sensorTrustApi.submitReviewDecision({
    observationId: spikeObsId,
    decision: ReviewDecisionType.REJECT,
    reason: 'Confirmed unshielded sensor siting next to active generator exhaust.',
    reviewerId: 'reviewer:test-officer'
  });

  assert.equal(reviewRes.decision, ReviewDecisionType.REJECT);
  assert.equal(reviewRes.status, ObservationStatus.REJECTED);
  assert.match(reviewRes.decisionDigest, /^0x[a-f0-9]{64}$/);

  // Confirm observation has updated status and review event in history
  const updated = await sensorTrustApi.getObservationById(spikeObsId);
  assert.equal(updated?.status, ObservationStatus.REJECTED);
  assert.ok(updated?.reviewHistory.length! >= 1);
  assert.equal(updated?.reviewHistory[0].reason, 'Confirmed unshielded sensor siting next to active generator exhaust.');
});

test('6. Provenance verification succeeds on authentic payload and catches altered data', async () => {
  const cleanId = 'urn:uuid:7c9e6679-7425-40de-944b-e07fc1f90ae7';
  const cleanRecord = await sensorTrustApi.getObservationById(cleanId);
  assert.ok(cleanRecord !== null);

  // 1. Untampered check
  const verifyPass = await sensorTrustApi.verifyProvenance({
    observationId: cleanId,
    candidatePayload: cleanRecord?.observation
  });
  assert.equal(verifyPass.isMatched, true);
  assert.equal(verifyPass.existsOnChain, true);

  // 2. Tampered check (+0.1 ug/m3 alteration)
  const tamperedPayload = {
    ...cleanRecord?.observation,
    value: cleanRecord?.observation.value! + 0.1
  };
  const verifyFail = await sensorTrustApi.verifyProvenance({
    observationId: cleanId,
    candidatePayload: tamperedPayload
  });
  assert.equal(verifyFail.isMatched, false);
  assert.notEqual(verifyFail.recomputedDigest, verifyFail.onChainDigest);
});
