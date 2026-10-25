"""
SensorTrust — API v1 Router Configuration
Aggregates all versioned endpoints under /api/v1.
"""

from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.observations import router as observations_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.provenance import router as provenance_router
from app.api.v1.metrics import router as metrics_router
from app.api.v1.seed import router as seed_router
from app.api.v1.blockchain import router as blockchain_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health_router)
api_v1_router.include_router(observations_router)
api_v1_router.include_router(reviews_router)
api_v1_router.include_router(provenance_router)
api_v1_router.include_router(metrics_router)
api_v1_router.include_router(seed_router)
api_v1_router.include_router(blockchain_router)

__all__ = ["api_v1_router"]
