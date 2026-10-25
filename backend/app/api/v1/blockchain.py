"""
SensorTrust — Dedicated Blockchain API Endpoints
Provides EVM node health, contract address retrieval, on-chain digest query,
and persistent transaction audit trail.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.services.blockchain_service import blockchain_service
from app.models.transaction import BlockchainTransactionModel
from app.models.observation import ObservationModel

router = APIRouter(prefix="/blockchain", tags=["Blockchain"])


class BlockchainStatusResponse(BaseModel):
    enabled: bool
    connected: bool
    rpcUrl: str
    chainId: int
    latestBlockNumber: Optional[int] = None
    contractAddress: Optional[str] = None
    relayerAddress: Optional[str] = None
    contractAdmin: Optional[str] = None
    totalObservationsAnchored: int = 0
    totalReviewDecisionsRecorded: int = 0


class TransactionAuditRecord(BaseModel):
    id: int
    operationType: str
    observationId: str
    digest: str
    txHash: Optional[str] = None
    chainId: int
    contractAddress: str
    status: str
    blockNumber: Optional[int] = None
    gasUsed: Optional[int] = None
    errorMessage: Optional[str] = None
    createdAt: str
    updatedAt: str


class OnChainObservationStatus(BaseModel):
    observationId: str
    existsOnChain: bool
    isDigestMatched: bool
    storedDigest: Optional[str] = None
    expectedDigest: Optional[str] = None
    submitter: Optional[str] = None
    timestampAnchored: Optional[str] = None
    status: str


@router.get("/status", response_model=BlockchainStatusResponse)
def get_blockchain_status() -> BlockchainStatusResponse:
    """Returns real-time EVM node connectivity, contract address, and network identity."""
    health = blockchain_service.get_blockchain_health()
    return BlockchainStatusResponse(**health)


@router.post("/deploy")
def deploy_contract(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Deploys or connects to the SensorTrustProvenance contract on the local EVM chain."""
    if not blockchain_service.is_connected():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Cannot connect to EVM RPC node at {blockchain_service.rpc_url}"
        )

    contract = blockchain_service.get_or_deploy_contract(db=db)
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Contract deployment or verification failed."
        )

    return {
        "status": "DEPLOYED",
        "contractAddress": blockchain_service.get_contract_address(),
        "chainId": blockchain_service.expected_chain_id,
        "admin": contract.functions.admin().call()
    }


@router.get("/observation/{observation_id}/status", response_model=OnChainObservationStatus)
def get_on_chain_observation_status(
    observation_id: str,
    db: Session = Depends(get_db)
) -> OnChainObservationStatus:
    """Queries on-chain smart contract for observation anchoring state and verifies digest."""
    clean_id = observation_id.strip()
    obs = db.query(ObservationModel).filter(
        ObservationModel.observation_id.ilike(clean_id)
    ).first()

    expected_digest = obs.observation_digest if obs else "0x" + "0" * 64

    res = blockchain_service.verify_observation_on_chain(
        observation_id=clean_id,
        candidate_digest=expected_digest
    )

    return OnChainObservationStatus(
        observationId=clean_id,
        existsOnChain=res.get("exists", False),
        isDigestMatched=res.get("isMatched", False),
        storedDigest=res.get("onChainDigest"),
        expectedDigest=expected_digest if obs else None,
        submitter=res.get("submitter"),
        timestampAnchored=res.get("blockTimestamp"),
        status=res.get("status", "UNKNOWN")
    )


@router.get("/transactions", response_model=List[TransactionAuditRecord])
def get_transaction_history(
    limit: int = 50,
    db: Session = Depends(get_db)
) -> List[TransactionAuditRecord]:
    """Returns persistent, unredacted audit trail of blockchain transaction attempts (excluding secrets)."""
    txs = db.query(BlockchainTransactionModel).order_by(
        desc(BlockchainTransactionModel.id)
    ).limit(limit).all()

    return [
        TransactionAuditRecord(
            id=t.id,
            operationType=t.operation_type,
            observationId=t.observation_id,
            digest=t.digest,
            txHash=t.tx_hash,
            chainId=t.chain_id,
            contractAddress=t.contract_address,
            status=t.status,
            blockNumber=t.block_number,
            gasUsed=t.gas_used,
            errorMessage=t.error_message,
            createdAt=t.created_at,
            updatedAt=t.updated_at
        )
        for t in txs
    ]
