"""
SensorTrust — SQLAlchemy Review Decision Model
Represents an accountable human review decision as an append-only historical event.
"""

from typing import TYPE_CHECKING
from sqlalchemy import Column, String, Text, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.observation import ObservationModel


class ReviewRecordModel(Base):
    """Immutable, append-only record of a human triage decision."""

    __tablename__ = "review_records"

    decision_id = Column(String(128), primary_key=True, index=True)
    observation_id = Column(
        String(128),
        ForeignKey("observations.observation_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    reviewer_id = Column(String(128), nullable=False)
    decision = Column(String(32), nullable=False)  # APPROVE, REJECT, REQUEST_RECALIBRATION
    reason = Column(Text, nullable=False)
    timestamp_decided = Column(String(64), nullable=False, index=True)
    supersedes_decision_id = Column(String(128), nullable=True)
    decision_digest = Column(String(128), nullable=False)

    # Blockchain anchoring tracking
    tx_hash = Column(String(128), nullable=True)
    block_number = Column(Integer, nullable=True)
    contract_address = Column(String(128), nullable=True)
    status = Column(String(32), nullable=False, default="CONFIRMED")

    # Relationship back to observation
    observation = relationship("ObservationModel", back_populates="reviews")

    __table_args__ = (
        Index("ix_review_obs_time", "observation_id", "timestamp_decided"),
    )
