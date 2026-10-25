"""
SensorTrust — Dedicated EVM Blockchain Service
Provides deterministic smart contract interaction, observation & review anchoring,
digest verification, idempotent retries, and transaction receipt tracking.
"""

from typing import Optional, Dict, Any, Tuple
import os
import json
import logging
from datetime import datetime, timezone
import warnings

from web3 import Web3
from hexbytes import HexBytes
from sqlalchemy.orm import Session

from app.config import settings
from app.models.transaction import BlockchainTransactionModel

# Suppress minor urllib3 warning on Windows python environments
warnings.filterwarnings("ignore", category=UserWarning, module="requests")

logger = logging.getLogger("sensortrust.blockchain")

DECISION_ENUM_MAP = {
    "APPROVE": 0,
    "REJECT": 1,
    "REQUEST_RECALIBRATION": 2
}


class BlockchainService:
    """Manages EVM connectivity, contract deployment, anchoring and verification."""

    def __init__(self):
        self.enabled = settings.BLOCKCHAIN_ENABLED
        self.rpc_url = settings.BLOCKCHAIN_RPC_URL
        self.expected_chain_id = settings.BLOCKCHAIN_CHAIN_ID
        self._configured_address = settings.BLOCKCHAIN_CONTRACT_ADDRESS
        self._private_key = settings.BLOCKCHAIN_PRIVATE_KEY

        # Local development default key (Hardhat node Account #0)
        # NEVER used in production or if private key is explicitly configured
        if not self._private_key and (self.rpc_url.startswith("http://127.0.0.1") or self.rpc_url.startswith("http://localhost")):
            self._private_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url, request_kwargs={"timeout": 10}))
        self._account = None
        if self._private_key:
            try:
                self._account = self.w3.eth.account.from_key(self._private_key)
            except Exception as e:
                logger.error(f"Failed to load relayer account from private key: {e}")

        self._artifact = None
        self._deployed_address = self._load_deployed_address()
        self._contract = None
        self._load_artifact()

    def _get_address_file_path(self) -> str:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        return os.path.join(base_dir, "artifacts", "deployed_address.json")

    def _load_deployed_address(self) -> Optional[str]:
        if self._configured_address:
            return self._configured_address
        p = self._get_address_file_path()
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("contractAddress")
            except Exception:
                pass
        return None

    def _save_deployed_address(self, addr: str) -> None:
        p = self._get_address_file_path()
        os.makedirs(os.path.dirname(p), exist_ok=True)
        try:
            with open(p, "w", encoding="utf-8") as f:
                json.dump({"contractAddress": addr, "chainId": self.expected_chain_id}, f, indent=2)
        except Exception:
            pass

    def _load_artifact(self) -> None:
        """Loads compiled contract JSON artifact."""
        candidate_paths = [
            os.path.abspath("artifacts/src/contracts/SensorTrustProvenance.sol/SensorTrustProvenance.json"),
            os.path.abspath("../artifacts/src/contracts/SensorTrustProvenance.sol/SensorTrustProvenance.json"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "artifacts", "src", "contracts", "SensorTrustProvenance.sol", "SensorTrustProvenance.json")
        ]
        for p in candidate_paths:
            if os.path.exists(p):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        self._artifact = json.load(f)
                    return
                except Exception as e:
                    logger.warning(f"Found artifact at {p} but failed to parse: {e}")

        logger.warning("SensorTrustProvenance.json contract artifact not found.")

    def is_connected(self) -> bool:
        """Returns True if JSON-RPC node is responsive and reports the expected chain ID."""
        if not self.enabled:
            return False
        try:
            if not self.w3.is_connected():
                return False
            actual_chain_id = self.w3.eth.chain_id
            if actual_chain_id != self.expected_chain_id:
                logger.warning(
                    f"Chain ID mismatch: expected {self.expected_chain_id}, connected to {actual_chain_id}"
                )
                return False
            return True
        except Exception:
            return False

    def get_contract_address(self) -> Optional[str]:
        """Returns currently active contract address."""
        return self._deployed_address

    def get_or_deploy_contract(self, db: Optional[Session] = None) -> Optional[Any]:
        """
        Retrieves active contract instance or deploys contract to local chain if not already deployed.
        """
        if not self.is_connected():
            return None

        if not self._artifact or "abi" not in self._artifact:
            self._load_artifact()
            if not self._artifact:
                return None

        # Check if already deployed and code exists at address
        if self._deployed_address and Web3.is_address(self._deployed_address):
            checksum_addr = Web3.to_checksum_address(self._deployed_address)
            try:
                code = self.w3.eth.get_code(checksum_addr)
                if code and len(code) > 0:
                    self._contract = self.w3.eth.contract(address=checksum_addr, abi=self._artifact["abi"])
                    return self._contract
            except Exception as e:
                logger.warning(f"Could not verify code at {self._deployed_address}: {e}")

        # Deploy contract automatically if on local dev chain and account is available
        if not self._account:
            return None

        try:
            logger.info(f"Deploying SensorTrustProvenance contract from {self._account.address}...")
            contract_factory = self.w3.eth.contract(
                abi=self._artifact["abi"],
                bytecode=self._artifact["bytecode"]
            )
            nonce = self.w3.eth.get_transaction_count(self._account.address)
            tx = contract_factory.constructor().build_transaction({
                "from": self._account.address,
                "nonce": nonce,
                "gas": 3000000,
                "gasPrice": self.w3.eth.gas_price,
                "chainId": self.expected_chain_id
            })
            signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=self._private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=15)

            if receipt.status == 1 and receipt.contractAddress:
                self._deployed_address = receipt.contractAddress
                self._save_deployed_address(self._deployed_address)
                self._contract = self.w3.eth.contract(address=self._deployed_address, abi=self._artifact["abi"])
                logger.info(f"SensorTrustProvenance deployed at {self._deployed_address} (block #{receipt.blockNumber})")

                if db:
                    now_iso = datetime.now(timezone.utc).isoformat()
                    tx_record = BlockchainTransactionModel(
                        operation_type="DEPLOY_CONTRACT",
                        observation_id="SYSTEM",
                        digest="0x" + "0" * 64,
                        tx_hash=self._format_tx_hash(tx_hash),
                        chain_id=self.expected_chain_id,
                        contract_address=self._deployed_address,
                        status="CONFIRMED",
                        block_number=receipt.blockNumber,
                        gas_used=receipt.gasUsed,
                        error_message=None,
                        created_at=now_iso,
                        updated_at=now_iso
                    )
                    db.add(tx_record)
                    db.commit()

                return self._contract
            else:
                logger.error("Contract deployment transaction failed or was reverted.")
                return None
        except Exception as e:
            logger.error(f"Failed to deploy contract: {e}")
            return None

    def _format_tx_hash(self, tx_hash_val: Any) -> str:
        """Standardizes transaction hash to lowercase 0x-prefixed 66-character hex string."""
        if isinstance(tx_hash_val, (bytes, HexBytes)):
            h = tx_hash_val.hex()
        else:
            h = str(tx_hash_val)
        if not h.startswith("0x"):
            h = "0x" + h
        return h.lower()

    def observation_id_to_bytes32(self, observation_id: str) -> HexBytes:
        """
        Deterministically converts observation ID string to bytes32.
        If already a 0x-prefixed 64-hex-char string (32 bytes), uses it directly;
        otherwise hashes with keccak256.
        """
        clean = observation_id.strip()
        if clean.startswith("0x") and len(clean) == 66:
            return HexBytes(clean)
        return self.w3.keccak(text=clean)

    def digest_to_bytes32(self, digest: str) -> HexBytes:
        """
        Converts SHA-256 hex digest to bytes32.
        Accepts 64-hex string with or without 0x prefix.
        """
        clean = digest.strip()
        if not clean.startswith("0x"):
            clean = "0x" + clean
        if len(clean) != 66:
            raise ValueError(f"Digest must be 32 bytes (66 hex characters with 0x), got {len(clean)} chars")
        return HexBytes(clean)

    def anchor_observation(
        self,
        observation_id: str,
        observation_digest: str,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Anchors an observation canonical digest to the EVM contract.
        Handles idempotency (returns confirmation if already anchored with identical digest).
        Fails safely if chain or contract is unavailable.
        """
        if not self.enabled:
            return {
                "status": "CHAIN_UNAVAILABLE",
                "error": "Blockchain integration is disabled by configuration.",
                "txHash": None
            }

        if not self.is_connected():
            return {
                "status": "CHAIN_UNAVAILABLE",
                "error": f"Cannot connect to EVM RPC node at {self.rpc_url}.",
                "txHash": None
            }

        contract = self.get_or_deploy_contract(db=db)
        if not contract:
            return {
                "status": "CONTRACT_UNAVAILABLE",
                "error": "SensorTrustProvenance contract is not deployed or reachable.",
                "txHash": None
            }

        now_iso = datetime.now(timezone.utc).isoformat()
        obs_id_bytes = self.observation_id_to_bytes32(observation_id)
        obs_digest_bytes = self.digest_to_bytes32(observation_digest)

        # Check existing on-chain state for idempotency
        try:
            is_matched, exists = contract.functions.verifyObservationDigest(obs_id_bytes, obs_digest_bytes).call()
            if exists:
                if is_matched:
                    obs_info = contract.functions.getObservation(obs_id_bytes).call()
                    existing_tx = None
                    existing_block = None
                    if db:
                        rec = db.query(BlockchainTransactionModel).filter(
                            BlockchainTransactionModel.observation_id == observation_id,
                            BlockchainTransactionModel.operation_type == "ANCHOR_OBSERVATION",
                            BlockchainTransactionModel.status == "CONFIRMED"
                        ).first()
                        if rec:
                            existing_tx = rec.tx_hash
                            existing_block = rec.block_number
                    return {
                        "status": "CONFIRMED",
                        "txHash": existing_tx,
                        "blockNumber": existing_block,
                        "blockTimestamp": datetime.fromtimestamp(obs_info[2], tz=timezone.utc).isoformat(),
                        "contractAddress": self._deployed_address,
                        "chainId": self.expected_chain_id,
                        "idempotent": True,
                        "explanation": "Observation already anchored on-chain with identical digest."
                    }
                else:
                    if db:
                        conflict_tx = BlockchainTransactionModel(
                            operation_type="ANCHOR_OBSERVATION",
                            observation_id=observation_id,
                            digest=observation_digest,
                            tx_hash=None,
                            chain_id=self.expected_chain_id,
                            contract_address=self._deployed_address or "",
                            status="REVERTED",
                            block_number=None,
                            gas_used=None,
                            error_message="SensorTrust: observationId already anchored with a different digest.",
                            created_at=now_iso,
                            updated_at=now_iso
                        )
                        db.add(conflict_tx)
                        db.commit()
                    return {
                        "status": "REVERTED",
                        "error": "SensorTrust: observationId already anchored with a different digest.",
                        "txHash": None
                    }
        except Exception as e:
            logger.warning(f"Error checking on-chain idempotency: {e}")

        # Persist PENDING transaction attempt
        tx_record = None
        if db:
            tx_record = BlockchainTransactionModel(
                operation_type="ANCHOR_OBSERVATION",
                observation_id=observation_id,
                digest=observation_digest,
                tx_hash=None,
                chain_id=self.expected_chain_id,
                contract_address=self._deployed_address or "",
                status="PENDING",
                block_number=None,
                gas_used=None,
                error_message=None,
                created_at=now_iso,
                updated_at=now_iso
            )
            db.add(tx_record)
            db.commit()

        # Build and submit transaction
        try:
            nonce = self.w3.eth.get_transaction_count(self._account.address)
            tx = contract.functions.anchorObservation(obs_id_bytes, obs_digest_bytes).build_transaction({
                "from": self._account.address,
                "nonce": nonce,
                "gas": 300000,
                "gasPrice": self.w3.eth.gas_price,
                "chainId": self.expected_chain_id
            })
            signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=self._private_key)
            tx_hash_bytes = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            tx_hash = self._format_tx_hash(tx_hash_bytes)

            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash_bytes, timeout=15)
            block = self.w3.eth.get_block(receipt.blockNumber)
            block_timestamp_iso = datetime.fromtimestamp(block.timestamp, tz=timezone.utc).isoformat()

            if receipt.status == 1:
                if tx_record and db:
                    tx_record.status = "CONFIRMED"
                    tx_record.tx_hash = tx_hash
                    tx_record.block_number = receipt.blockNumber
                    tx_record.gas_used = receipt.gasUsed
                    tx_record.updated_at = datetime.now(timezone.utc).isoformat()
                    db.commit()

                return {
                    "status": "CONFIRMED",
                    "txHash": tx_hash,
                    "blockNumber": receipt.blockNumber,
                    "blockTimestamp": block_timestamp_iso,
                    "contractAddress": self._deployed_address,
                    "chainId": self.expected_chain_id,
                    "gasUsed": receipt.gasUsed,
                    "anchoredBy": self._account.address
                }
            else:
                if tx_record and db:
                    tx_record.status = "FAILED"
                    tx_record.tx_hash = tx_hash
                    tx_record.error_message = "EVM execution reverted."
                    tx_record.updated_at = datetime.now(timezone.utc).isoformat()
                    db.commit()

                return {
                    "status": "TRANSACTION_FAILED",
                    "error": "EVM transaction execution reverted.",
                    "txHash": tx_hash
                }

        except Exception as e:
            err_msg = str(e)
            if tx_record and db:
                tx_record.status = "REVERTED" if "revert" in err_msg.lower() else "FAILED"
                tx_record.error_message = err_msg[:500]
                tx_record.updated_at = datetime.now(timezone.utc).isoformat()
                db.commit()

            return {
                "status": "TRANSACTION_FAILED",
                "error": err_msg,
                "txHash": None
            }

    def record_review_decision(
        self,
        observation_id: str,
        decision_digest: str,
        decision: str,
        reason_metadata_uri: str,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Anchors an append-only human review decision to the EVM contract.
        """
        if not self.enabled or not self.is_connected():
            return {
                "status": "CHAIN_UNAVAILABLE",
                "error": "Blockchain node is not available for review anchoring.",
                "txHash": None
            }

        contract = self.get_or_deploy_contract(db=db)
        if not contract:
            return {
                "status": "CONTRACT_UNAVAILABLE",
                "error": "Contract instance not available.",
                "txHash": None
            }

        decision_enum = DECISION_ENUM_MAP.get(decision.upper(), 0)
        obs_id_bytes = self.observation_id_to_bytes32(observation_id)
        decision_digest_bytes = self.digest_to_bytes32(decision_digest)
        now_iso = datetime.now(timezone.utc).isoformat()

        tx_record = None
        if db:
            tx_record = BlockchainTransactionModel(
                operation_type="RECORD_REVIEW_DECISION",
                observation_id=observation_id,
                digest=decision_digest,
                tx_hash=None,
                chain_id=self.expected_chain_id,
                contract_address=self._deployed_address or "",
                status="PENDING",
                block_number=None,
                gas_used=None,
                error_message=None,
                created_at=now_iso,
                updated_at=now_iso
            )
            db.add(tx_record)
            db.commit()

        try:
            nonce = self.w3.eth.get_transaction_count(self._account.address)
            tx = contract.functions.recordReviewDecision(
                obs_id_bytes,
                decision_digest_bytes,
                decision_enum,
                reason_metadata_uri
            ).build_transaction({
                "from": self._account.address,
                "nonce": nonce,
                "gas": 350000,
                "gasPrice": self.w3.eth.gas_price,
                "chainId": self.expected_chain_id
            })
            signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=self._private_key)
            tx_hash_bytes = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            tx_hash = self._format_tx_hash(tx_hash_bytes)

            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash_bytes, timeout=15)
            block = self.w3.eth.get_block(receipt.blockNumber)
            block_timestamp_iso = datetime.fromtimestamp(block.timestamp, tz=timezone.utc).isoformat()

            if receipt.status == 1:
                if tx_record and db:
                    tx_record.status = "CONFIRMED"
                    tx_record.tx_hash = tx_hash
                    tx_record.block_number = receipt.blockNumber
                    tx_record.gas_used = receipt.gasUsed
                    tx_record.updated_at = datetime.now(timezone.utc).isoformat()
                    db.commit()

                return {
                    "status": "CONFIRMED",
                    "txHash": tx_hash,
                    "blockNumber": receipt.blockNumber,
                    "blockTimestamp": block_timestamp_iso,
                    "contractAddress": self._deployed_address,
                    "chainId": self.expected_chain_id,
                    "gasUsed": receipt.gasUsed,
                    "reviewer": self._account.address
                }
            else:
                if tx_record and db:
                    tx_record.status = "FAILED"
                    tx_record.tx_hash = tx_hash
                    tx_record.error_message = "Review transaction execution reverted."
                    tx_record.updated_at = datetime.now(timezone.utc).isoformat()
                    db.commit()

                return {
                    "status": "TRANSACTION_FAILED",
                    "error": "Review transaction execution reverted.",
                    "txHash": tx_hash
                }
        except Exception as e:
            err_msg = str(e)
            if tx_record and db:
                tx_record.status = "FAILED"
                tx_record.error_message = err_msg[:500]
                tx_record.updated_at = datetime.now(timezone.utc).isoformat()
                db.commit()

            return {
                "status": "TRANSACTION_FAILED",
                "error": err_msg,
                "txHash": None
            }

    def verify_observation_on_chain(
        self,
        observation_id: str,
        candidate_digest: str
    ) -> Dict[str, Any]:
        """
        Queries the deployed contract through read-only eth_call to verify observation digest.
        Distinguishes:
        - VERIFIED_ON_CHAIN
        - NOT_ANCHORED
        - DIGEST_MISMATCH
        - CHAIN_UNAVAILABLE
        - CONTRACT_UNAVAILABLE
        """
        if not self.enabled:
            return {
                "status": "CHAIN_UNAVAILABLE",
                "isMatched": False,
                "exists": False,
                "explanation": "Blockchain verification is disabled in server configuration."
            }

        if not self.is_connected():
            return {
                "status": "CHAIN_UNAVAILABLE",
                "isMatched": False,
                "exists": False,
                "explanation": f"EVM RPC node at {self.rpc_url} is unreachable."
            }

        contract = self.get_or_deploy_contract()
        if not contract:
            return {
                "status": "CONTRACT_UNAVAILABLE",
                "isMatched": False,
                "exists": False,
                "explanation": "SensorTrustProvenance contract is not deployed or reachable on-chain."
            }

        try:
            obs_id_bytes = self.observation_id_to_bytes32(observation_id)
            cand_digest_bytes = self.digest_to_bytes32(candidate_digest)

            is_matched, exists = contract.functions.verifyObservationDigest(
                obs_id_bytes,
                cand_digest_bytes
            ).call()

            if not exists:
                return {
                    "status": "NOT_ANCHORED",
                    "isMatched": False,
                    "exists": False,
                    "explanation": f"Observation ID '{observation_id}' is not anchored on the EVM blockchain."
                }

            obs_info = contract.functions.getObservation(obs_id_bytes).call()
            on_chain_digest_hex = "0x" + obs_info[0].hex()
            submitter_addr = obs_info[1]
            anchored_timestamp = obs_info[2]
            anchored_iso = datetime.fromtimestamp(anchored_timestamp, tz=timezone.utc).isoformat() if anchored_timestamp > 0 else None

            if is_matched:
                return {
                    "status": "VERIFIED_ON_CHAIN",
                    "isMatched": True,
                    "exists": True,
                    "onChainDigest": on_chain_digest_hex,
                    "submitter": submitter_addr,
                    "blockTimestamp": anchored_iso,
                    "contractAddress": self._deployed_address,
                    "explanation": "Cryptographic match confirmed on-chain! The candidate payload produces the exact SHA-256 digest recorded in the deployed smart contract."
                }
            else:
                return {
                    "status": "DIGEST_MISMATCH",
                    "isMatched": False,
                    "exists": True,
                    "onChainDigest": on_chain_digest_hex,
                    "submitter": submitter_addr,
                    "blockTimestamp": anchored_iso,
                    "contractAddress": self._deployed_address,
                    "explanation": "Digest mismatch detected on-chain! The candidate payload has been altered compared to the immutable digest anchored in the deployed contract."
                }

        except Exception as e:
            logger.error(f"Error querying on-chain verification: {e}")
            return {
                "status": "CONTRACT_UNAVAILABLE",
                "isMatched": False,
                "exists": False,
                "explanation": f"Failed to execute on-chain verification call: {str(e)}"
            }

    def get_blockchain_health(self) -> Dict[str, Any]:
        """
        Returns full blockchain node health and network identity.
        NEVER includes private keys or secrets.
        """
        connected = self.is_connected()
        latest_block = None
        total_obs = 0
        total_rev = 0
        admin_address = None

        if connected:
            try:
                latest_block = self.w3.eth.block_number
                contract = self.get_or_deploy_contract()
                if contract:
                    total_obs = contract.functions.totalObservationsAnchored().call()
                    total_rev = contract.functions.totalReviewDecisionsRecorded().call()
                    admin_address = contract.functions.admin().call()
            except Exception as e:
                logger.warning(f"Error reading contract state during health check: {e}")

        return {
            "enabled": self.enabled,
            "connected": connected,
            "rpcUrl": self.rpc_url,
            "chainId": self.expected_chain_id,
            "latestBlockNumber": latest_block,
            "contractAddress": self._deployed_address,
            "relayerAddress": self._account.address if self._account else None,
            "contractAdmin": admin_address,
            "totalObservationsAnchored": total_obs,
            "totalReviewDecisionsRecorded": total_rev
        }


# Global singleton service instance
blockchain_service = BlockchainService()
