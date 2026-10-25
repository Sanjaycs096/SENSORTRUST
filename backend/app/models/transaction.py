"""
SensorTrust — SQLAlchemy Blockchain Transaction Tracking Model
Records all submitted, confirmed, failed, or reverted blockchain operations.
Enables reliable diagnostics, audit trails, and retry history without secrets.
"""

from sqlalchemy import Column, Integer, String, Text, Index
from app.database import Base


class BlockchainTransactionModel(Base):
    """Immutable audit record of an EVM transaction attempt."""

    __tablename__ = "blockchain_transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    operation_type = Column(String(64), nullable=False, index=True)  # ANCHOR_OBSERVATION, RECORD_REVIEW_DECISION
    observation_id = Column(String(128), nullable=False, index=True)
    digest = Column(String(128), nullable=False, index=True)
    tx_hash = Column(String(128), nullable=True, index=True)
    chain_id = Column(Integer, nullable=False)
    contract_address = Column(String(128), nullable=False)
    status = Column(String(32), nullable=False, default="PENDING", index=True)  # PENDING, CONFIRMED, FAILED, REVERTED
    block_number = Column(Integer, nullable=True)
    gas_used = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(String(64), nullable=False)
    updated_at = Column(String(64), nullable=False)

    __table_args__ = (
        Index("ix_tx_obs_op", "observation_id", "operation_type"),
    )
