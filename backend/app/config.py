"""
SensorTrust — Application Configuration
Environment-based settings using Pydantic Settings v2.
"""

from typing import List, Union
import json
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration and runtime settings."""

    APP_NAME: str = "SensorTrust API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server binding
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # Persistence
    DATABASE_URL: str = "sqlite:///./sensortrust.db"

    # CORS Configuration
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Pre-seed default multi-basin records on startup if table is empty
    SEED_ON_STARTUP: bool = True

    # Blockchain EVM Integration (Phase 4)
    BLOCKCHAIN_ENABLED: bool = True
    BLOCKCHAIN_RPC_URL: str = "http://127.0.0.1:8545"
    BLOCKCHAIN_CHAIN_ID: int = 31337
    BLOCKCHAIN_CONTRACT_ADDRESS: Union[str, None] = None
    BLOCKCHAIN_PRIVATE_KEY: Union[str, None] = None  # Never exposed via API
    BLOCKCHAIN_AUTO_ANCHOR: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()
