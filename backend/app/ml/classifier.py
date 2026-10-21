"""ResNet50 packaging classifier (authentic vs counterfeit).

Expected asset (NOT included in this repo - you provide it):
  backend/models/resnet50_cosmetics.pt   a torchvision resnet50 whose final layer is Linear(2048, N)
      - either a plain state_dict, or a dict with 'state_dict' / 'model_state_dict' (+ optional 'classes')
  backend/models/labels.json             e.g. ["authentic", "counterfeit"]  (order == output index order)
See docs/MODEL_INTEGRATION.md. Pre-processing here must match your training pipeline.
"""
from __future__ import annotations

import importlib.util
import json
import logging
import threading
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

from app.config import Settings
from app.ml.base import AssetStatus, ComponentUnavailable

log = logging.getLogger(__name__)
DEFAULT_LABELS = ["authentic", "counterfeit"]


@dataclass
class ClassifierResult:
    p_authentic: float
    p_counterfeit: float
    label: str


class CosmeticClassifier:
    def __init__(self, settings: Settings) -> None:
        self.s = settings
        self._lock = threading.Lock()
        self._model = None
        self._labels: list[str] = list(DEFAULT_LABELS)
        self._transform = None
        self._load_error: str | None = None

    @property
    def weights_path(self) -> Path:
        return Path(self.s.models_dir) / self.s.resnet_weights_file

    def status(self) -> AssetStatus:
        name = "ResNet50 packaging classifier"
        fix = "Place your trained weights at backend/models/resnet50_cosmetics.pt (see docs/MODEL_INTEGRATION.md)."
        if not self.s.ml_enabled:
            return AssetStatus("classifier", name, False, "Disabled (ML_ENABLED=false).", ["ML_ENABLED=true"], fix)
        missing = []
        if importlib.util.find_spec("torch") is None or importlib.util.find_spec("torchvision") is None:
            missing.append("python packages: torch, torchvision (pip install -r requirements-ml.txt)")
        if not self.weights_path.is_file():
            missing.append(f"weights file: models/{self.s.resnet_weights_file}")
        if missing:
            return AssetStatus("classifier", name, False, "Required assets are missing.", missing, fix)
        if self._load_error:
            return AssetStatus("classifier", name, False, f"Weights failed to load: {self._load_error}", [], fix)
        return AssetStatus("classifier", name, True, f"Ready ({self.weights_path.name}).")

    def _load(self) -> None:
        if self._model is not None:
            return
        with self._lock:
            if self._model is not None:
                return
            st = self.status()
            if not st.available:
                raise ComponentUnavailable(st.detail)
            import torch
            from torchvision import models, transforms

            try:
                labels = self._read_labels()
                ckpt = torch.load(self.weights_path, map_location="cpu", weights_only=True)
                if isinstance(ckpt, dict):
                    if "classes" in ckpt and isinstance(ckpt["classes"], list):
                        labels = [str(c) for c in ckpt["classes"]]
                    state = ckpt.get("state_dict") or ckpt.get("model_state_dict") or ckpt
                else:
                    raise ValueError("Checkpoint must be a state_dict or a dict containing one.")
                state = {k.removeprefix("module."): v for k, v in state.items()}
                if "authentic" not in labels or "counterfeit" not in labels:
                    raise ValueError("Labels must include 'authentic' and 'counterfeit'.")
                net = models.resnet50(weights=None)
                net.fc = torch.nn.Linear(net.fc.in_features, len(labels))
                net.load_state_dict(state, strict=True)
                net.eval()
            except Exception as exc:  # report precisely instead of crashing the API
                self._load_error = f"{type(exc).__name__}: {str(exc)[:200]}"
                log.exception("Classifier load failed")
                raise ComponentUnavailable(self._load_error) from exc

            self._transform = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ])
            self._labels = labels
            self._model = net

    def _read_labels(self) -> list[str]:
        path = Path(self.s.models_dir) / self.s.labels_file
        if path.is_file():
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, list) and all(isinstance(x, str) for x in data):
                return data
            raise ValueError("labels.json must be a JSON list of strings.")
        return list(DEFAULT_LABELS)

    def predict(self, image: Image.Image) -> ClassifierResult:
        self._load()
        import torch

        x = self._transform(image.convert("RGB")).unsqueeze(0)  # type: ignore[misc]
        with torch.no_grad():
            probs = torch.softmax(self._model(x), dim=1)[0].tolist()  # type: ignore[misc]
        by_label = dict(zip(self._labels, probs))
        top = max(by_label, key=by_label.get)  # type: ignore[arg-type]
        return ClassifierResult(by_label["authentic"], by_label["counterfeit"], top)
