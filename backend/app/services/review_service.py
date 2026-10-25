"""
SensorTrust — Reviewer Domain Service
Manages triage queue retrieval, human decision processing,
append-only history recording, and decision digest anchoring.
"""

import uuid
import time
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.observation import ObservationModel
from app.models.review import ReviewRecordModel
from app.schemas.observation import ObservationStatus, AnomalySeverity
from app.schemas.review import (
    ReviewDecisionType,
    ReviewDecisionResponse,
    ReviewRecord,
    BlockchainTxReceipt
)
from app.schemas import EnrichedObservation
from app.services.observation_service import model_to_enriched_schema
from app.core.canonicalize import compute_review_digest
from app.services.blockchain_service import blockchain_service


class ReviewValidationError(Exception):
    pass


class ObservationNotFoundError(Exception):
    pass


def get_review_queue(
    db: Session,
    severity: Optional[str] = None
) -> List[EnrichedObservation]:
    """Retrieves all pending observations requiring human review."""
    query = db.query(ObservationModel).filter(
        ObservationModel.status.in_([
            ObservationStatus.FLAGGED.value,
            ObservationStatus.PENDING_REVIEW.value
        ])
    )

    if severity and severity != "ALL":
        query = query.filter(ObservationModel.anomaly_severity == severity)

    # Sort highest anomaly score first
    records = query.order_by(desc(ObservationModel.anomaly_score)).all()
    return [model_to_enriched_schema(r) for r in records]


def submit_review_decision(
    db: Session,
    observation_id: str,
    decision: ReviewDecisionType,
    reason: str,
    reviewer_id: Optional[str] = None
) -> ReviewDecisionResponse:
    """
    Submits an accountable review decision.
    Validates minimum 10-char reason, records an immutable historical event,
    updates observation lifecycle state, and calculates decision digest atomically.
    """
    clean_reason = reason.strip() if reason else ""
    if len(clean_reason) < 10:
        raise ReviewValidationError(
            "ERR_REVIEW_JUSTIFICATION_REQUIRED: Decision justification must be at least 10 characters."
        )

    clean_id = observation_id.strip().lower()
    obs = db.query(ObservationModel).filter(
        ObservationModel.observation_id.ilike(clean_id)
    ).first()

    if not obs:
        raise ObservationNotFoundError(
            f"ERR_OBSERVATION_NOT_FOUND: Record '{observation_id}' not found in registry."
        )

    # Find latest existing review for supersedes pointer
    latest_review = db.query(ReviewRecordModel).filter(
        ReviewRecordModel.observation_id == obs.observation_id
    ).order_by(desc(ReviewRecordModel.timestamp_decided)).first()
    supersedes_id = latest_review.decision_id if latest_review else None

    decision_id = f"urn:uuid:dec-{uuid.uuid4().hex[:7]}-{int(time.time())}"
    timestamp_decided = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    effective_reviewer = reviewer_id.strip() if reviewer_id and reviewer_id.strip() else "reviewer:officer-auth0|certified"

    decision_dict = {
        "decisionId": decision_id,
        "observationId": obs.observation_id,
        "reviewerId": effective_reviewer,
        "decision": decision.value,
        "reason": clean_reason,
        "timestampDecided": timestamp_decided,
    }
    if supersedes_id:
        decision_dict["supersedesDecisionId"] = supersedes_id

    decision_digest = compute_review_digest(decision_dict)

    # Lifecycle state transition
    if decision == ReviewDecisionType.APPROVE:
        next_status = ObservationStatus.APPROVED
    elif decision == ReviewDecisionType.REJECT:
        next_status = ObservationStatus.REJECTED
    elif decision == ReviewDecisionType.REQUEST_RECALIBRATION:
        next_status = ObservationStatus.RECALIBRATION_REQUESTED
    else:
        next_status = ObservationStatus.APPROVED

    # Real EVM Blockchain Review Anchoring (Phase 4)
    anchor_result = blockchain_service.record_review_decision(
        observation_id=obs.observation_id,
        decision_digest=decision_digest,
        decision=decision.value,
        reason_metadata_uri=f"urn:sensortrust:review:{decision_id}",
        db=db
    )

    is_confirmed = anchor_result.get("status") == "CONFIRMED"
    real_tx_hash = anchor_result.get("txHash")
    real_block_number = anchor_result.get("blockNumber")
    real_timestamp = anchor_result.get("blockTimestamp") or timestamp_decided
    contract_addr = anchor_result.get("contractAddress") or blockchain_service.get_contract_address()

    # Update observation model
    obs.status = next_status.value
    obs.provenance_decision_digest = decision_digest
    if real_block_number is not None:
        obs.provenance_block_number = real_block_number
    if real_tx_hash:
        obs.provenance_tx_hash = real_tx_hash
    obs.provenance_block_timestamp = real_timestamp

    # Create Review Record Entity
    review_record_model = ReviewRecordModel(
        decision_id=decision_id,
        observation_id=obs.observation_id,
        reviewer_id=effective_reviewer,
        decision=decision.value,
        reason=clean_reason,
        timestamp_decided=timestamp_decided,
        supersedes_decision_id=supersedes_id,
        decision_digest=decision_digest,
        tx_hash=real_tx_hash,
        block_number=real_block_number,
        contract_address=contract_addr,
        status="CONFIRMED" if is_confirmed else "NOT_ANCHORED"
    )

    db.add(review_record_model)
    db.commit()
    db.refresh(obs)

    review_schema = ReviewRecord(
        decisionId=decision_id,
        observationId=obs.observation_id,
        reviewerId=effective_reviewer,
        decision=decision,
        reason=clean_reason,
        timestampDecided=timestamp_decided,
        supersedesDecisionId=supersedes_id
    )

    return ReviewDecisionResponse(
        decisionId=decision_id,
        observationId=obs.observation_id,
        decision=decision,
        status=next_status,
        decisionDigest=decision_digest,
        blockchainTx=BlockchainTxReceipt(
            txHash=real_tx_hash,
            blockNumber=real_block_number,
            blockTimestamp=real_timestamp,
            contractAddress=contract_addr,
            status="CONFIRMED" if is_confirmed else "NOT_ANCHORED"
        ),
        reviewRecord=review_schema
    )
