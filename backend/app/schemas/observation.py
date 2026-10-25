"""
SensorTrust — Pydantic Schemas for Observations
Strict validation matching the TypeScript core/contracts.ts specification.
"""

from enum import Enum
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


class ObservationStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    INVALID = "INVALID"
    FLAGGED = "FLAGGED"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RECALIBRATION_REQUESTED = "RECALIBRATION_REQUESTED"
    ANCHORING_PENDING = "ANCHORING_PENDING"
    ANCHORED = "ANCHORED"
    ANCHORING_FAILED = "ANCHORING_FAILED"


class SensorType(str, Enum):
    OFFICIAL_REFERENCE = "OFFICIAL_REFERENCE"
    LOW_COST_IOT = "LOW_COST_IOT"
    CITIZEN_SCIENCE = "CITIZEN_SCIENCE"


class CalibrationStatus(str, Enum):
    FACTORY_CALIBRATED = "FACTORY_CALIBRATED"
    CO_LOCATED_VERIFIED = "CO_LOCATED_VERIFIED"
    EXPIRED = "EXPIRED"
    UNKNOWN = "UNKNOWN"


class AnomalySeverity(str, Enum):
    NORMAL = "NORMAL"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class LocationPayload(BaseModel):
    gridLat: float = Field(..., description="Quantized latitude (2 decimal places ~1.1km)")
    gridLon: float = Field(..., description="Quantized longitude (2 decimal places)")
    countryCode: str = Field(..., description="ISO 3166-1 alpha-2")
    zoneId: str = Field(..., description="Air quality basin zone identifier")


class SensorMetadataPayload(BaseModel):
    sensorType: SensorType = Field(..., description="Operational category of sensor hardware")
    calibrationStatus: CalibrationStatus = Field(..., description="Calibration validity")
    firmwareVersion: Optional[str] = Field(None, description="Optional hardware firmware build string")


class ObservationPayload(BaseModel):
    observationId: str = Field(..., description="Unique UUID v4 URN identifier")
    sensorId: str = Field(..., description="Pseudonymous sensor identifier")
    pollutant: Literal["PM2.5"] = Field("PM2.5", description="Target pollutant type")
    value: float = Field(..., description="Measured PM2.5 in ug/m3")
    unit: Literal["ug/m3"] = Field("ug/m3", description="Physical measurement unit")
    timestampObserved: str = Field(..., description="ISO 8601 UTC observation timestamp")
    timestampSubmitted: str = Field(..., description="ISO 8601 UTC submission timestamp")
    location: LocationPayload
    sensorMetadata: SensorMetadataPayload


class ValidationChecks(BaseModel):
    schemaValid: bool
    rangeValid: bool
    timestampFresh: bool
    duplicateDetected: bool


class ValidationResult(BaseModel):
    isValid: bool
    validatedAt: str
    checks: ValidationChecks
    rejectionReasons: List[str] = Field(default_factory=list)


class DeltaRateEvidence(BaseModel):
    previousValue: float
    deltaUgPerM3: float
    timeDeltaMinutes: float
    ratePerMinute: float
    thresholdExceeded: bool


class StuckSensorEvidence(BaseModel):
    consecutiveIdenticalCount: int
    durationMinutes: int


class SpatialPeerEvidence(BaseModel):
    peerCount: int
    peerMean: float
    peerStdDev: float
    zScore: float
    hasContextualData: bool


class AnomalyEvidence(BaseModel):
    deltaRateOfChange: Optional[DeltaRateEvidence] = None
    stuckSensorReading: Optional[StuckSensorEvidence] = None
    spatialPeerComparison: Optional[SpatialPeerEvidence] = None


class AnomalyAssessment(BaseModel):
    score: float = Field(..., ge=0.0, le=1.0)
    severity: AnomalySeverity
    reasonCodes: List[str] = Field(default_factory=list)
    explanation: str
    evidence: AnomalyEvidence
    flaggedForReview: bool


class BlockchainProvenance(BaseModel):
    observationDigest: str
    decisionDigest: Optional[str] = None
    contractAddress: str = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    networkId: str = "hardhat-31337"
    txHash: Optional[str] = None
    blockNumber: Optional[int] = None
    blockTimestamp: Optional[str] = None
    anchoredBy: str = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    status: str = "CONFIRMED"
    verificationUrl: Optional[str] = None


class SubmitObservationRequest(BaseModel):
    observationId: Optional[str] = None
    sensorId: Optional[str] = None
    pollutant: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    timestampObserved: Optional[str] = None
    timestampSubmitted: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    sensorMetadata: Optional[Dict[str, Any]] = None


class SubmitObservationResponse(BaseModel):
    observationId: str
    observationDigest: str
    status: ObservationStatus
    validation: ValidationResult
    anomaly: Optional[AnomalyAssessment] = None
    provenance: BlockchainProvenance
