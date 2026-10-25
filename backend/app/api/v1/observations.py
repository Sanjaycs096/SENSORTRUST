"""
SensorTrust — Observations API Endpoints
Handles observation submission, physical validation, anomaly screening,
persistence, listing, and detailed lookup.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.observation import (
    SubmitObservationResponse,
    ObservationStatus
)
from app.schemas import (
    EnrichedObservation,
    PaginatedObservationsResponse,
    ErrorResponse
)
from app.services.observation_service import (
    list_observations,
    get_observation_by_id,
    submit_observation
)

router = APIRouter(prefix="/observations", tags=["Observations"])


@router.post(
    "",
    response_model=SubmitObservationResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": SubmitObservationResponse, "description": "Validation or schema rejected"},
        409: {"model": SubmitObservationResponse, "description": "Duplicate ID or timestep detected"},
        422: {"model": SubmitObservationResponse, "description": "Physical bounds violated"}
    }
)
def create_observation(
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Ingests atmospheric observation telemetry.
    Executes deterministic physical validation, duplicate checks, explainable anomaly screening,
    canonical SHA-256 digest calculation, and persistent storage.
    """
    res = submit_observation(db, payload)

    if not res.validation.isValid:
        if res.validation.checks.duplicateDetected:
            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content=res.model_dump()
            )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=res.model_dump()
        )

    return res


@router.get(
    "",
    response_model=PaginatedObservationsResponse,
    status_code=status.HTTP_200_OK
)
def get_observations(
    status: Optional[str] = Query(None, description="Filter by status e.g. APPROVED, FLAGGED, PENDING_REVIEW, ALL"),
    sensor_id: Optional[str] = Query(None, alias="sensorId", description="Filter by sensor ID"),
    basin_zone: Optional[str] = Query(None, alias="basinZone", description="Filter by air quality basin zone ID"),
    search: Optional[str] = Query(None, description="Free-text search by ID, sensor, zone, or digest"),
    limit: int = Query(50, ge=1, le=100, description="Page size limit"),
    offset: int = Query(0, ge=0, description="Offset index"),
    db: Session = Depends(get_db)
):
    """Retrieves paginated observations ordered by observation timestamp descending."""
    items, total = list_observations(
        db=db,
        status=status,
        sensor_id=sensor_id,
        basin_zone=basin_zone,
        search=search,
        limit=limit,
        offset=offset
    )
    return PaginatedObservationsResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset
    )


@router.get(
    "/{observation_id}",
    response_model=EnrichedObservation,
    status_code=status.HTTP_200_OK,
    responses={404: {"model": ErrorResponse, "description": "Observation not found"}}
)
def get_single_observation(
    observation_id: str,
    db: Session = Depends(get_db)
):
    """Retrieves a single authoritative observation by URN or UUID."""
    record = get_observation_by_id(db, observation_id)
    if not record:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "code": "ERR_OBSERVATION_NOT_FOUND",
                "message": f"Observation with identifier '{observation_id}' not found in registry."
            }
        )
    return record
