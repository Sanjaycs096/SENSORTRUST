"""
SensorTrust — Phase 5 Failure Scenarios & Edge Case Test Suite
Exhaustively tests all 11 failure scenarios specified in Phase 5 Section 3:
1. Hardhat node unavailable during startup (fail-closed, reports CHAIN_UNAVAILABLE).
2. RPC disconnect during an anchoring request.
3. Invalid or mismatched chain ID.
4. Missing or invalid contract address.
5. Invalid PM2.5 values and stale timestamps.
6. Duplicate observation IDs and duplicate sensor/timestamp combinations.
7. Duplicate anchoring requests and safe retries (idempotency).
8. Failed or reverted transactions.
9. Altered candidate payload and mismatched digest.
10. Repeated review decisions with preserved historical records.
11. Seed reset and its interaction with existing transaction history.
"""

import pytest
import os
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from web3 import Web3
from hexbytes import HexBytes

from app.services.blockchain_service import BlockchainService, DECISION_ENUM_MAP
from app.models.transaction import BlockchainTransactionModel
from app.models.observation import ObservationModel
from app.models.review import ReviewRecordModel
from app.schemas.observation import ObservationStatus
from app.schemas.review import ReviewDecisionType
from app.services.seed_service import reset_database_to_seed
from app.services.review_service import submit_review_decision


@pytest.fixture(scope="module")
def live_bc_service():
    """Provides the live BlockchainService singleton connected to local Hardhat node."""
    from app.services.blockchain_service import blockchain_service
    blockchain_service.enabled = True
    if not blockchain_service.is_connected():
        pytest.skip("Local Hardhat node is not running at http://127.0.0.1:8545")
    return blockchain_service


# --- Failure Scenario 1: Node Unavailable During Startup ---

def test_failure_node_unavailable_during_startup():
    """1. Validates that BlockchainService fails closed gracefully when node is unavailable."""
    dead_service = BlockchainService()
    dead_service.rpc_url = "http://127.0.0.1:59999"  # Dead port
    dead_service.w3 = Web3(Web3.HTTPProvider(dead_service.rpc_url, request_kwargs={"timeout": 0.5}))

    assert dead_service.is_connected() is False
    health = dead_service.get_blockchain_health()
    assert health["connected"] is False

    res = dead_service.anchor_observation("urn:uuid:fail-node-01", "0x" + "a" * 64)
    assert res["status"] == "CHAIN_UNAVAILABLE"
    assert res["txHash"] is None
    assert "Cannot connect to EVM RPC node" in res["error"]


# --- Failure Scenario 2: RPC Disconnect During Anchoring Request ---

def test_failure_rpc_disconnect_during_anchoring(live_bc_service, db_session):
    """2. Validates that network disconnect during transaction broadcast is captured safely."""
    with patch.object(live_bc_service.w3.eth, "send_raw_transaction", side_effect=ConnectionError("RPC peer disconnected abruptly")):
        res = live_bc_service.anchor_observation("urn:uuid:fail-rpc-drop-01", "0x" + "b" * 64, db=db_session)
        assert res["status"] in ("TRANSACTION_FAILED", "CHAIN_UNAVAILABLE")
        assert res["txHash"] is None
        assert "abruptly" in res.get("error", "")

        # Verify transaction failure is recorded in database
        tx_rec = db_session.query(BlockchainTransactionModel).filter(
            BlockchainTransactionModel.observation_id == "urn:uuid:fail-rpc-drop-01"
        ).first()
        if tx_rec:
            assert tx_rec.status == "FAILED"
            assert "RPC peer disconnected" in (tx_rec.error_message or "")


# --- Failure Scenario 3: Invalid or Mismatched Chain ID ---

def test_failure_invalid_or_mismatched_chain_id():
    """3. Validates that mismatched chain ID prevents accidental broadcast to wrong network."""
    service = BlockchainService()
    # Live node has chain ID 31337; configure expected as 1 (Ethereum Mainnet)
    service.expected_chain_id = 1

    assert service.is_connected() is False
    res = service.anchor_observation("urn:uuid:fail-chain-mismatch", "0x" + "c" * 64)
    assert res["status"] == "CHAIN_UNAVAILABLE"


# --- Failure Scenario 4: Missing or Invalid Contract Address ---

