"""
SensorTrust — Observation Domain Service
Handles ingestion, deterministic validation, explainable anomaly screening,
persistence, and querying.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.models.observation import ObservationModel
from app.models.review import ReviewRecordModel
from app.schemas.observation import (
    ObservationPayload,
    LocationPayload,
    SensorMetadataPayload,
    ValidationResult,
    AnomalyAssessment,
    BlockchainProvenance,
    ObservationStatus,
    SubmitObservationResponse,
    SensorType,
    CalibrationStatus
)
from app.schemas import EnrichedObservation, ReviewRecord
from app.core.canonicalize import compute_observation_digest
from app.core.validation import validate_observation_payload
from app.core.anomaly import screen_anomalies, HistoricalReading, PeerReading
from app.services.blockchain_service import blockchain_service


def model_to_enriched_schema(model: ObservationModel) -> EnrichedObservation:
    """Converts an ObservationModel database entity to an EnrichedObservation Pydantic schema."""
    validation_data = json.loads(model.validation_json)
    validation = ValidationResult(**validation_data)

    anomaly_data = json.loads(model.anomaly_json)
    anomaly = AnomalyAssessment(**anomaly_data)

    review_history = [
        ReviewRecord(
            decisionId=r.decision_id,
            observationId=r.observation_id,
            reviewerId=r.reviewer_id,
            decision=r.decision,
            reason=r.reason,
            timestampDecided=r.timestamp_decided,
            supersedesDecisionId=r.supersedes_decision_id
        )
        for r in model.reviews
    ]

    latest_review = review_history[0] if review_history else None

    provenance = BlockchainProvenance(
        observationDigest=model.observation_digest,
        decisionDigest=model.provenance_decision_digest,
        contractAddress=model.provenance_contract_address,
        networkId=model.provenance_network_id,
        txHash=model.provenance_tx_hash or "0x0000000000000000000000000000000000000000000000000000000000000000",
        blockNumber=model.provenance_block_number or 0,
        blockTimestamp=model.provenance_block_timestamp or model.timestamp_submitted,
        anchoredBy=model.provenance_anchored_by,
        status=model.provenance_status,
        verificationUrl=model.provenance_verification_url
    )

    observation_payload = ObservationPayload(
        observationId=model.observation_id,
        sensorId=model.sensor_id,
        pollutant=model.pollutant,  # type: ignore
        value=model.value,
        unit=model.unit,  # type: ignore
        timestampObserved=model.timestamp_observed,
        timestampSubmitted=model.timestamp_submitted,
        location=LocationPayload(
            gridLat=model.grid_lat,
            gridLon=model.grid_lon,
            countryCode=model.country_code,
            zoneId=model.zone_id
        ),
        sensorMetadata=SensorMetadataPayload(
            sensorType=model.sensor_type,  # type: ignore
            calibrationStatus=model.calibration_status,  # type: ignore
            firmwareVersion=model.firmware_version
        )
    )

    return EnrichedObservation(
        observation=observation_payload,
        observationDigest=model.observation_digest,
        validation=validation,
        anomaly=anomaly,
        review=latest_review,
        reviewHistory=review_history,
        provenance=provenance,
        status=ObservationStatus(model.status)
    )


def list_observations(
    db: Session,
    status: Optional[str] = None,
    sensor_id: Optional[str] = None,
    basin_zone: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> Tuple[List[EnrichedObservation], int]:
    """Queries paginated observations with optional filtering and search."""
    query = db.query(ObservationModel)

    if status and status != "ALL":
        query = query.filter(ObservationModel.status == status)

    if sensor_id:
        query = query.filter(ObservationModel.sensor_id == sensor_id)

    if basin_zone:
        query = query.filter(ObservationModel.zone_id == basin_zone)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                ObservationModel.observation_id.ilike(term),
                ObservationModel.sensor_id.ilike(term),
                ObservationModel.zone_id.ilike(term),
                ObservationModel.observation_digest.ilike(term)
            )
        )

    total = query.count()
    records = query.order_by(desc(ObservationModel.timestamp_observed)).offset(offset).limit(limit).all()
    items = [model_to_enriched_schema(r) for r in records]
    return items, total


def get_observation_by_id(db: Session, observation_id: str) -> Optional[EnrichedObservation]:
    """Fetches a single enriched observation by its ID."""
    clean_id = observation_id.strip().lower()
    record = db.query(ObservationModel).filter(
        ObservationModel.observation_id.ilike(clean_id)
    ).first()
    if not record:
        return None
    return model_to_enriched_schema(record)


def submit_observation(db: Session, payload_dict: Dict[str, Any]) -> SubmitObservationResponse:
    """
    Validates, screens, canonicalizes, and persists an observation record.
    Invalid data is safely rejected without polluting the database.
    """
    obs_id = payload_dict.get("observationId")
    sensor_id = payload_dict.get("sensorId")
    timestamp_observed = payload_dict.get("timestampObserved")

    # Check for existing duplicate IDs in DB
    existing_id = None
    if obs_id:
        existing_id = db.query(ObservationModel.observation_id).filter(
            ObservationModel.observation_id == obs_id
        ).first()

    # Check for existing duplicate sensor timestep in DB
    existing_step = None
    if sensor_id and timestamp_observed:
        existing_step = db.query(ObservationModel.observation_id).filter(
            ObservationModel.sensor_id == sensor_id,
            ObservationModel.timestamp_observed == timestamp_observed
        ).first()

    known_ids = {existing_id[0]} if existing_id else set()
    known_timesteps = {f"{sensor_id}:{timestamp_observed}"} if existing_step else set()

    # 1. Deterministic Validation
    validation = validate_observation_payload(
        payload=payload_dict,
        known_observation_ids=known_ids,
        known_sensor_timesteps=known_timesteps
    )

    if not validation.isValid:
        # Invalid data is rejected per contract without persistence
        dummy_digest = "0x0000000000000000000000000000000000000000000000000000000000000000"
        return SubmitObservationResponse(
            observationId=obs_id or "unknown-invalid-id",
            observationDigest=dummy_digest,
            status=ObservationStatus.INVALID,
            validation=validation,
            provenance=BlockchainProvenance(
                observationDigest=dummy_digest,
                contractAddress="0x5FbDB2315678afecb367f032d93F642f64180aa3",
                networkId="hardhat-31337",
                txHash=dummy_digest,
                blockNumber=0,
                blockTimestamp=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                anchoredBy="0x0000000000000000000000000000000000000000",
                status="FAILED"
            )
        )

    # 2. Cryptographic Canonicalization & SHA-256 Digest
    observation_digest = compute_observation_digest(payload_dict)

    # 3. Retrieve Historical Context for Sensor from Database
    historical_records = db.query(ObservationModel).filter(
        ObservationModel.sensor_id == sensor_id
    ).order_by(asc(ObservationModel.timestamp_observed)).all()

    history = [
        HistoricalReading(value=r.value, timestamp=r.timestamp_observed)
        for r in historical_records
    ]

    # 4. Retrieve Spatial Peers in the same basin zone
    zone_id = payload_dict["location"]["zoneId"]
    peer_records = db.query(ObservationModel).filter(
        ObservationModel.zone_id == zone_id,
        ObservationModel.sensor_id != sensor_id
    ).all()

    spatial_peers = [
        PeerReading(sensor_id=p.sensor_id, value=p.value, distance_km=1.2)
        for p in peer_records
    ]

    # 5. Screen for Anomalies
    anomaly = screen_anomalies(
        current_value=float(payload_dict["value"]),
        current_timestamp=payload_dict["timestampObserved"],
        calibration_status=payload_dict["sensorMetadata"]["calibrationStatus"],
        history=history,
        spatial_peers=spatial_peers
    )

    initial_status = (
        ObservationStatus.FLAGGED
        if anomaly.flaggedForReview
        else ObservationStatus.APPROVED
    )

    # 6. Real EVM Blockchain Anchoring (Phase 4)
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    anchor_result = blockchain_service.anchor_observation(
        observation_id=payload_dict["observationId"],
        observation_digest=observation_digest,
        db=db
    )

    if anchor_result.get("status") == "CONFIRMED":
        block_num = anchor_result.get("blockNumber")
        provenance = BlockchainProvenance(
            observationDigest=observation_digest,
            contractAddress=anchor_result.get("contractAddress") or blockchain_service.get_contract_address() or "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            networkId=f"hardhat-{anchor_result.get('chainId', 31337)}",
            txHash=anchor_result.get("txHash"),
            blockNumber=block_num,
            blockTimestamp=anchor_result.get("blockTimestamp") or now_iso,
            anchoredBy=anchor_result.get("anchoredBy") or "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            status="CONFIRMED",
            verificationUrl=f"#local-hardhat-block-{block_num}" if block_num is not None else None
        )
    elif anchor_result.get("status") in ("CHAIN_UNAVAILABLE", "CONTRACT_UNAVAILABLE"):
        provenance = BlockchainProvenance(
            observationDigest=observation_digest,
            contractAddress=blockchain_service.get_contract_address() or "UNAVAILABLE",
            networkId=f"hardhat-31337",
            txHash=None,
            blockNumber=None,
            blockTimestamp=now_iso,
            anchoredBy="N/A",
            status="NOT_ANCHORED",
            verificationUrl=None
        )
    else:
        # FAILED or REVERTED
        provenance = BlockchainProvenance(
            observationDigest=observation_digest,
            contractAddress=anchor_result.get("contractAddress") or blockchain_service.get_contract_address() or "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            networkId="hardhat-31337",
            txHash=anchor_result.get("txHash"),
            blockNumber=None,
            blockTimestamp=now_iso,
            anchoredBy="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            status="FAILED",
            verificationUrl=None
        )

    # 7. Persist to Database
    db_observation = ObservationModel(
        observation_id=payload_dict["observationId"],
        sensor_id=payload_dict["sensorId"],
        pollutant=payload_dict["pollutant"],
        value=float(payload_dict["value"]),
        unit=payload_dict["unit"],
        timestamp_observed=payload_dict["timestampObserved"],
        timestamp_submitted=payload_dict.get("timestampSubmitted") or now_iso,
        grid_lat=float(payload_dict["location"]["gridLat"]),
        grid_lon=float(payload_dict["location"]["gridLon"]),
        country_code=payload_dict["location"]["countryCode"],
        zone_id=payload_dict["location"]["zoneId"],
        sensor_type=payload_dict["sensorMetadata"]["sensorType"],
        calibration_status=payload_dict["sensorMetadata"]["calibrationStatus"],
        firmware_version=payload_dict["sensorMetadata"].get("firmwareVersion"),
        observation_digest=observation_digest,
        status=initial_status.value,
        validation_is_valid=validation.isValid,
        validation_json=validation.model_dump_json(),
        anomaly_score=anomaly.score,
        anomaly_severity=anomaly.severity.value,
        anomaly_flagged=anomaly.flaggedForReview,
        anomaly_json=anomaly.model_dump_json(),
        provenance_contract_address=provenance.contractAddress,
        provenance_network_id=provenance.networkId,
        provenance_tx_hash=provenance.txHash,
        provenance_block_number=provenance.blockNumber,
        provenance_block_timestamp=provenance.blockTimestamp,
        provenance_anchored_by=provenance.anchoredBy,
        provenance_status=provenance.status,
        provenance_verification_url=provenance.verificationUrl,
        is_seed=False
    )

    db.add(db_observation)
    db.commit()
    db.refresh(db_observation)

    return SubmitObservationResponse(
        observationId=db_observation.observation_id,
        observationDigest=observation_digest,
        status=initial_status,
        validation=validation,
        anomaly=anomaly,
        provenance=provenance
    )
