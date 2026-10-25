"""
SensorTrust — Reviewer Workspace API Endpoints
Provides triage queue retrieval and atomic human review decision submission.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.review import (
    ReviewDecisionRequest,
    ReviewDecisionResponse
)
from app.schemas import EnrichedObservation, ErrorResponse
from app.services.review_service import (
    get_review_queue,
    submit_review_decision,
    ReviewValidationError,
    ObservationNotFoundError
)

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.get(
    "/queue",
    response_model=List[EnrichedObservation],
    status_code=status.HTTP_200_OK
)
def get_triage_queue(
    severity: Optional[str] = Query(None, description="Filter by anomaly severity e.g. CRITICAL, HIGH, MEDIUM, ALL"),
    db: Session = Depends(get_db)
):
    """Returns observations flagged for human review, sorted highest anomaly score first."""
    return get_review_queue(db=db, severity=severity)


@router.post(
    "/{observation_id}/decision",
    response_model=ReviewDecisionResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error e.g. justification too short"},
        404: {"model": ErrorResponse, "description": "Observation not found"}
    }
)
def post_review_decision(
    observation_id: str,
    body: ReviewDecisionRequest,
    db: Session = Depends(get_db)
):
    """
    Submits an accountable human decision on a flagged observation.
    Requires at least 10 characters justification. Records an append-only historical event.
    """
    try:
        res = submit_review_decision(
            db=db,
            observation_id=observation_id,
            decision=body.decision,
            reason=body.reason,
            reviewer_id=body.reviewerId
        )
        return res
    except ReviewValidationError as ve:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "code": "ERR_REVIEW_JUSTIFICATION_REQUIRED",
                "message": str(ve)
            }
        )
    except ObservationNotFoundError as ne:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "code": "ERR_OBSERVATION_NOT_FOUND",
                "message": str(ne)
            }
        )
