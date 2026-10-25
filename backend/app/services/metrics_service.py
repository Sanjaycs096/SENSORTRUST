"""
SensorTrust — Metrics Calculation Service
Dynamically computes dashboard KPI metrics directly from persisted database records.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from app.models.observation import ObservationModel
from app.schemas.metrics import MetricsSummaryResponse
from app.schemas.observation import ObservationStatus


def calculate_metrics_summary(db: Session) -> MetricsSummaryResponse:
    """Calculates live KPI metrics from authoritative database records."""
    total = db.query(ObservationModel).count()

    flagged = db.query(ObservationModel).filter(
        ObservationModel.status.in_([
            ObservationStatus.FLAGGED.value,
            ObservationStatus.PENDING_REVIEW.value
        ])
    ).count()

    pending_reviews = flagged

    anchored = db.query(ObservationModel).filter(
        ObservationModel.provenance_status == "CONFIRMED"
    ).count()

    rejected = db.query(ObservationModel).filter(
        ObservationModel.status == ObservationStatus.REJECTED.value
    ).count()

    avg_pm25_raw = db.query(func.avg(ObservationModel.value)).scalar()
    avg_pm25 = round(float(avg_pm25_raw), 1) if avg_pm25_raw is not None else 0.0

    active_sensors = db.query(
        func.count(distinct(ObservationModel.sensor_id))
    ).scalar() or 0

    return MetricsSummaryResponse(
        totalObservations=total,
        flaggedCount=flagged,
        pendingReviewsCount=pending_reviews,
        anchoredCount=anchored,
        rejectedCount=rejected,
        averagePm25=avg_pm25,
        activeSensorsCount=active_sensors,
        networkStatus="OPERATIONAL",
        chainConnected=True,
        activeBasin="Multi-Basin Monitor (Delhi NCR / BLR / LA / London)"
    )
