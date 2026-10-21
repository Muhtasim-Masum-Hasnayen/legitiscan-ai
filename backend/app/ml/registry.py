"""Builds the shared pipeline once. Overridden in tests via FastAPI dependency_overrides."""
from __future__ import annotations

from functools import lru_cache

from app.config import get_settings
from app.ml.classifier import CosmeticClassifier
from app.ml.ocr import OcrEngine
from app.ml.similarity import SemanticMatcher
from app.services.pipeline import ScanPipeline


@lru_cache
def get_pipeline() -> ScanPipeline:
    s = get_settings()
    return ScanPipeline(CosmeticClassifier(s), OcrEngine(s), SemanticMatcher(s), s)
