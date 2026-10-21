"""EasyOCR text extraction. EasyOCR downloads its detection/recognition weights on first use
(into models/easyocr) unless they are already present - see docs/MODEL_INTEGRATION.md."""
from __future__ import annotations

import importlib.util
import logging
import threading
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image

from app.config import Settings
from app.ml.base import AssetStatus, ComponentUnavailable

log = logging.getLogger(__name__)


@dataclass
class OcrResult:
    lines: list[dict] = field(default_factory=list)  # {"text": str, "confidence": float}

    @property
    def text(self) -> str:
        return "\n".join(l["text"] for l in self.lines)

    @property
    def mean_confidence(self) -> float | None:
        return round(sum(l["confidence"] for l in self.lines) / len(self.lines), 3) if self.lines else None


class OcrEngine:
    def __init__(self, settings: Settings) -> None:
        self.s = settings
        self._reader = None
        self._lock = threading.Lock()

    def status(self) -> AssetStatus:
        name = "EasyOCR text reader"
        fix = "pip install -r requirements-ml.txt (EasyOCR downloads its language models on first run)."
        if not self.s.ml_enabled:
            return AssetStatus("ocr", name, False, "Disabled (ML_ENABLED=false).", ["ML_ENABLED=true"], fix)
        if importlib.util.find_spec("easyocr") is None:
            return AssetStatus("ocr", name, False, "EasyOCR is not installed.", ["python package: easyocr"], fix)
        return AssetStatus("ocr", name, True, f"Ready (languages: {', '.join(self.s.ocr_language_list)}).")

    def _get_reader(self):
        if self._reader is not None:
            return self._reader
        with self._lock:
            if self._reader is None:
                st = self.status()
                if not st.available:
                    raise ComponentUnavailable(st.detail)
                import easyocr

                store = Path(self.s.models_dir) / "easyocr"
                store.mkdir(parents=True, exist_ok=True)
                self._reader = easyocr.Reader(
                    self.s.ocr_language_list, gpu=self.s.ocr_gpu, model_storage_directory=str(store), verbose=False
                )
        return self._reader

    def read(self, image: Image.Image) -> OcrResult:
        reader = self._get_reader()
        arr = np.asarray(image.convert("RGB"))
        raw = reader.readtext(arr)
        lines = [
            {"text": str(text).strip(), "confidence": round(float(conf), 3)}
            for _box, text, conf in raw
            if str(text).strip()
        ]
        return OcrResult(lines)
