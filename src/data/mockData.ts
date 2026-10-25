/**
 * SensorTrust — Reference Demo Presets & Seed Data
 * Deterministic sample observations for testing, validation, and demo flows.
 */

import { ObservationPayload, SensorType, CalibrationStatus } from '../core/contracts.ts';

export const SAMPLE_OBSERVATION_CLEAN: ObservationPayload = {
  observationId: 'urn:uuid:7c9e6679-7425-40de-944b-e07fc1f90ae7',
  sensorId: 'sensor-iot-delhi-04',
  pollutant: 'PM2.5',
  value: 48.5,
  unit: 'ug/m3',
  timestampObserved: '2026-10-23T11:00:00.000Z',
  timestampSubmitted: '2026-10-23T11:00:04.250Z',
  location: {
    gridLat: 28.61,
    gridLon: 77.20,
    countryCode: 'IN',
    zoneId: 'delhi-ncr-zone2'
  },
  sensorMetadata: {
    sensorType: SensorType.LOW_COST_IOT,
    calibrationStatus: CalibrationStatus.CO_LOCATED_VERIFIED,
    firmwareVersion: 'v2.4.1'
  }
};

export const SAMPLE_OBSERVATION_SPIKE: ObservationPayload = {
  observationId: 'urn:uuid:f48a1290-b384-48ac-9457-36209bcae812',
  sensorId: 'sensor-iot-delhi-09',
  pollutant: 'PM2.5',
  value: 284.6, // Sudden dramatic jump from 32 ug/m3
  unit: 'ug/m3',
  timestampObserved: '2026-10-23T11:00:00.000Z',
  timestampSubmitted: '2026-10-23T11:00:03.110Z',
  location: {
    gridLat: 28.62,
    gridLon: 77.21,
    countryCode: 'IN',
    zoneId: 'delhi-ncr-zone2'
  },
  sensorMetadata: {
    sensorType: SensorType.CITIZEN_SCIENCE,
    calibrationStatus: CalibrationStatus.FACTORY_CALIBRATED,
    firmwareVersion: 'v1.8.0'
  }
};

export const SAMPLE_OBSERVATION_STUCK: ObservationPayload = {
  observationId: 'urn:uuid:3b9944a1-098e-4a6c-9477-d4fa4c882190',
  sensorId: 'sensor-iot-bengaluru-12',
  pollutant: 'PM2.5',
  value: 42.0, // Identical flatline value
  unit: 'ug/m3',
  timestampObserved: '2026-10-23T11:00:00.000Z',
  timestampSubmitted: '2026-10-23T11:00:05.800Z',
  location: {
    gridLat: 12.97,
    gridLon: 77.59,
    countryCode: 'IN',
    zoneId: 'bangalore-urban'
  },
  sensorMetadata: {
    sensorType: SensorType.LOW_COST_IOT,
    calibrationStatus: CalibrationStatus.EXPIRED,
    firmwareVersion: 'v2.1.0'
  }
};

