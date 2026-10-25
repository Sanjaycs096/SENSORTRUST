"""
SensorTrust — Demo Baseline Seed Service
Populates transparently marked initial demo fixtures matching Phase 1 specifications.
All operations are strictly idempotent.
"""

import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.observation import ObservationModel
from app.models.review import ReviewRecordModel
from app.schemas.observation import (
    SensorType,
    CalibrationStatus,
    AnomalySeverity,
    ObservationStatus,
    ValidationResult,
    ValidationChecks,
    AnomalyAssessment,
    AnomalyEvidence,
    DeltaRateEvidence,
    StuckSensorEvidence,
    SpatialPeerEvidence
)
from app.core.canonicalize import compute_observation_digest, compute_review_digest
from app.services.blockchain_service import blockchain_service

SEED_DATA: List[Dict[str, Any]] = [
    # 1. Clean Reference Station (Delhi Anand Vihar)
    {
        "observation": {
            "observationId": "urn:uuid:7c9e6679-7425-40de-944b-e07fc1f90ae7",
            "sensorId": "CPCB-Delhi-AnandVihar-01",
            "pollutant": "PM2.5",
            "value": 24.2,
            "unit": "ug/m3",
            "timestampObserved": "2026-10-23T11:00:00.000Z",
            "timestampSubmitted": "2026-10-23T11:00:03.250Z",
            "location": {
                "gridLat": 28.65,
                "gridLon": 77.30,
                "countryCode": "IN",
                "zoneId": "delhi-ncr-zone1"
            },
            "sensorMetadata": {
                "sensorType": SensorType.OFFICIAL_REFERENCE.value,
                "calibrationStatus": CalibrationStatus.CO_LOCATED_VERIFIED.value,
                "firmwareVersion": "BAM-1020-v4.2"
            }
        },
        "status": ObservationStatus.APPROVED.value,
        "validation": {
            "isValid": True,
            "validatedAt": "2026-10-23T11:00:03.260Z",
            "checks": {
                "schemaValid": True,
                "rangeValid": True,
                "timestampFresh": True,
                "duplicateDetected": False
            },
            "rejectionReasons": []
        },
        "anomaly": {
            "score": 0.05,
            "severity": AnomalySeverity.NORMAL.value,
            "reasonCodes": [],
            "explanation": "Observation is within normal nominal bounds; no anomalous spatial or temporal patterns detected.",
            "evidence": {
                "spatialPeerComparison": {
                    "peerCount": 3,
                    "peerMean": 25.1,
                    "peerStdDev": 1.8,
                    "zScore": -0.5,
                    "hasContextualData": True
                }
            },
            "flaggedForReview": False
        },
        "provenance": {
            "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            "networkId": "hardhat-31337",
            "txHash": "0x17fa830129bc48e1098401928374019283740192837401928374019283740192",
            "blockNumber": 104,
            "blockTimestamp": "2026-10-23T11:00:10.000Z",
            "anchoredBy": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "status": "CONFIRMED",
            "verificationUrl": "#local-hardhat-block-104"
        },
        "review": None
    },

    # 2. Sudden Spike Anomaly Scenario (Ready for Review)
    {
        "observation": {
            "observationId": "urn:uuid:f48a1290-b384-48ac-9457-36209bcae812",
            "sensorId": "AQ-Citizen-NCR-Zone2-09",
            "pollutant": "PM2.5",
            "value": 284.6,
            "unit": "ug/m3",
            "timestampObserved": "2026-10-23T11:10:00.000Z",
            "timestampSubmitted": "2026-10-23T11:10:02.110Z",
            "location": {
                "gridLat": 28.62,
                "gridLon": 77.21,
                "countryCode": "IN",
                "zoneId": "delhi-ncr-zone2"
            },
            "sensorMetadata": {
                "sensorType": SensorType.CITIZEN_SCIENCE.value,
                "calibrationStatus": CalibrationStatus.FACTORY_CALIBRATED.value,
                "firmwareVersion": "Plantower-PMS5003-v1.8"
            }
        },
        "status": ObservationStatus.FLAGGED.value,
        "validation": {
            "isValid": True,
            "validatedAt": "2026-10-23T11:10:02.120Z",
            "checks": {
                "schemaValid": True,
                "rangeValid": True,
                "timestampFresh": True,
                "duplicateDetected": False
            },
            "rejectionReasons": []
        },
        "anomaly": {
            "score": 0.85,
            "severity": AnomalySeverity.CRITICAL.value,
            "reasonCodes": ["ANOMALY_RAPID_SPIKE", "ANOMALY_SPATIAL_DIVERGENCE"],
            "explanation": "Sudden PM2.5 delta of +252.6 ug/m3 in 10.0 minutes (rate: 25.26 ug/m3/min). Value deviates by +8.1 standard deviations from 4 localized peers (Cluster Mean: 31.8 ug/m3).",
            "evidence": {
                "deltaRateOfChange": {
                    "previousValue": 32.0,
                    "deltaUgPerM3": 252.6,
                    "timeDeltaMinutes": 10.0,
                    "ratePerMinute": 25.26,
                    "thresholdExceeded": True
                },
                "spatialPeerComparison": {
                    "peerCount": 4,
                    "peerMean": 31.8,
                    "peerStdDev": 3.1,
                    "zScore": 8.15,
                    "hasContextualData": True
                }
            },
            "flaggedForReview": True
        },
        "provenance": {
            "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            "networkId": "hardhat-31337",
            "txHash": "0x4981028374019283740192837401928374019283740192837401928374019283",
            "blockNumber": 105,
            "blockTimestamp": "2026-10-23T11:10:15.000Z",
            "anchoredBy": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "status": "CONFIRMED",
            "verificationUrl": "#local-hardhat-block-105"
        },
        "review": None
    },

    # 3. Stuck Sensor Flatline (Pending Review)
    {
        "observation": {
            "observationId": "urn:uuid:3b9944a1-098e-4a6c-9477-d4fa4c882190",
            "sensorId": "IoT-BLR-Whitefield-12",
            "pollutant": "PM2.5",
            "value": 42.0,
            "unit": "ug/m3",
            "timestampObserved": "2026-10-23T11:15:00.000Z",
            "timestampSubmitted": "2026-10-23T11:15:04.800Z",
            "location": {
                "gridLat": 12.97,
                "gridLon": 77.59,
                "countryCode": "IN",
                "zoneId": "bangalore-urban"
            },
            "sensorMetadata": {
                "sensorType": SensorType.LOW_COST_IOT.value,
                "calibrationStatus": CalibrationStatus.EXPIRED.value,
                "firmwareVersion": "SenseAir-S8-v2.1"
            }
        },
        "status": ObservationStatus.PENDING_REVIEW.value,
        "validation": {
            "isValid": True,
            "validatedAt": "2026-10-23T11:15:04.810Z",
            "checks": {
                "schemaValid": True,
                "rangeValid": True,
                "timestampFresh": True,
                "duplicateDetected": False
            },
            "rejectionReasons": []
        },
        "anomaly": {
            "score": 0.65,
            "severity": AnomalySeverity.HIGH.value,
            "reasonCodes": ["ANOMALY_STUCK_SENSOR", "WARN_CALIBRATION_EXPIRED"],
            "explanation": "Sensor has reported exactly identical value (42.0 ug/m3) for 6 consecutive cycles (60 mins). Calibration certificate is expired.",
            "evidence": {
                "stuckSensorReading": {
                    "consecutiveIdenticalCount": 6,
                    "durationMinutes": 60
                },
                "spatialPeerComparison": {
                    "peerCount": 0,
                    "peerMean": 0.0,
                    "peerStdDev": 0.0,
                    "zScore": 0.0,
                    "hasContextualData": False
                }
            },
            "flaggedForReview": True
        },
        "provenance": {
            "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            "networkId": "hardhat-31337",
            "txHash": "0x8837192837401928374019283740192837401928374019283740192837401928",
            "blockNumber": 106,
            "blockTimestamp": "2026-10-23T11:15:20.000Z",
            "anchoredBy": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "status": "CONFIRMED"
        },
        "review": None
    },

    # 4. Human Reviewed & Rejected Scenario (Audit Trail Visible)
    {
        "observation": {
            "observationId": "urn:uuid:8a1c9201-3829-41fa-8910-c09a827419ef",
            "sensorId": "Citizen-LA-Basin-03",
            "pollutant": "PM2.5",
            "value": 412.0,
            "unit": "ug/m3",
            "timestampObserved": "2026-10-23T10:30:00.000Z",
            "timestampSubmitted": "2026-10-23T10:30:02.100Z",
            "location": {
                "gridLat": 34.05,
                "gridLon": -118.24,
                "countryCode": "US",
                "zoneId": "south-coast-air-basin"
            },
            "sensorMetadata": {
                "sensorType": SensorType.CITIZEN_SCIENCE.value,
                "calibrationStatus": CalibrationStatus.FACTORY_CALIBRATED.value,
                "firmwareVersion": "PurpleAir-PA-II"
            }
        },
        "status": ObservationStatus.REJECTED.value,
        "validation": {
            "isValid": True,
            "validatedAt": "2026-10-23T10:30:02.110Z",
            "checks": {
                "schemaValid": True,
                "rangeValid": True,
                "timestampFresh": True,
                "duplicateDetected": False
            },
            "rejectionReasons": []
        },
        "anomaly": {
            "score": 0.90,
            "severity": AnomalySeverity.CRITICAL.value,
            "reasonCodes": ["ANOMALY_RAPID_SPIKE", "ANOMALY_SPATIAL_DIVERGENCE"],
            "explanation": "Extreme reading of 412.0 ug/m3 in residential area with regional baseline of 18.4 ug/m3.",
            "evidence": {
                "deltaRateOfChange": {
                    "previousValue": 22.0,
                    "deltaUgPerM3": 390.0,
                    "timeDeltaMinutes": 15.0,
                    "ratePerMinute": 26.0,
                    "thresholdExceeded": True
                },
                "spatialPeerComparison": {
                    "peerCount": 5,
                    "peerMean": 18.4,
                    "peerStdDev": 2.5,
                    "zScore": 157.4,
                    "hasContextualData": True
                }
            },
            "flaggedForReview": True
        },
        "provenance": {
            "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            "networkId": "hardhat-31337",
            "txHash": "0x9948ab12e8471e987483018274910283749102837401928374019283740192837",
            "blockNumber": 102,
            "blockTimestamp": "2026-10-23T10:45:20.000Z",
            "anchoredBy": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "status": "CONFIRMED",
            "decisionDigest": None  # Will be calculated below
        },
        "review": {
            "decisionId": "urn:uuid:dec-8841-a1b2-c3d4",
            "observationId": "urn:uuid:8a1c9201-3829-41fa-8910-c09a827419ef",
            "reviewerId": "reviewer:officer-sanchez@aqmd.gov",
            "decision": "REJECT",
            "reason": "Physical inspection confirmed sensor was mounted directly above commercial restaurant kitchen exhaust vent. Siting violates EPA microscale guidelines.",
            "timestampDecided": "2026-10-23T10:45:10.000Z"
        }
    },

    # 5. Co-located Verified Station (Thames Basin)
    {
        "observation": {
            "observationId": "urn:uuid:91823746-1290-4820-bca1-748291038472",
            "sensorId": "DEFRA-London-Marylebone-04",
            "pollutant": "PM2.5",
            "value": 14.8,
            "unit": "ug/m3",
            "timestampObserved": "2026-10-23T11:20:00.000Z",
            "timestampSubmitted": "2026-10-23T11:20:02.400Z",
            "location": {
                "gridLat": 51.52,
                "gridLon": -0.15,
                "countryCode": "GB",
                "zoneId": "greater-london-urban"
            },
            "sensorMetadata": {
                "sensorType": SensorType.OFFICIAL_REFERENCE.value,
                "calibrationStatus": CalibrationStatus.CO_LOCATED_VERIFIED.value,
                "firmwareVersion": "FIDAS-200-v3.0"
            }
        },
        "status": ObservationStatus.APPROVED.value,
        "validation": {
            "isValid": True,
            "validatedAt": "2026-10-23T11:20:02.410Z",
            "checks": {
                "schemaValid": True,
                "rangeValid": True,
                "timestampFresh": True,
                "duplicateDetected": False
            },
            "rejectionReasons": []
        },
        "anomaly": {
            "score": 0.02,
            "severity": AnomalySeverity.NORMAL.value,
            "reasonCodes": [],
            "explanation": "Observation is within normal nominal bounds; reference co-location confirmed.",
            "evidence": {
                "spatialPeerComparison": {
                    "peerCount": 2,
                    "peerMean": 15.2,
                    "peerStdDev": 0.9,
                    "zScore": -0.44,
                    "hasContextualData": True
                }
            },
            "flaggedForReview": False
        },
        "provenance": {
            "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            "networkId": "hardhat-31337",
            "txHash": "0x7749102837401928374019283740192837401928374019283740192837401928",
            "blockNumber": 107,
            "blockTimestamp": "2026-10-23T11:20:10.000Z",
            "anchoredBy": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "status": "CONFIRMED"
        },
        "review": None
    }
]


