"""
SensorTrust — Provenance Verification Service
Performs independent recomputation of RFC 8785 canonical digest and checks against
authoritative stored on-chain / database digest.
Queries the deployed Solidity contract on-chain via eth_call to distinguish
ON_CHAIN_CONFIRMED, BACKEND_VERIFIED, and LOCAL_RECOMPUTATION.
"""

from typing import Any, Dict
from sqlalchemy.orm import Session
from app.models.observation import ObservationModel
from app.schemas.provenance import VerificationResponse
from app.core.canonicalize import canonicalize_json, compute_sha256_hex
from app.services.blockchain_service import blockchain_service


def verify_payload_provenance(
    db: Session,
    observation_id: str,
    candidate_payload: Any
) -> VerificationResponse:
    """
    Verifies candidate observation payload integrity against authoritative stored record
    and deployed EVM smart contract. Never mutates the authoritative record.
    """
    clean_id = observation_id.strip().lower()
    obs = db.query(ObservationModel).filter(
        ObservationModel.observation_id.ilike(clean_id)
    ).first()

    if not obs:
        return VerificationResponse(
            isMatched=False,
            existsOnChain=False,
            recomputedDigest="N/A",
            onChainDigest="N/A",
            verificationLevel="LOCAL_RECOMPUTATION",
            onChainStatus="NOT_FOUND",
            explanation=f"Observation ID '{observation_id}' was not found in the provenance registry."
        )

    try:
        # If candidate payload is a Pydantic model or dict, canonicalize it
        if hasattr(candidate_payload, "model_dump"):
            candidate_dict = candidate_payload.model_dump(exclude_none=True)
        elif isinstance(candidate_payload, dict):
            # If payload has nested observation object (e.g. from EnrichedObservation)
            if "observation" in candidate_payload and isinstance(candidate_payload["observation"], dict):
                candidate_dict = candidate_payload["observation"]
            else:
                candidate_dict = candidate_payload
        else:
            candidate_dict = dict(candidate_payload)

        # Filter out derived state fields if passed
        allowed_keys = {
            "observationId",
            "sensorId",
            "pollutant",
            "value",
            "unit",
            "timestampObserved",
            "timestampSubmitted",
            "location",
            "sensorMetadata"
        }
        filtered = {k: v for k, v in candidate_dict.items() if k in allowed_keys}
        canonical_str = canonicalize_json(filtered, omit_none=True)
        recomputed_digest = compute_sha256_hex(canonical_str)
    except Exception as e:
        return VerificationResponse(
            isMatched=False,
            existsOnChain=False,
            recomputedDigest="MALFORMED_PAYLOAD",
            onChainDigest=obs.observation_digest,
            blockNumber=obs.provenance_block_number,
            blockTimestamp=obs.provenance_block_timestamp,
            submitter=obs.provenance_anchored_by,
            verificationLevel="BACKEND_VERIFIED",
            onChainStatus="MALFORMED_PAYLOAD",
            explanation=f"Malformed candidate payload could not be canonicalized: {str(e)}"
        )

    db_digest = obs.observation_digest
    is_db_matched = recomputed_digest.lower() == db_digest.lower()

    # Query deployed Solidity smart contract via eth_call
    on_chain = blockchain_service.verify_observation_on_chain(
        observation_id=obs.observation_id,
        candidate_digest=recomputed_digest
    )

    if on_chain.get("status") == "VERIFIED_ON_CHAIN":
        return VerificationResponse(
            isMatched=True,
            existsOnChain=True,
            recomputedDigest=recomputed_digest,
            onChainDigest=on_chain.get("onChainDigest", db_digest),
            blockNumber=obs.provenance_block_number,
            blockTimestamp=on_chain.get("blockTimestamp") or obs.provenance_block_timestamp,
            submitter=on_chain.get("submitter") or obs.provenance_anchored_by,
            verificationLevel="ON_CHAIN_CONFIRMED",
            onChainStatus="VERIFIED_ON_CHAIN",
            explanation="Cryptographic match verified directly on EVM smart contract! The candidate payload produces the exact SHA-256 digest anchored in the deployed contract."
        )
    elif on_chain.get("status") == "DIGEST_MISMATCH":
        return VerificationResponse(
            isMatched=False,
            existsOnChain=True,
            recomputedDigest=recomputed_digest,
            onChainDigest=on_chain.get("onChainDigest", db_digest),
            blockNumber=obs.provenance_block_number,
            blockTimestamp=on_chain.get("blockTimestamp") or obs.provenance_block_timestamp,
            submitter=on_chain.get("submitter") or obs.provenance_anchored_by,
            verificationLevel="ON_CHAIN_CONFIRMED",
            onChainStatus="DIGEST_MISMATCH",
            explanation="Digest mismatch detected on-chain! The candidate payload has been altered compared to the immutable digest recorded in the smart contract."
        )
    elif on_chain.get("status") == "NOT_ANCHORED":
        explanation = (
            f"Observation matches database SHA-256 digest ({db_digest}), but is NOT yet anchored on-chain."
            if is_db_matched
            else f"Digest mismatch: candidate ({recomputed_digest}) does not match database record ({db_digest}). Record is not anchored on-chain."
        )
        return VerificationResponse(
            isMatched=is_db_matched,
            existsOnChain=False,
            recomputedDigest=recomputed_digest,
            onChainDigest=db_digest,
            blockNumber=obs.provenance_block_number,
            blockTimestamp=obs.provenance_block_timestamp,
            submitter=obs.provenance_anchored_by,
            verificationLevel="BACKEND_VERIFIED",
            onChainStatus="NOT_ANCHORED",
            explanation=explanation
        )
    else:
        # CHAIN_UNAVAILABLE or CONTRACT_UNAVAILABLE
        explanation = (
            f"Database integrity verified: candidate payload SHA-256 matches stored digest. On-chain node status: {on_chain.get('explanation')}"
            if is_db_matched
            else f"Digest mismatch detected against database record. EVM node status: {on_chain.get('explanation')}"
        )
        return VerificationResponse(
            isMatched=is_db_matched,
            existsOnChain=is_db_matched and (obs.provenance_status == "CONFIRMED"),
            recomputedDigest=recomputed_digest,
            onChainDigest=db_digest,
            blockNumber=obs.provenance_block_number,
            blockTimestamp=obs.provenance_block_timestamp,
            submitter=obs.provenance_anchored_by,
            verificationLevel="BACKEND_VERIFIED",
            onChainStatus=on_chain.get("status", "CHAIN_UNAVAILABLE"),
            explanation=explanation
        )
