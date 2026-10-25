/**
 * SensorTrust — Core Data Contracts & Status Enums
 * IEEE ClimateChain Global Hackathon 2026
 * Specification: Phase 1 Architecture
 */

/**
 * Stable observation lifecycle status enums.
 * An anomaly or review status NEVER overwrites the underlying physical observation or validation result.
 */
export enum ObservationStatus {
  SUBMITTED = 'SUBMITTED',
  INVALID = 'INVALID',
  FLAGGED = 'FLAGGED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RECALIBRATION_REQUESTED = 'RECALIBRATION_REQUESTED',
  ANCHORING_PENDING = 'ANCHORING_PENDING',
  ANCHORED = 'ANCHORED',
  ANCHORING_FAILED = 'ANCHORING_FAILED'
}

export enum SensorType {
  OFFICIAL_REFERENCE = 'OFFICIAL_REFERENCE',
  LOW_COST_IOT = 'LOW_COST_IOT',
  CITIZEN_SCIENCE = 'CITIZEN_SCIENCE'
}

export enum CalibrationStatus {
  FACTORY_CALIBRATED = 'FACTORY_CALIBRATED',
  CO_LOCATED_VERIFIED = 'CO_LOCATED_VERIFIED',
  EXPIRED = 'EXPIRED',
  UNKNOWN = 'UNKNOWN'
}

export enum AnomalySeverity {
  NORMAL = 'NORMAL',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ReviewDecisionType {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_RECALIBRATION = 'REQUEST_RECALIBRATION'
}

export enum BlockchainTxStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  UNAVAILABLE = 'UNAVAILABLE',
  NOT_ANCHORED = 'NOT_ANCHORED'
}

/**
 * 1. Original Observation Data Contract (Canonical Payload)
 * Privacy-by-design: Exact coordinates are quantized off-chain into grid cells (0.01° ~ 1.1km)
 */
export interface ObservationPayload {
  observationId: string;           // UUID v4 format (e.g., "urn:uuid:...")
  sensorId: string;                // Pseudonymous sensor identifier
  pollutant: 'PM2.5';              // Locked to PM2.5 for MVP
  value: number;                   // Measured concentration in µg/m³
  unit: 'ug/m3';                   // Standardized unit
  timestampObserved: string;       // ISO 8601 UTC (e.g., "2026-10-23T11:00:00.000Z")
  timestampSubmitted: string;      // ISO 8601 UTC
  location: {
    gridLat: number;               // Truncated to 2 decimals (~1.1 km resolution)
    gridLon: number;               // Truncated to 2 decimals
    countryCode: string;           // ISO 3166-1 alpha-2
    zoneId: string;                // Administrative air quality basin
  };
  sensorMetadata: {
    sensorType: SensorType;
    calibrationStatus: CalibrationStatus;
    firmwareVersion?: string;
  };
}

/**
 * 2. Deterministic Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  validatedAt: string;
  checks: {
    schemaValid: boolean;
    rangeValid: boolean;           // 0.0 <= value <= 1000.0 ug/m3
    timestampFresh: boolean;       // Not future (> +5m), not expired (< -24h)
    duplicateDetected: boolean;    // ObservationId and (sensorId + timestampObserved) uniqueness
  };
  rejectionReasons: string[];
}

/**
 * 3. Explainable Anomaly Screening Assessment
 */
export interface AnomalyAssessment {
  score: number;                   // 0.0 (clean) to 1.0 (highly anomalous)
  severity: AnomalySeverity;
  reasonCodes: string[];
  explanation: string;
  evidence: {
    deltaRateOfChange?: {
      previousValue: number;
      deltaUgPerM3: number;
      timeDeltaMinutes: number;
      ratePerMinute: number;
      thresholdExceeded: boolean;
    };
    stuckSensorReading?: {
      consecutiveIdenticalCount: number;
      durationMinutes: number;
    };
    spatialPeerComparison?: {
      peerCount: number;
      peerMean: number;
      peerStdDev: number;
      zScore: number;
      hasContextualData: boolean;
    };
  };
  flaggedForReview: boolean;
}

/**
 * 4. Human Review Record
 */
export interface ReviewRecord {
  decisionId: string;
  observationId: string;
  reviewerId: string;              // e.g. "reviewer:auth0|6492b"
  decision: ReviewDecisionType;
  reason: string;                  // Required human explanation
  timestampDecided: string;
  supersedesDecisionId?: string;   // Append-only history pointer
}

/**
 * 5. Blockchain Anchoring Record
 */
export interface BlockchainProvenance {
  observationDigest: string;       // Keccak256 or SHA256 hex string (0x...)
  decisionDigest?: string;         // Keccak256 or SHA256 of review decision
  contractAddress: string;
  networkId: string;               // e.g. "hardhat-31337" or "sepolia-11155111"
  txHash?: string;
  blockNumber?: number;
  blockTimestamp?: string;
  anchoredBy: string;              // Relayer or authorized contract caller address
  status: BlockchainTxStatus;
  verificationUrl?: string;
}

/**
 * Complete Composite Observation Record stored off-chain
 */
export interface EnrichedObservation {
  observation: ObservationPayload;
  observationDigest: string;
  validation: ValidationResult;
  anomaly: AnomalyAssessment;
  review?: ReviewRecord;
  reviewHistory: ReviewRecord[];
  provenance: BlockchainProvenance;
  status: ObservationStatus;
}

/**
 * 6. API Request & Response Contracts (Matching Phase 1 v1 REST API)
 */
export interface MetricsSummaryResponse {
  totalObservations: number;
  flaggedCount: number;
  pendingReviewsCount: number;
  anchoredCount: number;
  rejectedCount: number;
  averagePm25: number;
  activeSensorsCount: number;
  networkStatus: 'OPERATIONAL' | 'DEGRADED';
  chainConnected: boolean;
  activeBasin: string;
}

export interface PaginatedObservationsResponse {
  items: EnrichedObservation[];
  total: number;
  limit: number;
  offset: number;
}

export interface SubmitObservationResponse {
  observationId: string;
  observationDigest: string;
  status: ObservationStatus;
  validation: ValidationResult;
  anomaly?: AnomalyAssessment;
  provenance: BlockchainProvenance;
}

export interface ReviewDecisionResponse {
  decisionId: string;
  observationId: string;
  decision: ReviewDecisionType;
  status: ObservationStatus;
  decisionDigest: string;
  blockchainTx: {
    txHash: string;
    blockNumber: number;
    blockTimestamp: string;
  };
  reviewRecord: ReviewRecord;
}

export interface VerificationResponse {
  isMatched: boolean;
  existsOnChain: boolean;
  recomputedDigest: string;
  onChainDigest: string;
  blockNumber?: number;
  blockTimestamp?: string;
  submitter?: string;
  verificationLevel: 'LOCAL_RECOMPUTATION' | 'BACKEND_VERIFIED' | 'ON_CHAIN_CONFIRMED';
  onChainStatus?: string;
  explanation: string;
}

export interface HealthResponse {
  status: 'HEALTHY' | 'DEGRADED';
  timestamp: string;
  database: 'CONNECTED' | 'IN_MEMORY_PROTOTYPE';
  blockchain: {
    network: string;
    chainId: number;
    contractAddress: string;
    latestBlock: number;
    isSimulatedLocalNode: boolean;
  };
}

