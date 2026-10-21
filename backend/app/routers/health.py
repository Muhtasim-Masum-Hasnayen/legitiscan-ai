from __future__ import annotations

from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.ml.registry import get_pipeline
from app.services.pipeline import ScanPipeline

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/system/status")
def system_status(pipeline: ScanPipeline = Depends(get_pipeline), settings: Settings = Depends(get_settings)) -> dict:
    """Tells the UI honestly which AI assets are present, plus upload limits."""
    components = [s.to_dict() for s in pipeline.asset_status()]
    return {
        "ready": all(c["available"] for c in components),
        "components": components,
        "limits": {
            "max_upload_mb": settings.max_upload_mb,
            "max_files_per_scan": settings.max_files_per_scan,
            "min_image_side": settings.min_image_side,
            "allowed_types": ["image/jpeg", "image/png", "image/webp"],
        },
        "auth_required": settings.require_auth,
    }
