"""
SensorTrust — Demo Seed Management Endpoint
Allows resetting demo fixtures to default baseline records.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.seed_service import reset_database_to_seed

router = APIRouter(prefix="/seed", tags=["Seed"])


@router.post(
    "/reset",
    status_code=status.HTTP_200_OK
)
def reset_seed_data(db: Session = Depends(get_db)):
    """Resets the persistent database back to the pristine 5 demo baseline observations."""
    count = reset_database_to_seed(db)
    return {
        "status": "SUCCESS",
        "message": f"Successfully reset database to {count} baseline demo records."
    }
