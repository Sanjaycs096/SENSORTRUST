"""
SensorTrust — SQLAlchemy Observation Model
Stores physical measurements, quantized location, validation checks,
explainable anomaly evidence, and blockchain provenance state.
"""

from typing import List, TYPE_CHECKING
from sqlalchemy import (
    Column,
    String,
    Float,
    Boolean,
    Integer,
    Text,
    UniqueConstraint,
    Index
)
from sqlalchemy.orm import relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.review import ReviewRecordModel


class ObservationModel(Base):
    """Authoritative persistent record of an environmental observation."""

    __tablename__ = "observations"

    # Core observation identifier
    observation_id = Column(String(128), primary_key=True, index=True)
    sensor_id = Column(String(128), nullable=False, index=True)
    pollutant = Column(String(32), nullable=False, default="PM2.5")
    value = Column(Float, nullable=False)
    unit = Column(String(32), nullable=False, default="ug/m3")
    timestamp_observed = Column(String(64), nullable=False, index=True)
    timestamp_submitted = Column(String(64), nullable=False)

    # Privacy-quantized location (0.01 degree grid cell resolution)
    grid_lat = Column(Float, nullable=False)
    grid_lon = Column(Float, nullable=False)
    country_code = Column(String(8), nullable=False)
    zone_id = Column(String(128), nullable=False, index=True)

    # Sensor metadata
    sensor_type = Column(String(64), nullable=False)
    calibration_status = Column(String(64), nullable=False)
    firmware_version = Column(String(64), nullable=True)

    # Immutable observation digest (RFC 8785 canonical hash)
    observation_digest = Column(String(128), nullable=False, index=True)

    # Current lifecycle status
    status = Column(String(64), nullable=False, default="APPROVED", index=True)

    # Deterministic validation outcome (JSON serialized string)
    validation_is_valid = Column(Boolean, nullable=False, default=True)
    validation_json = Column(Text, nullable=False)

    # Explainable anomaly assessment (JSON serialized string)
    anomaly_score = Column(Float, nullable=False, default=0.0)
    anomaly_severity = Column(String(32), nullable=False, default="NORMAL", index=True)
    anomaly_flagged = Column(Boolean, nullable=False, default=False)
    anomaly_json = Column(Text, nullable=False)

    # Provenance metadata (anchoring state)
    provenance_contract_address = Column(
        String(128),
        nullable=False,
        default="0x5FbDB2315678afecb367f032d93F642f64180aa3"
    )
    provenance_network_id = Column(String(64), nullable=False, default="hardhat-31337")
    provenance_tx_hash = Column(String(128), nullable=True)
    provenance_block_number = Column(Integer, nullable=True)
    provenance_block_timestamp = Column(String(64), nullable=True)
    provenance_anchored_by = Column(
        String(128),
        nullable=False,
        default="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    )
    provenance_status = Column(String(32), nullable=False, default="CONFIRMED")
    provenance_verification_url = Column(String(256), nullable=True)
    provenance_decision_digest = Column(String(128), nullable=True)

    # Transparency flag: distinguishes initial baseline demo fixtures from real ingestions
    is_seed = Column(Boolean, nullable=False, default=False)

    # Append-only review audit history
    reviews = relationship(
        "ReviewRecordModel",
        back_populates="observation",
        cascade="all, delete-orphan",
        order_by="desc(ReviewRecordModel.timestamp_decided)"
    )

    __table_args__ = (
        # Enforce no duplicate sensor readings at the exact same timestep
        UniqueConstraint("sensor_id", "timestamp_observed", name="uq_sensor_timestep"),
        Index("ix_obs_zone_timestamp", "zone_id", "timestamp_observed"),
    )
