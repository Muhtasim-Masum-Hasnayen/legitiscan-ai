"""Application settings, loaded from environment variables / .env."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
_DEFAULT_SECRET = "change-me-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "LegitiScan AI"
    environment: str = "development"  # development | production | test

    # Database (PostgreSQL in production; SQLite fallback keeps local dev zero-config)
    database_url: str = "sqlite:///./legitiscan_dev.db"

    # Auth
    secret_key: str = _DEFAULT_SECRET
    access_token_expire_minutes: int = 60 * 24 * 7
    require_auth: bool = False  # False => anonymous "guest" scans are allowed

    # HTTP
    cors_origins: str = "http://localhost:3000"
    trust_proxy_headers: bool = False
    scan_rate_limit_per_minute: int = 10

    # Uploads
    upload_dir: Path = BASE_DIR / "storage" / "uploads"
    max_upload_mb: int = 10
    max_files_per_scan: int = 3
    min_image_side: int = 224
    max_image_side: int = 2048

    # AI assets
    ml_enabled: bool = True
    models_dir: Path = BASE_DIR / "models"
    resnet_weights_file: str = "resnet50_cosmetics.pt"
    labels_file: str = "labels.json"
    reference_data_file: Path = BASE_DIR / "data" / "reference" / "products.json"
    sbert_model: str = "sentence-transformers/all-MiniLM-L6-v2"  # HF id or local folder
    ocr_languages: str = "en"
    ocr_gpu: bool = False
    ocr_min_chars: int = 12

    # Decision thresholds (tune on YOUR validation set, see docs/MODEL_INTEGRATION.md)
    authentic_threshold: float = 0.75
    counterfeit_threshold: float = 0.30
    disagreement_threshold: float = 0.50
    blur_min_variance: float = 25.0

    @model_validator(mode="after")
    def _check_production_secret(self) -> "Settings":
        if self.environment == "production" and (
            self.secret_key == _DEFAULT_SECRET or len(self.secret_key) < 32
        ):
            raise ValueError("SECRET_KEY must be set to a random string of 32+ characters in production.")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def ocr_language_list(self) -> list[str]:
        return [l.strip() for l in self.ocr_languages.split(",") if l.strip()] or ["en"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
