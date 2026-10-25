"""
SensorTrust — Dashboard Metrics API Endpoint
Calculates live aggregated KPI metrics from persisted observation records.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.metrics import MetricsSummaryResponse
from app.services.metrics_service import calculate_metrics_summary

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get(
    "/summary",
    response_model=MetricsSummaryResponse,
    status_code=status.HTTP_200_OK
)
def get_metrics_summary(db: Session = Depends(get_db)):
    """Calculates network KPIs directly from the active SQLite database."""
    return calculate_metrics_summary(db=db)
