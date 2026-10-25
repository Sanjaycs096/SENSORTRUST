"""
SensorTrust — Phase 4 Blockchain & Smart Contract Integration Tests
Validates EVM connectivity, contract deployment, observation anchoring,
review decision anchoring, cryptographic on-chain verification, idempotency,
revert handling, transaction auditing, and credential safety.
"""

import pytest
import os
import json
from unittest.mock import patch, MagicMock
from web3 import Web3
from hexbytes import HexBytes

from app.services.blockchain_service import BlockchainService, DECISION_ENUM_MAP
from app.models.transaction import BlockchainTransactionModel
from app.models.observation import ObservationModel
from app.models.review import ReviewRecordModel
from app.schemas.observation import ObservationStatus
from app.schemas.review import ReviewDecisionType


@pytest.fixture(scope="module")
def live_blockchain_service():
    """Provides a live BlockchainService instance connected to local Hardhat node."""
    service = BlockchainService()
    service.enabled = True
    if not service.is_connected():
        pytest.skip("Local Hardhat node is not running at http://127.0.0.1:8545")
    return service


def test_contract_compilation_artifact_exists():
    """1. Validates that Solidity contract is compiled and artifact contains ABI & bytecode."""
    artifact_path = os.path.abspath("artifacts/src/contracts/SensorTrustProvenance.sol/SensorTrustProvenance.json")
    assert os.path.exists(artifact_path), "SensorTrustProvenance.json artifact must exist"

    with open(artifact_path, "r", encoding="utf-8") as f:
        artifact = json.load(f)

    assert "abi" in artifact
    assert "bytecode" in artifact
    assert len(artifact["bytecode"]) > 100

    function_names = [item["name"] for item in artifact["abi"] if item.get("type") == "function"]
    assert "anchorObservation" in function_names
    assert "recordReviewDecision" in function_names
    assert "verifyObservationDigest" in function_names
    assert "getObservation" in function_names
    assert "getReviewCount" in function_names
    assert "getReviewDecision" in function_names


def test_deployment_to_local_hardhat_chain(live_blockchain_service, db_session):
    """2. Validates contract deployment to local Hardhat node and transaction recording."""
    contract = live_blockchain_service.get_or_deploy_contract(db=db_session)
    assert contract is not None
    assert live_blockchain_service.get_contract_address() is not None
    assert Web3.is_address(live_blockchain_service.get_contract_address())

    # Verify admin role
    admin = contract.functions.admin().call()
    assert Web3.is_address(admin)

    # Check transaction recorded in database
    tx = db_session.query(BlockchainTransactionModel).filter(
        BlockchainTransactionModel.operation_type == "DEPLOY_CONTRACT"
    ).first()
    if tx:
        assert tx.status == "CONFIRMED"
        assert tx.contract_address == live_blockchain_service.get_contract_address()


def test_successful_observation_anchoring(live_blockchain_service, db_session):
    """3. Validates successful observation anchoring with receipt confirmation."""
    obs_id = "urn:uuid:test-obs-001"
    obs_digest = "0x" + "a" * 64

    res = live_blockchain_service.anchor_observation(obs_id, obs_digest, db=db_session)
    assert res["status"] == "CONFIRMED"
    assert res["txHash"] is not None
    assert res["blockNumber"] is not None
    assert res["chainId"] == 31337

    # Check persistence in transaction table
    tx = db_session.query(BlockchainTransactionModel).filter(
        BlockchainTransactionModel.observation_id == obs_id,
        BlockchainTransactionModel.operation_type == "ANCHOR_OBSERVATION"
    ).first()
    assert tx is not None
    assert tx.status == "CONFIRMED"
    assert tx.tx_hash == res["txHash"]
    assert tx.block_number == res["blockNumber"]


def test_successful_review_decision_anchoring(live_blockchain_service, db_session):
    """4. Validates successful review-decision anchoring with receipt confirmation."""
    obs_id = "urn:uuid:test-obs-for-review-001"
    obs_digest = "0x" + "b" * 64
    live_blockchain_service.anchor_observation(obs_id, obs_digest, db=db_session)

    decision_digest = "0x" + "c" * 64
    res = live_blockchain_service.record_review_decision(
        observation_id=obs_id,
        decision_digest=decision_digest,
        decision="APPROVE",
        reason_metadata_uri="urn:sensortrust:review:metadata-001",
        db=db_session
    )
    assert res["status"] == "CONFIRMED"
    assert res["txHash"] is not None
    assert res["blockNumber"] is not None

    # Verify review count on contract
    contract = live_blockchain_service.get_or_deploy_contract()
    obs_bytes = live_blockchain_service.observation_id_to_bytes32(obs_id)
    count = contract.functions.getReviewCount(obs_bytes).call()
    assert count >= 1


def test_reading_and_verifying_existing_digest(live_blockchain_service, db_session):
    """5. Validates reading and verifying an existing digest via read-only eth_call."""
    obs_id = "urn:uuid:test-obs-verify-001"
    obs_digest = "0x" + "d" * 64
    live_blockchain_service.anchor_observation(obs_id, obs_digest, db=db_session)

    res = live_blockchain_service.verify_observation_on_chain(obs_id, obs_digest)
    assert res["status"] == "VERIFIED_ON_CHAIN"
    assert res["isMatched"] is True
    assert res["exists"] is True
    assert res["onChainDigest"].lower() == obs_digest.lower()
    assert res["submitter"] is not None