def seed_database_if_empty(db: Session) -> int:
    """Populates baseline seed data if the observations table is empty. Idempotent."""
    existing_count = db.query(ObservationModel).count()
    if existing_count > 0:
        return 0

    return seed_records(db)


def reset_database_to_seed(db: Session) -> int:
    """Clears all observation and review records, and re-populates pristine seed data."""
    db.query(ReviewRecordModel).delete()
    db.query(ObservationModel).delete()
    db.commit()
    return seed_records(db)


def seed_records(db: Session) -> int:
    """Inserts the 5 deterministic seeds and their reviews."""
    inserted = 0

    for item in SEED_DATA:
        obs_payload = item["observation"]
        obs_id = obs_payload["observationId"]

        # Check if already exists (idempotency guard)
        exists = db.query(ObservationModel.observation_id).filter(
            ObservationModel.observation_id == obs_id
        ).first()
        if exists:
            continue

        digest = compute_observation_digest(obs_payload)

        # Review record if present
        review_data = item.get("review")
        decision_digest = None
        if review_data:
            decision_digest = compute_review_digest(review_data)

        prov = item["provenance"]

        obs_model = ObservationModel(
            observation_id=obs_id,
            sensor_id=obs_payload["sensorId"],
            pollutant=obs_payload["pollutant"],
            value=float(obs_payload["value"]),
            unit=obs_payload["unit"],
            timestamp_observed=obs_payload["timestampObserved"],
            timestamp_submitted=obs_payload["timestampSubmitted"],
            grid_lat=float(obs_payload["location"]["gridLat"]),
            grid_lon=float(obs_payload["location"]["gridLon"]),
            country_code=obs_payload["location"]["countryCode"],
            zone_id=obs_payload["location"]["zoneId"],
            sensor_type=obs_payload["sensorMetadata"]["sensorType"],
            calibration_status=obs_payload["sensorMetadata"]["calibrationStatus"],
            firmware_version=obs_payload["sensorMetadata"].get("firmwareVersion"),
            observation_digest=digest,
            status=item["status"],
            validation_is_valid=item["validation"]["isValid"],
            validation_json=json.dumps(item["validation"]),
            anomaly_score=item["anomaly"]["score"],
            anomaly_severity=item["anomaly"]["severity"],
            anomaly_flagged=item["anomaly"]["flaggedForReview"],
            anomaly_json=json.dumps(item["anomaly"]),
            provenance_contract_address=prov["contractAddress"],
            provenance_network_id=prov["networkId"],
            provenance_tx_hash=prov["txHash"],
            provenance_block_number=prov["blockNumber"],
            provenance_block_timestamp=prov["blockTimestamp"],
            provenance_anchored_by=prov["anchoredBy"],
            provenance_status=prov["status"],
            provenance_verification_url=prov.get("verificationUrl"),
            provenance_decision_digest=decision_digest,
            is_seed=True
        )

        # On-chain anchoring if EVM node is active
        if blockchain_service.is_connected():
            anchor_res = blockchain_service.anchor_observation(
                observation_id=obs_id,
                observation_digest=digest,
                db=db
            )
            if anchor_res.get("status") == "CONFIRMED":
                obs_model.provenance_status = "CONFIRMED"
                obs_model.provenance_tx_hash = anchor_res.get("txHash")
                obs_model.provenance_block_number = anchor_res.get("blockNumber")
                if anchor_res.get("contractAddress"):
                    obs_model.provenance_contract_address = anchor_res.get("contractAddress")

        db.add(obs_model)

        if review_data:
            rev_tx_hash = None
            rev_block_num = None
            if blockchain_service.is_connected():
                rev_res = blockchain_service.record_review_decision(
                    observation_id=obs_id,
                    decision_digest=decision_digest,
                    decision=review_data["decision"],
                    reason_metadata_uri=f"urn:sensortrust:review:{review_data['decisionId']}",
                    db=db
                )
                if rev_res.get("status") == "CONFIRMED":
                    rev_tx_hash = rev_res.get("txHash")
                    rev_block_num = rev_res.get("blockNumber")

            rev_model = ReviewRecordModel(
                decision_id=review_data["decisionId"],
                observation_id=obs_id,
                reviewer_id=review_data["reviewerId"],
                decision=review_data["decision"],
                reason=review_data["reason"],
                timestamp_decided=review_data["timestampDecided"],
                supersedes_decision_id=review_data.get("supersedesDecisionId"),
                decision_digest=decision_digest,
                tx_hash=rev_tx_hash,
                block_number=rev_block_num,
                contract_address=blockchain_service.get_contract_address(),
                status="CONFIRMED" if rev_tx_hash else "NOT_ANCHORED"
            )
            db.add(rev_model)

        inserted += 1

    db.commit()
    return inserted
