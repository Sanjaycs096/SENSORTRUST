"""
SensorTrust — Pydantic Schemas for Provenance Verification
"""

from typing import Optional, Any, Literal
from pydantic import BaseModel, Field


class VerifyProvenanceRequest(BaseModel):
    observationId: str = Field(..., description="Target observation URN identifier to verify")
    candidatePayload: Any = Field(..., description="Candidate observation dictionary or object to test")


class VerificationResponse(BaseModel):
    isMatched: bool
    existsOnChain: bool
    recomputedDigest: str
    onChainDigest: str
    blockNumber: Optional[int] = None
    blockTimestamp: Optional[str] = None
    submitter: Optional[str] = None
    verificationLevel: Literal["LOCAL_RECOMPUTATION", "BACKEND_VERIFIED", "ON_CHAIN_CONFIRMED"]
    onChainStatus: Optional[str] = None
    explanation: str