export const SAMPLE_API_ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/v1/health',
    title: 'Service Health & Blockchain Connectivity',
    auth: 'Public',
    description: 'Verifies API status, database persistence health, and local EVM Hardhat node connectivity.',
    request: 'None',
    response: {
      status: 'HEALTHY',
      timestamp: '2026-10-23T11:24:00Z',
      database: 'CONNECTED',
      blockchain: {
        network: 'hardhat-local',
        chainId: 31337,
        contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        latestBlock: 142
      }
    }
  },
  {
    method: 'POST',
    path: '/api/v1/observations',
    title: 'Ingest Observation & Execute Validation',
    auth: 'Sensor Key',
    description: 'Ingests raw PM2.5 observation, runs deterministic range & freshness checks, evaluates anomaly risk, and enqueues canonical digest for blockchain anchoring.',
    request: SAMPLE_OBSERVATION_CLEAN,
    response: {
      observationId: 'urn:uuid:7c9e6679-7425-40de-944b-e07fc1f90ae7',
      observationDigest: '0x8d5c4146a7be74a625a83a0429f5f6406e22f28ebc9d64e9e43b6795dd34be01',
      status: 'ANCHORING_PENDING',
      validation: {
        isValid: true,
        validatedAt: '2026-10-23T11:00:04.280Z',
        checks: { schemaValid: true, rangeValid: true, timestampFresh: true, duplicateDetected: false },
        rejectionReasons: []
      },
      anomaly: {
        score: 0.05,
        severity: 'NORMAL',
        reasonCodes: [],
        explanation: 'Observation is within nominal bounds; no anomalous spatial or temporal patterns detected.',
        flaggedForReview: false
      }
    }
  },
  {
    method: 'GET',
    path: '/api/v1/reviews/queue',
    title: 'Reviewer Queue (Flagged Observations)',
    auth: 'Reviewer Token',
    description: 'Retrieves flagged observations awaiting human reviewer investigation and formal decision attestation.',
    request: 'Query parameters: ?status=FLAGGED&limit=20',
    response: {
      totalFlagged: 1,
      items: [
        {
          observationId: 'urn:uuid:f48a1290-b384-48ac-9457-36209bcae812',
          sensorId: 'sensor-iot-delhi-09',
          pollutant: 'PM2.5',
          value: 284.6,
          anomalyScore: 0.85,
          severity: 'HIGH',
          reason: 'Sudden PM2.5 delta of +252.6 ug/m3 in 10.0 minutes (rate: 25.2 ug/m3/min). Spatial peers mean: 31.8 ug/m3.',
          timestampObserved: '2026-10-23T11:00:00Z'
        }
      ]
    }
  },
  {
    method: 'POST',
    path: '/api/v1/reviews/{id}/decision',
    title: 'Submit Human Review Decision',
    auth: 'Authorized Reviewer',
    description: 'Records human review verdict (Approve, Reject, Request Recalibration) with mandatory explanation, anchoring decision digest on-chain.',
    request: {
      decision: 'REJECT',
      reason: 'Physical inspection confirms sensor inlet obstructed by local diesel generator exhaust; unshielded citizen deployment.',
      reviewerId: 'reviewer:auth0|6492b'
    },
    response: {
      decisionId: 'urn:uuid:dec-8841-a1b2-c3d4',
      observationId: 'urn:uuid:f48a1290-b384-48ac-9457-36209bcae812',
      decision: 'REJECT',
      status: 'REJECTED',
      decisionDigest: '0x3f9a71b489d20c31e9124a919fae7c9927b508f7ce1893d258b309012a201b19',
      blockchainTx: {
        txHash: '0x948ab12e8471e987483018274910283749102837401928374019283740192837',
        blockNumber: 148,
        blockTimestamp: '2026-10-23T11:15:20Z'
      }
    }
  },
  {
    method: 'POST',
    path: '/api/v1/provenance/verify',
    title: 'Independent Hash Verification',
    auth: 'Public',
    description: 'Recomputes the RFC 8785 canonical SHA-256 hash from candidate payload and queries smart contract to verify mathematical integrity.',
    request: {
      observationId: 'urn:uuid:7c9e6679-7425-40de-944b-e07fc1f90ae7',
      payload: SAMPLE_OBSERVATION_CLEAN
    },
    response: {
      isMatched: true,
      existsOnChain: true,
      recomputedDigest: '0x8d5c4146a7be74a625a83a0429f5f6406e22f28ebc9d64e9e43b6795dd34be01',
      onChainDigest: '0x8d5c4146a7be74a625a83a0429f5f6406e22f28ebc9d64e9e43b6795dd34be01',
      blockNumber: 142,
      blockTimestamp: '2026-10-23T11:00:15Z',
      submitter: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      auditHistoryCount: 0
    }
  }
];
