"""
SensorTrust — Full API Integration Test Suite
Validates health, observation submission, review triage lifecycle,
provenance verification, and metrics persistence.
"""

from datetime import datetime, timezone
from app.schemas.observation import ObservationStatus, SensorType, CalibrationStatus


def test_health_endpoint(client):
    """GET /api/v1/health returns healthy operational status and connected database."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert data["database"] == "CONNECTED"
    assert data["blockchain"]["isSimulatedLocalNode"] is True


def test_metrics_summary_endpoint(client):
    """GET /api/v1/metrics/summary returns dynamic counts derived from the database."""
    res = client.get("/api/v1/metrics/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["totalObservations"] >= 5
    assert data["flaggedCount"] >= 1
    assert data["networkStatus"] == "OPERATIONAL"
    assert data["chainConnected"] is True


def test_list_observations_with_filtering_and_search(client):
    """GET /api/v1/observations returns paginated items and supports query filters."""
    # List all
    res = client.get("/api/v1/observations?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) >= 5
    assert data["total"] >= 5

    # Filter by status
    res_flagged = client.get("/api/v1/observations?status=FLAGGED")
    assert res_flagged.status_code == 200
    items_flagged = res_flagged.json()["items"]
    assert all(item["status"] == "FLAGGED" for item in items_flagged)

    # Search by zone ID
    res_search = client.get("/api/v1/observations?search=delhi-ncr-zone1")
    assert res_search.status_code == 200
    assert len(res_search.json()["items"]) >= 1


def test_get_single_observation_and_404(client):
    """GET /api/v1/observations/{id} returns enriched record or 404 for unknown ID."""
    valid_id = "urn:uuid:7c9e6679-7425-40de-944b-e07fc1f90ae7"
    res = client.get(f"/api/v1/observations/{valid_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["observation"]["observationId"] == valid_id
    assert data["observationDigest"].startswith("0x")

    # Nonexistent ID
    res_404 = client.get("/api/v1/observations/nonexistent-uuid-999")
    assert res_404.status_code == 404
    assert res_404.json()["code"] == "ERR_OBSERVATION_NOT_FOUND"


def test_submit_observation_success_and_digest(client):
    """POST /api/v1/observations accepts valid PM2.5 reading, computes digest, and saves to DB."""
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    payload = {
        "observationId": "urn:uuid:new-test-obs-101",
        "sensorId": "sensor-delhi-anandvihar-02",
        "pollutant": "PM2.5",
        "value": 29.4,
        "unit": "ug/m3",
        "timestampObserved": now_iso,
        "timestampSubmitted": now_iso,
        "location": {
            "gridLat": 28.65,
            "gridLon": 77.30,
            "countryCode": "IN",
            "zoneId": "delhi-ncr-zone1"
        },
        "sensorMetadata": {
            "sensorType": SensorType.LOW_COST_IOT.value,
            "calibrationStatus": CalibrationStatus.FACTORY_CALIBRATED.value,
            "firmwareVersion": "SPS30-v2.2"
        }
    }

    res = client.post("/api/v1/observations", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["observationId"] == "urn:uuid:new-test-obs-101"
    assert data["validation"]["isValid"] is True
    assert data["observationDigest"].startswith("0x")

    # Confirm it is queryable in GET /observations/{id}
    fetch_res = client.get("/api/v1/observations/urn:uuid:new-test-obs-101")
    assert fetch_res.status_code == 200
    assert fetch_res.json()["observation"]["value"] == 29.4


def test_submit_observation_rejection_negative_range(client):
    """POST /api/v1/observations returns 422 for physical bounds violation."""
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    payload = {
        "observationId": "urn:uuid:invalid-neg-pm25",
        "sensorId": "sensor-faulty-02",
        "pollutant": "PM2.5",
        "value": -15.0,
        "unit": "ug/m3",
        "timestampObserved": now_iso
    }

    res = client.post("/api/v1/observations", json=payload)
    assert res.status_code == 422
    data = res.json()
    assert data["status"] == "INVALID"
    assert data["validation"]["isValid"] is False
    assert any("ERR_RANGE_NEGATIVE" in r for r in data["validation"]["rejectionReasons"])


def test_submit_observation_duplicate_conflict(client):
    """POST /api/v1/observations returns 409 for duplicate observationId."""
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    existing_id = "urn:uuid:7c9e6679-7425-40de-944b-e07fc1f90ae7"  # In seed
    payload = {
        "observationId": existing_id,
        "sensorId": "sensor-dup-01",
        "pollutant": "PM2.5",
        "value": 35.0,
        "unit": "ug/m3",
        "timestampObserved": now_iso,
        "location": {"gridLat": 28.65, "gridLon": 77.30, "countryCode": "IN", "zoneId": "delhi-ncr-zone1"},
        "sensorMetadata": {"sensorType": "LOW_COST_IOT", "calibrationStatus": "FACTORY_CALIBRATED"}
    }

    res = client.post("/api/v1/observations", json=payload)
    assert res.status_code == 409
    data = res.json()
    assert data["validation"]["checks"]["duplicateDetected"] is True


def test_reviewer_queue_and_decision_lifecycle(client):
    """Triage queue returns flagged records; decision updates status and preserves history."""
    spike_id = "urn:uuid:f48a1290-b384-48ac-9457-36209bcae812"

    # Check queue contains the spike observation
    queue_res = client.get("/api/v1/reviews/queue")
    assert queue_res.status_code == 200
    queue = queue_res.json()
    assert any(item["observation"]["observationId"] == spike_id for item in queue)

    # Attempt decision with reason < 10 characters -> returns 400
    bad_res = client.post(
        f"/api/v1/reviews/{spike_id}/decision",
        json={"decision": "REJECT", "reason": "Short"}
    )
    assert bad_res.status_code == 400
    assert bad_res.json()["code"] == "ERR_REVIEW_JUSTIFICATION_REQUIRED"

    # Submit valid rejection
    decision_payload = {
        "decision": "REJECT",
        "reason": "Physical inspection confirmed sensor was exposed to direct vehicle exhaust plume.",
        "reviewerId": "reviewer:officer-test@state.gov"
    }
    dec_res = client.post(f"/api/v1/reviews/{spike_id}/decision", json=decision_payload)
    assert dec_res.status_code == 200
    dec_data = dec_res.json()
    assert dec_data["decision"] == "REJECT"
    assert dec_data["status"] == "REJECTED"
    assert dec_data["decisionDigest"].startswith("0x")

    # Verify updated record now reflects REJECTED status and has review history
    obs_res = client.get(f"/api/v1/observations/{spike_id}")
    assert obs_res.status_code == 200
    updated_obs = obs_res.json()
    assert updated_obs["status"] == "REJECTED"
    assert len(updated_obs["reviewHistory"]) >= 1
    assert updated_obs["reviewHistory"][0]["reason"] == decision_payload["reason"]


def test_provenance_verification_endpoint(client):
    """POST /api/v1/provenance/verify detects untampered vs tampered data."""
    clean_id = "urn:uuid:7c9e6679-7425-40de-944b-e07fc1f90ae7"
    obs_res = client.get(f"/api/v1/observations/{clean_id}")
    obs_payload = obs_res.json()["observation"]

    # 1. Untampered payload verification
    res_pass = client.post(
        "/api/v1/provenance/verify",
        json={"observationId": clean_id, "candidatePayload": obs_payload}
    )
    assert res_pass.status_code == 200
    data_pass = res_pass.json()
    assert data_pass["isMatched"] is True
    assert data_pass["existsOnChain"] is True

    # 2. Tampered measurement (+0.1 ug/m3 alteration)
    tampered = dict(obs_payload)
    tampered["value"] = tampered["value"] + 0.1
    res_fail = client.post(
        "/api/v1/provenance/verify",
        json={"observationId": clean_id, "candidatePayload": tampered}
    )
    assert res_fail.status_code == 200
    data_fail = res_fail.json()
    assert data_fail["isMatched"] is False
    assert data_fail["recomputedDigest"] != data_fail["onChainDigest"]


def test_seed_reset_endpoint(client):
    """POST /api/v1/seed/reset clears altered data and cleanly restores 5 seeds."""
    res = client.post("/api/v1/seed/reset")
    assert res.status_code == 200
    assert res.json()["status"] == "SUCCESS"

    metrics_res = client.get("/api/v1/metrics/summary")
    assert metrics_res.json()["totalObservations"] == 5


def test_database_persistence_across_reconnect(tmp_path):
    """
    Confirms that observations and reviews written to SQLite persist to disk
    and survive database reconnection / service restart.
    """
    import os
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.database import Base
    from app.services.observation_service import submit_observation, get_observation_by_id
    from app.services.review_service import submit_review_decision
    from app.schemas.review import ReviewDecisionType

    db_file = tmp_path / "test_persist.db"
    db_url = f"sqlite:///{db_file}"

    # First session: create schema, submit observation, and record human decision
    engine_1 = create_engine(db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine_1)
    Session_1 = sessionmaker(bind=engine_1)
    session_1 = Session_1()

    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    obs_payload = {
        "observationId": "urn:uuid:persist-test-1234",
        "sensorId": "sensor-london-marylebone-05",
        "pollutant": "PM2.5",
        "value": 18.5,
        "unit": "ug/m3",
        "timestampObserved": now_iso,
        "timestampSubmitted": now_iso,
        "location": {"gridLat": 51.52, "gridLon": -0.15, "countryCode": "GB", "zoneId": "greater-london-urban"},
        "sensorMetadata": {"sensorType": "OFFICIAL_REFERENCE", "calibrationStatus": "FACTORY_CALIBRATED"}
    }
    submit_observation(session_1, obs_payload)
    submit_review_decision(
        db=session_1,
        observation_id="urn:uuid:persist-test-1234",
        decision=ReviewDecisionType.APPROVE,
        reason="Co-location verification passed reference chamber audit.",
        reviewer_id="reviewer:lead-auditor"
    )

    # Fully disconnect and close session 1
    session_1.close()
    engine_1.dispose()

    # Verify database file exists on disk
    assert os.path.exists(str(db_file))

    # Second session: simulate backend restart by creating a completely new engine and session
    engine_2 = create_engine(db_url, connect_args={"check_same_thread": False})
    Session_2 = sessionmaker(bind=engine_2)
    session_2 = Session_2()

    # Query observation and review history
    reloaded_obs = get_observation_by_id(session_2, "urn:uuid:persist-test-1234")
    assert reloaded_obs is not None
    assert reloaded_obs.observation.value == 18.5
    assert reloaded_obs.status == "APPROVED"
    assert len(reloaded_obs.reviewHistory) == 1
    assert reloaded_obs.reviewHistory[0].reason == "Co-location verification passed reference chamber audit."

    session_2.close()
    engine_2.dispose()

