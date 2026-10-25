"""
SensorTrust — Pydantic Schemas for Aggregated Dashboard Metrics
"""

from typing import Literal
from pydantic import BaseModel


class MetricsSummaryResponse(BaseModel):
    totalObservations: int
    flaggedCount: int
    pendingReviewsCount: int
    anchoredCount: int
    rejectedCount: int
    averagePm25: float
    activeSensorsCount: int
    networkStatus: Literal["OPERATIONAL", "DEGRADED"]
    chainConnected: bool
    activeBasin: str