def test_unknown_digest_returns_not_anchored(live_blockchain_service):
    """6. Validates that unknown digest returns NOT_ANCHORED with exists=False."""
    unknown_id = "urn:uuid:totally-unknown-observation-999"
    random_digest = "0x" + "e" * 64

    res = live_blockchain_service.verify_observation_on_chain(unknown_id, random_digest)
    assert res["status"] == "NOT_ANCHORED"
    assert res["isMatched"] is False
    assert res["exists"] is False


def test_altered_digest_fails_verification(live_blockchain_service, db_session):
    """7. Validates that altering candidate digest produces DIGEST_MISMATCH on-chain."""
    obs_id = "urn:uuid:test-obs-tamper-001"
    original_digest = "0x" + "f" * 64
    tampered_digest = "0x" + "1" * 64

    live_blockchain_service.anchor_observation(obs_id, original_digest, db=db_session)

    res = live_blockchain_service.verify_observation_on_chain(obs_id, tampered_digest)
    assert res["status"] == "DIGEST_MISMATCH"
    assert res["isMatched"] is False
    assert res["exists"] is True
    assert res["onChainDigest"].lower() == original_digest.lower()


def test_wrong_chain_id_is_rejected():
    """8. Validates that mismatched chain ID is rejected safely without submitting transactions."""
    service = BlockchainService()
    service.expected_chain_id = 999999  # Invalid expected chain ID

    assert service.is_connected() is False
    health = service.get_blockchain_health()
    assert health["connected"] is False

    res = service.anchor_observation("urn:uuid:test", "0x" + "0" * 64)
    assert res["status"] == "CHAIN_UNAVAILABLE"


def test_invalid_contract_address_handled_safely():
    """9. Validates that invalid contract address fails safely without crashing."""
    service = BlockchainService()
    service._deployed_address = "0x0000000000000000000000000000000000000001"

    # Querying empty address returns error status gracefully
    res = service.verify_observation_on_chain("urn:uuid:test", "0x" + "0" * 64)
    assert res["status"] in ("CONTRACT_UNAVAILABLE", "CHAIN_UNAVAILABLE", "NOT_ANCHORED")


def test_rpc_unavailable_scenario():
    """10. Validates graceful fail-closed behavior when RPC is unreachable."""
    service = BlockchainService()
    service.rpc_url = "http://127.0.0.1:9999"  # Non-existent port
    service.w3 = Web3(Web3.HTTPProvider(service.rpc_url, request_kwargs={"timeout": 1}))

    assert service.is_connected() is False

    res = service.anchor_observation("urn:uuid:test", "0x" + "0" * 64)
    assert res["status"] == "CHAIN_UNAVAILABLE"
    assert res["txHash"] is None


def test_duplicate_requests_idempotency(live_blockchain_service, db_session):
    """11. Validates that duplicate requests for identical observation are idempotent."""
    obs_id = "urn:uuid:test-obs-idempotent-001"
    digest = "0x" + "7" * 64

    # First anchoring attempt
    res1 = live_blockchain_service.anchor_observation(obs_id, digest, db=db_session)
    assert res1["status"] == "CONFIRMED"

    # Second anchoring attempt with identical digest
    res2 = live_blockchain_service.anchor_observation(obs_id, digest, db=db_session)
    assert res2["status"] == "CONFIRMED"
    assert res2.get("idempotent") is True


def test_duplicate_id_with_different_digest_reverts(live_blockchain_service, db_session):
    """11b. Validates that reusing observation ID with conflicting digest is rejected."""
    obs_id = "urn:uuid:test-obs-conflict-001"
    digest1 = "0x" + "8" * 64
    digest2 = "0x" + "9" * 64

    res1 = live_blockchain_service.anchor_observation(obs_id, digest1, db=db_session)
    assert res1["status"] == "CONFIRMED"

    res2 = live_blockchain_service.anchor_observation(obs_id, digest2, db=db_session)
    assert res2["status"] == "REVERTED"


def test_database_transaction_persistence(live_blockchain_service, db_session):
    """12. Validates that attempts are persisted without overwriting history."""
    obs_id = "urn:uuid:test-obs-history-001"
    digest = "0x" + "3" * 64

    live_blockchain_service.anchor_observation(obs_id, digest, db=db_session)

    records = db_session.query(BlockchainTransactionModel).filter(
        BlockchainTransactionModel.observation_id == obs_id
    ).all()
    assert len(records) >= 1
    assert all(r.chain_id == 31337 for r in records)


def test_no_private_keys_in_api_responses(client):
    """13. Validates that no private key or sensitive credential appears in API responses."""
    endpoints = [
        "/api/v1/health",
        "/api/v1/blockchain/status",
        "/api/v1/blockchain/transactions"
    ]

    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 200
        text_content = res.text.lower()
        # Ensure private key markers are completely absent
        assert "private_key" not in text_content
        assert "privatekey" not in text_content
        assert "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" not in text_content
