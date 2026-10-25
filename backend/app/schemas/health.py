"""
SensorTrust — Pydantic Schemas for System Health
"""

from typing import Literal
from pydantic import BaseModel


class BlockchainHealth(BaseModel):
    network: str
    chainId: int
    contractAddress: str
    latestBlock: int
    isSimulatedLocalNode: bool


class HealthResponse(BaseModel):
    status: Literal["HEALTHY", "DEGRADED"]
    timestamp: str
    database: Literal["CONNECTED", "IN_MEMORY_PROTOTYPE"]
    blockchain: BlockchainHealth