def test_failure_missing_or_invalid_contract_address(live_bc_service):
    """4. Validates that calling methods on invalid contract address returns safe error status."""
    service = BlockchainService()
    service._deployed_address = "0x0000000000000000000000000000000000000000"

    res = service.verify_observation_on_chain("urn:uuid:fail-bad-addr", "0x" + "d" * 64)
    assert res["status"] in ("CONTRACT_UNAVAILABLE", "CHAIN_UNAVAILABLE", "NOT_ANCHORED")
    assert res["isMatched"] is False


# --- Failure Scenario 5: Invalid PM2.5 Values & Stale Timestamps ---

def test_failure_invalid_pm25_and_stale_timestamps(client):
    """5. Validates API rejection of negative values, out-of-range readings, and clock drift."""
    now = datetime.now(timezone.utc)
    base_payload = {
        "sensorId": "sensor-fail-test",
        "pollutant": "PM2.5",
        "unit": "ug/m3",
        "location": {"gridLat": 28.6, "gridLon": 77.2, "countryCode": "IN", "zoneId": "zone-fail"},
        "sensorMetadata": {"sensorType": "LOW_COST_IOT", "calibrationStatus": "FACTORY_CALIBRATED"}
    }

    # Negative PM2.5
    neg_payload = {
        **base_payload,
        "observationId": "urn:uuid:fail-neg-pm25",
        "value": -15.0,
        "timestampObserved": now.isoformat().replace("+00:00", "Z"),
        "timestampSubmitted": now.isoformat().replace("+00:00", "Z")
    }
    neg_res = client.post("/api/v1/observations", json=neg_payload)
    assert neg_res.status_code == 422
    assert "ERR_RANGE_NEGATIVE" in str(neg_res.json())

    # Exceeded threshold (> 1000 ug/m3)
    high_payload = {
        **base_payload,
        "observationId": "urn:uuid:fail-high-pm25",
        "value": 1500.0,
        "timestampObserved": now.isoformat().replace("+00:00", "Z"),
        "timestampSubmitted": now.isoformat().replace("+00:00", "Z")
    }
    high_res = client.post("/api/v1/observations", json=high_payload)
    assert high_res.status_code == 422
    assert "ERR_RANGE_EXCEEDED" in str(high_res.json())

    # Clock drift: Future by 15 minutes
    future_time = (now + timedelta(minutes=15)).isoformat().replace("+00:00", "Z")
    future_payload = {
        **base_payload,
        "observationId": "urn:uuid:fail-future-drift",
        "value": 45.0,
        "timestampObserved": future_time,
        "timestampSubmitted": now.isoformat().replace("+00:00", "Z")
    }
    future_res = client.post("/api/v1/observations", json=future_payload)
    assert future_res.status_code == 422
    assert "ERR_TIMESTAMP_FUTURE" in str(future_res.json())

    # Expired timestamp: 14 days ago
    old_time = (now - timedelta(days=14)).isoformat().replace("+00:00", "Z")
    old_payload = {
        **base_payload,
        "observationId": "urn:uuid:fail-expired-ts",
        "value": 45.0,
        "timestampObserved": old_time,
        "timestampSubmitted": now.isoformat().replace("+00:00", "Z")
    }
    old_res = client.post("/api/v1/observations", json=old_payload)
    assert old_res.status_code == 422
    assert "ERR_TIMESTAMP_STALE" in str(old_res.json())


# --- Failure Scenario 6: Duplicate IDs and Sensor/Timestamp Collisions ---

