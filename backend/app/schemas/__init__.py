"""
SensorTrust — Schemas Package
"""

from typing import List, Optional
from pydantic import BaseModel

from app.schemas.observation import (
    ObservationStatus,
    SensorType,
    CalibrationStatus,
    AnomalySeverity,
    LocationPayload,
    SensorMetadataPayload,
    ObservationPayload,
    ValidationChecks,
    ValidationResult,
    DeltaRateEvidence,
    StuckSensorEvidence,
    SpatialPeerEvidence,
    AnomalyEvidence,
    AnomalyAssessment,
    BlockchainProvenance,
    SubmitObservationRequest,
    SubmitObservationResponse
)
from app.schemas.review import (
    ReviewDecisionType,
    ReviewRecord,
    ReviewDecisionRequest,
    ReviewDecisionResponse,
    BlockchainTxReceipt
)
from app.schemas.provenance import (
    VerifyProvenanceRequest,
    VerificationResponse
)
from app.schemas.metrics import MetricsSummaryResponse
from app.schemas.health import HealthResponse, BlockchainHealth


class EnrichedObservation(BaseModel):
    observation: ObservationPayload
    observationDigest: str
    validation: ValidationResult
    anomaly: AnomalyAssessment
    review: Optional[ReviewRecord] = None
    reviewHistory: List[ReviewRecord] = []
    provenance: BlockchainProvenance
    status: ObservationStatus


class PaginatedObservationsResponse(BaseModel):
    items: List[EnrichedObservation]
    total: int
    limit: int
    offset: int


class ErrorDetail(BaseModel):
    loc: Optional[List[str]] = None
    msg: str
    type: Optional[str] = None


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None
