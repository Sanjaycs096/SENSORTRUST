"""
SensorTrust — Pydantic Schemas for Human Reviews
"""

from enum import Enum
from typing import Optional, Dict
from pydantic import BaseModel, Field
from app.schemas.observation import ObservationStatus


class ReviewDecisionType(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    REQUEST_RECALIBRATION = "REQUEST_RECALIBRATION"


class ReviewRecord(BaseModel):
    decisionId: str
    observationId: str
    reviewerId: str
    decision: ReviewDecisionType
    reason: str
    timestampDecided: str
    supersedesDecisionId: Optional[str] = None


class ReviewDecisionRequest(BaseModel):
    decision: ReviewDecisionType
    reason: str = Field(..., description="Mandatory human justification (minimum 10 characters)")
    reviewerId: Optional[str] = Field("reviewer:officer-auth0|certified", description="Triage reviewer identifier")


class BlockchainTxReceipt(BaseModel):
    txHash: Optional[str] = None
    blockNumber: Optional[int] = None
    blockTimestamp: Optional[str] = None
    contractAddress: Optional[str] = None
    status: str = "CONFIRMED"


class ReviewDecisionResponse(BaseModel):
    decisionId: str
    observationId: str
    decision: ReviewDecisionType
    status: ObservationStatus
    decisionDigest: str
    blockchainTx: BlockchainTxReceipt
    reviewRecord: ReviewRecord