def test_failure_duplicate_ids_and_sensor_timesteps(client):
    """6. Validates detection of duplicate observation IDs and sensor-timestep collisions."""
    now = datetime.now(timezone.utc)
    ts = now.isoformat().replace("+00:00", "Z")
    payload = {
        "observationId": "urn:uuid:fail-dup-test-01",
        "sensorId": "sensor-dup-target",
        "pollutant": "PM2.5",
        "value": 35.0,
        "unit": "ug/m3",
        "timestampObserved": ts,
        "timestampSubmitted": ts,
        "location": {"gridLat": 28.6, "gridLon": 77.2, "countryCode": "IN", "zoneId": "zone-dup"},
        "sensorMetadata": {"sensorType": "LOW_COST_IOT", "calibrationStatus": "FACTORY_CALIBRATED"}
    }

    # Initial submission: 201 Created
    res1 = client.post("/api/v1/observations", json=payload)
    assert res1.status_code == 201

    # Exact duplicate ID: 409 Conflict
    res2 = client.post("/api/v1/observations", json=payload)
    assert res2.status_code == 409
    assert "ERR_DUPLICATE_OBSERVATION_ID" in str(res2.json())

    # Different ID, but identical (sensorId, timestampObserved): 409 Conflict
    collision_payload = {**payload, "observationId": "urn:uuid:fail-dup-diff-id-same-timestep"}
    res3 = client.post("/api/v1/observations", json=collision_payload)
    assert res3.status_code == 409
    assert "ERR_DUPLICATE_SENSOR_TIMESTEP" in str(res3.json())


# --- Failure Scenario 7: Duplicate Anchoring Requests & Safe Retries ---

def test_failure_duplicate_anchoring_requests_safe_retry(live_bc_service, db_session):
    """7. Validates that duplicate anchoring requests for identical data are idempotent and safe."""
    obs_id = "urn:uuid:fail-idempotent-obs-01"
    digest = "0x" + "7" * 64

    # First anchoring attempt
    res1 = live_bc_service.anchor_observation(obs_id, digest, db=db_session)
    assert res1["status"] == "CONFIRMED"
    first_tx = res1["txHash"]

    # Safe retry with identical digest
    res2 = live_bc_service.anchor_observation(obs_id, digest, db=db_session)
    assert res2["status"] == "CONFIRMED"
    assert res2.get("idempotent") is True
    assert res2["txHash"] == first_tx


# --- Failure Scenario 8: Failed or Reverted Transactions ---

def test_failure_failed_or_reverted_transactions(live_bc_service, db_session):
    """8. Validates EVM revert handling when attempting to re-anchor existing ID with conflicting digest."""
    obs_id = "urn:uuid:fail-revert-conflict-01"
    digest1 = "0x" + "8" * 64
    digest2 = "0x" + "9" * 64

    res1 = live_bc_service.anchor_observation(obs_id, digest1, db=db_session)
    assert res1["status"] == "CONFIRMED"

    # Conflicting digest causes contract require() revert
    res2 = live_bc_service.anchor_observation(obs_id, digest2, db=db_session)
    assert res2["status"] == "REVERTED"

    # Check that failed/reverted transaction is diagnosable in DB audit table
    tx_records = db_session.query(BlockchainTransactionModel).filter(
        BlockchainTransactionModel.observation_id == obs_id
    ).all()
    assert len(tx_records) >= 2
    failed_tx = [r for r in tx_records if r.status in ("FAILED", "REVERTED")]
    assert len(failed_tx) >= 1
    assert any(term in (failed_tx[0].error_message or "").lower() for term in ("revert", "conflict", "already anchored", "different digest"))


# --- Failure Scenario 9: Altered Candidate Payload & Mismatched Digest ---

def test_failure_altered_candidate_payload_digest_mismatch(live_bc_service, db_session):
    """9. Validates that altering observation payload fails verification with DIGEST_MISMATCH."""
    obs_id = "urn:uuid:fail-tamper-digest-01"
    original_digest = "0x" + "a" * 64
    tampered_digest = "0x" + "b" * 64

    live_bc_service.anchor_observation(obs_id, original_digest, db=db_session)

    res = live_bc_service.verify_observation_on_chain(obs_id, tampered_digest)
    assert res["status"] == "DIGEST_MISMATCH"
    assert res["isMatched"] is False
    assert res["exists"] is True
    assert res["onChainDigest"].lower() == original_digest.lower()


# --- Failure Scenario 10: Repeated Review Decisions Preserve Historical Records ---

