"""
SensorTrust — Provenance Explorer & Verification API Endpoints
Provides independent cryptographic digest verification against stored on-chain state.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.provenance import (
    VerifyProvenanceRequest,
    VerificationResponse
)
from app.services.provenance_service import verify_payload_provenance

router = APIRouter(prefix="/provenance", tags=["Provenance"])


@router.post(
    "/verify",
    response_model=VerificationResponse,
    status_code=status.HTTP_200_OK
)
def verify_provenance(
    body: VerifyProvenanceRequest,
    db: Session = Depends(get_db)
):
    """
    Independently verifies whether candidate observation payload matches
    the authoritative SHA-256 canonical digest recorded on the blockchain or database.
    """
    return verify_payload_provenance(
        db=db,
        observation_id=body.observationId,
        candidate_payload=body.candidatePayload
    )
