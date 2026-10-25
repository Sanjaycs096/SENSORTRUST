"""
SensorTrust — Phase 5 Complete Local-Chain Workflow End-to-End Verification
Tests complete workflow against live local Hardhat EVM and FastAPI backend.
"""

import sys
import json
import requests
from datetime import datetime, timezone
from web3 import Web3

BACKEND_URL = "http://127.0.0.1:8000"
RPC_URL = "http://127.0.0.1:8545"

def run_workflow_verification():
    print("=" * 70)
    print("SENSORTRUST PHASE 5 — COMPLETE LOCAL-CHAIN WORKFLOW VERIFICATION")
    print("=" * 70)

    # 1. Check Hardhat Node
    print("\n[Step 1] Connecting to Hardhat local EVM node...")
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        print("FAIL: Cannot connect to Hardhat node at", RPC_URL)
        sys.exit(1)
    chain_id = w3.eth.chain_id
    block_number = w3.eth.block_number
    print(f"PASS: Connected to EVM node. Chain ID: {chain_id}, Current Block: {block_number}")

    # 2. Check Contract Deployment
    print("\n[Step 2] Checking deployed contract...")
    status_res = requests.get(f"{BACKEND_URL}/api/v1/blockchain/status")
    if status_res.status_code != 200:
        print(f"FAIL: Blockchain status endpoint returned {status_res.status_code}: {status_res.text}")
        sys.exit(1)
    status_data = status_res.json()
    contract_addr = status_data.get("contractAddress")
    print(f"Backend configured Contract Address: {contract_addr}")
    code = w3.eth.get_code(contract_addr)
    if len(code) <= 2:
        print(f"FAIL: No bytecode at contract address {contract_addr}")
        sys.exit(1)
    print(f"PASS: Contract code exists ({len(code)} bytes) at {contract_addr}")

    # 3. Check Backend Health
    print("\n[Step 3] Checking FastAPI backend health...")
    health_res = requests.get(f"{BACKEND_URL}/api/v1/health")
    assert health_res.status_code == 200, f"Health check failed: {health_res.text}"
    health_data = health_res.json()
    print("PASS: Backend Health:", json.dumps(health_data, indent=2))
    assert health_data["blockchain"]["isSimulatedLocalNode"] is False
    assert status_data["connected"] is True
    assert health_data["blockchain"]["contractAddress"] == contract_addr

    # 4. Check Frontend
    print("\n[Step 4] Checking Vite frontend availability...")
    try:
        fe_res = requests.get("http://localhost:3000", timeout=3)
        print(f"PASS: Frontend HTTP Status: {fe_res.status_code}")
    except Exception as e:
        print(f"WARNING: Frontend check error: {e}")

    # 5. Ingest valid PM2.5 observation
    obs_id = f"urn:uuid:phase5-live-obs-{int(datetime.now().timestamp())}"
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    payload = {
        "observationId": obs_id,
        "sensorId": "CPCB-Delhi-LodhiRoad-04",
        "pollutant": "PM2.5",
        "value": 38.4,
        "unit": "ug/m3",
        "timestampObserved": now_iso,
        "timestampSubmitted": now_iso,
        "location": {
            "gridLat": 28.59,
            "gridLon": 77.22,
            "countryCode": "IN",
            "zoneId": "delhi-ncr-zone4"
        },
        "sensorMetadata": {
            "sensorType": "OFFICIAL_REFERENCE",
            "calibrationStatus": "CO_LOCATED_VERIFIED",
            "firmwareVersion": "BAM-1020-v5.0"
        }
    }
    print(f"\n[Step 5] Ingesting valid observation: {obs_id} (PM2.5 = 38.4 ug/m3)...")
    ingest_res = requests.post(f"{BACKEND_URL}/api/v1/observations", json=payload)
    if ingest_res.status_code not in (200, 201):
        print(f"FAIL: Ingestion failed {ingest_res.status_code}: {ingest_res.text}")
        sys.exit(1)
    obs_res_data = ingest_res.json()
    digest = obs_res_data["observationDigest"]
    print(f"PASS: Ingestion accepted. Computed Digest: {digest}")
    print(f"Validation status: isValid={obs_res_data['validation']['isValid']}")

    # 6. Confirm persistence in SQLite
    print(f"\n[Step 6] Confirming persistence in SQLite...")
    get_res = requests.get(f"{BACKEND_URL}/api/v1/observations/{obs_id}")
    assert get_res.status_code == 200
    persisted_data = get_res.json()
    assert persisted_data["observationDigest"] == digest
    print(f"PASS: Record persisted in SQLite with digest {persisted_data['observationDigest']}")

    # 7. Confirm Real Local EVM Transaction Mined
    print(f"\n[Step 7] Confirming EVM Transaction Receipt...")
    prov = persisted_data.get("provenance")
    print(f"Provenance status: {prov.get('status')}")
    print(f"Transaction hash: {prov.get('txHash')}")
    print(f"Block number: {prov.get('blockNumber')}")
    assert prov.get("status") == "CONFIRMED", f"Expected CONFIRMED but got {prov.get('status')}"
    assert prov.get("txHash") is not None
    tx_receipt = w3.eth.get_transaction_receipt(prov.get("txHash"))
    print(f"PASS: EVM Receipt confirmed on-chain! Gas used: {tx_receipt.gasUsed}, Status: {tx_receipt.status}")
    assert tx_receipt.status == 1, "EVM transaction failed/reverted"

    # 8. Retrieve Contract Record and Independently Verify Digest
    print(f"\n[Step 8] Independent verification via contract read methods...")
    # 8a: Verify via API endpoint
    verify_res = requests.post(
        f"{BACKEND_URL}/api/v1/provenance/verify",
        json={"observationId": obs_id, "candidatePayload": payload}
    )
    assert verify_res.status_code == 200, f"Verification failed: {verify_res.text}"
    v_data = verify_res.json()
    print("API verification response:", json.dumps(v_data, indent=2))
    assert v_data["isMatched"] is True
    assert v_data["existsOnChain"] is True
    assert v_data["verificationLevel"] == "ON_CHAIN_CONFIRMED"
    print("PASS: Independent API verification succeeded (ON_CHAIN_CONFIRMED)!")

    # 8b: Direct Web3 contract read eth_call verification
    artifact_path = "artifacts/src/contracts/SensorTrustProvenance.sol/SensorTrustProvenance.json"
    with open(artifact_path, "r", encoding="utf-8") as f:
        contract_abi = json.load(f)["abi"]
    contract = w3.eth.contract(address=contract_addr, abi=contract_abi)
    obs_id_bytes = w3.keccak(text=obs_id) if not (obs_id.startswith("0x") and len(obs_id) == 66) else bytes.fromhex(obs_id[2:])
    clean_digest = digest[2:] if digest.startswith("0x") else digest
    digest_bytes = bytes.fromhex(clean_digest)

    is_matched, exists = contract.functions.verifyObservationDigest(obs_id_bytes, digest_bytes).call()
    stored_digest, submitter, timestamp, obs_exists = contract.functions.getObservation(obs_id_bytes).call()
    print(f"Direct contract call verifyObservationDigest: isMatched={is_matched}, exists={exists}")
    print(f"Direct contract call getObservation: digest=0x{stored_digest.hex()}, blockTimestamp={timestamp}, submitter={submitter}, exists={obs_exists}")
    assert is_matched is True
    assert exists is True
    assert obs_exists is True
    assert stored_digest.hex() == clean_digest.lower()
    print("PASS: Direct read-only eth_call to smart contract confirms digest matches perfectly!")

    # 9. Submit Reviewer Decision
    print(f"\n[Step 9] Submitting accountable human review decision...")
    review_req = {
        "decision": "APPROVE",
        "reason": "Baseline reference sensor validated against co-located federal monitoring station.",
        "reviewerId": "reviewer:qa-lead-phase5"
    }
    rev_res = requests.post(f"{BACKEND_URL}/api/v1/reviews/{obs_id}/decision", json=review_req)
    if rev_res.status_code != 200:
        print(f"FAIL: Review submission failed {rev_res.status_code}: {rev_res.text}")
        sys.exit(1)
    rev_data = rev_res.json()
    print("PASS: Review recorded. Decision ID:", rev_data["decisionId"])
    print(f"Review Tx Hash: {rev_data['blockchainTx']['txHash']}")
    print(f"Review Block Number: {rev_data['blockchainTx']['blockNumber']}")
    assert rev_data["blockchainTx"]["status"] == "CONFIRMED"

    # 10. Verify Review Event Appended in History & Contract
    print(f"\n[Step 10] Verifying review event in history and on-chain...")
    updated_obs = requests.get(f"{BACKEND_URL}/api/v1/observations/{obs_id}").json()
    assert updated_obs["status"] == "APPROVED"
    assert len(updated_obs["reviewHistory"]) >= 1
    latest_review = updated_obs["reviewHistory"][-1]
    assert latest_review["decision"] == "APPROVE"
    assert latest_review["reason"] == review_req["reason"]
    print("PASS: Review history verified:", json.dumps(updated_obs["reviewHistory"], indent=2))

    # Direct Web3 check on contract review records
    rev_count = contract.functions.getReviewCount(obs_id_bytes).call()
    print(f"Direct contract call getReviewCount: {rev_count}")
    assert rev_count >= 1
    rev_tuple = contract.functions.getReviewDecision(obs_id_bytes, 0).call()
    print(f"Direct contract call getReviewDecision[0]: digest=0x{rev_tuple[0].hex()}, decisionEnum={rev_tuple[1]}, reviewer={rev_tuple[2]}, timestamp={rev_tuple[3]}")
    assert rev_tuple[1] == 0  # APPROVE enum (0=APPROVE, 1=REJECT, 2=REQUEST_RECALIBRATION)
    print("PASS: Smart contract holds immutable review decision record!")

    # Verify a second review (superseding review)
    print(f"\n[Step 10b] Testing repeated review decision (superseding review)...")
    review_req_2 = {
        "decision": "REQUEST_RECALIBRATION",
        "reason": "Follow-up drift audit requires optical chamber recalibration by technician.",
        "reviewerId": "reviewer:senior-qa-auditor"
    }
    rev_res_2 = requests.post(f"{BACKEND_URL}/api/v1/reviews/{obs_id}/decision", json=review_req_2)
    assert rev_res_2.status_code == 200
    rev_data_2 = rev_res_2.json()
    assert rev_data_2["blockchainTx"]["status"] == "CONFIRMED"

    updated_obs_2 = requests.get(f"{BACKEND_URL}/api/v1/observations/{obs_id}").json()
    assert updated_obs_2["status"] == "RECALIBRATION_REQUESTED"
    assert len(updated_obs_2["reviewHistory"]) == 2
    # reviewHistory is ordered newest first:
    assert updated_obs_2["reviewHistory"][0]["supersedesDecisionId"] == rev_data["decisionId"]
    assert updated_obs_2["reviewHistory"][1]["supersedesDecisionId"] is None
    print("PASS: Repeated review appended to history, supersedesDecisionId tracked cleanly!")

    print("\n" + "=" * 70)
    print("ALL COMPLETE LOCAL-CHAIN WORKFLOW STEPS PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    run_workflow_verification()