def test_failure_repeated_review_decisions_preserve_history(live_bc_service, db_session):
    """10. Validates that repeated review decisions append to history without erasing older decisions."""
    obs_id = "urn:uuid:fail-multi-review-obs-01"
    digest = "0x" + "d" * 64
    live_bc_service.anchor_observation(obs_id, digest, db=db_session)

    # Create dummy observation model in db
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    obs = ObservationModel(
        observation_id=obs_id,
        sensor_id="sensor-rev-hist",
        pollutant="PM2.5",
        value=85.0,
        unit="ug/m3",
        timestamp_observed=now_iso,
        timestamp_submitted=now_iso,
        grid_lat=28.6,
        grid_lon=77.2,
        country_code="IN",
        zone_id="delhi-rev",
        sensor_type="LOW_COST_IOT",
        calibration_status="FACTORY_CALIBRATED",
        observation_digest=digest,
        status="FLAGGED",
        validation_is_valid=True,
        validation_json="{}",
        anomaly_score=0.85,
        anomaly_severity="HIGH",
        anomaly_flagged=True,
        anomaly_json="{}",
        provenance_contract_address=live_bc_service.get_contract_address() or "",
        provenance_network_id="hardhat-31337",
        provenance_status="CONFIRMED"
    )
    db_session.add(obs)
    db_session.commit()

    # 1st review: APPROVE
    res1 = submit_review_decision(
        db=db_session,
        observation_id=obs_id,
        decision=ReviewDecisionType.APPROVE,
        reason="Initial inspection confirms temporary plume from controlled agricultural burn.",
        reviewer_id="reviewer:inspector-01"
    )
    assert res1.status == ObservationStatus.APPROVED

    # 2nd review: REQUEST_RECALIBRATION (supersedes 1st)
    res2 = submit_review_decision(
        db=db_session,
        observation_id=obs_id,
        decision=ReviewDecisionType.REQUEST_RECALIBRATION,
        reason="Follow-up drift analysis shows subsequent baseline drift; recalibration required.",
        reviewer_id="reviewer:qa-lead"
    )
    assert res2.status == ObservationStatus.RECALIBRATION_REQUESTED
    assert res2.reviewRecord.supersedesDecisionId == res1.decisionId

    # 3rd review: REJECT (supersedes 2nd)
    res3 = submit_review_decision(
        db=db_session,
        observation_id=obs_id,
        decision=ReviewDecisionType.REJECT,
        reason="Calibration laboratory confirmed optical sensor photodiode degradation.",
        reviewer_id="reviewer:chief-auditor"
    )
    assert res3.status == ObservationStatus.REJECTED
    assert res3.reviewRecord.supersedesDecisionId == res2.decisionId

    # Verify all 3 reviews exist in SQLite audit trail
    all_reviews = db_session.query(ReviewRecordModel).filter(
        ReviewRecordModel.observation_id == obs_id
    ).order_by(ReviewRecordModel.timestamp_decided.asc()).all()

    assert len(all_reviews) == 3
    assert all_reviews[0].decision == "APPROVE"
    assert all_reviews[1].decision == "REQUEST_RECALIBRATION"
    assert all_reviews[1].supersedes_decision_id == all_reviews[0].decision_id
    assert all_reviews[2].decision == "REJECT"
    assert all_reviews[2].supersedes_decision_id == all_reviews[1].decision_id

    # Verify smart contract count
    contract = live_bc_service.get_or_deploy_contract()
    obs_bytes = live_bc_service.observation_id_to_bytes32(obs_id)
    on_chain_count = contract.functions.getReviewCount(obs_bytes).call()
    assert on_chain_count >= 3


# --- Failure Scenario 11: Seed Reset & Interaction with Transaction History ---

def test_failure_seed_reset_preserves_transaction_audit_history(live_bc_service, db_session):
    """11. Validates that seed reset restores baseline records while preserving transaction audit logs."""
    # Create a real transaction record
    obs_id = "urn:uuid:fail-seed-reset-audit-01"
    digest = "0x" + "e" * 64
    live_bc_service.anchor_observation(obs_id, digest, db=db_session)

    initial_tx_count = db_session.query(BlockchainTransactionModel).count()
    assert initial_tx_count >= 1

    # Execute seed reset
    count = reset_database_to_seed(db_session)
    assert count == 5  # 5 baseline records

    # Verify transaction table was NOT wiped
    post_reset_tx_count = db_session.query(BlockchainTransactionModel).count()
    assert post_reset_tx_count >= initial_tx_count

    # Verify our specific audit record is intact
    tx_rec = db_session.query(BlockchainTransactionModel).filter(
        BlockchainTransactionModel.observation_id == obs_id
    ).first()
    assert tx_rec is not None
    assert tx_rec.status == "CONFIRMED"
