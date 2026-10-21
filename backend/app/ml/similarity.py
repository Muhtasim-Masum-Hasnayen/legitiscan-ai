"""Sentence-BERT comparison of OCR text against YOUR reference product data.

Expected asset (NOT included): backend/data/reference/products.json
  [{"id": "optional", "brand": "...", "product_name": "...",
    "reference_text": "text printed on genuine packaging (string or list of strings)",
    "barcodes": ["optional EAN/UPC strings"]}]
"""
from __future__ import annotations

import importlib.util
import json
import logging
import threading
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from app.config import Settings
from app.ml.base import AssetStatus, ComponentUnavailable

log = logging.getLogger(__name__)


@dataclass
class ReferenceProduct:
    id: str
    brand: str
    product_name: str
    text: str
    barcodes: list[str] = field(default_factory=list)


def load_reference_products(path: Path) -> tuple[list[ReferenceProduct], list[str]]:
    """Return (valid products, human-readable problems)."""
    problems: list[str] = []
    if not path.is_file():
        return [], [f"file not found: {path.name}"]
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [], [f"cannot parse {path.name}: {exc}"]
    items = data.get("products") if isinstance(data, dict) else data
    if not isinstance(items, list):
        return [], ["top level must be a list (or {\"products\": [...]})"]
    products: list[ReferenceProduct] = []
    for i, item in enumerate(items):
        if not isinstance(item, dict):
            problems.append(f"entry {i}: not an object")
            continue
        brand, name, text = item.get("brand"), item.get("product_name"), item.get("reference_text")
        if isinstance(text, list):
            text = " ".join(str(t) for t in text)
        if not (isinstance(brand, str) and brand.strip() and isinstance(name, str) and name.strip()
                and isinstance(text, str) and text.strip()):
            problems.append(f"entry {i}: needs non-empty brand, product_name, reference_text")
            continue
        barcodes = [str(b).strip() for b in item.get("barcodes", []) if str(b).strip()]
        products.append(ReferenceProduct(str(item.get("id") or f"ref-{i}"), brand.strip(), name.strip(), text.strip(), barcodes))
    return products, problems


@dataclass
class MatchResult:
    best: dict
    candidates: list[dict]
    brand_filter_applied: bool


class SemanticMatcher:
    def __init__(self, settings: Settings) -> None:
        self.s = settings
        self._model = None
        self._lock = threading.Lock()
        self._cache_key: tuple | None = None
        self._products: list[ReferenceProduct] = []
        self._emb: np.ndarray | None = None

    def status(self) -> AssetStatus:
        name = "Sentence-BERT reference matcher"
        fix = "Add backend/data/reference/products.json and install requirements-ml.txt (see docs/MODEL_INTEGRATION.md)."
        if not self.s.ml_enabled:
            return AssetStatus("matcher", name, False, "Disabled (ML_ENABLED=false).", ["ML_ENABLED=true"], fix)
        missing = []
        if importlib.util.find_spec("sentence_transformers") is None:
            missing.append("python package: sentence-transformers")
        products, problems = load_reference_products(Path(self.s.reference_data_file))
        if not products:
            missing.append("reference dataset: data/reference/products.json (" + "; ".join(problems[:2]) + ")")
        if missing:
            return AssetStatus("matcher", name, False, "Required assets are missing.", missing, fix)
        extra = f" {len(problems)} invalid entries skipped." if problems else ""
        return AssetStatus("matcher", name, True, f"Ready ({len(products)} reference products).{extra}")

    def _ensure_ready(self) -> None:
        st = self.status()
        if not st.available:
            raise ComponentUnavailable(st.detail)
        path = Path(self.s.reference_data_file)
        key = (str(path), path.stat().st_mtime, self.s.sbert_model)
        if key == self._cache_key and self._emb is not None:
            return
        with self._lock:
            if self._model is None:
                from sentence_transformers import SentenceTransformer

                self._model = SentenceTransformer(self.s.sbert_model)
            products, _ = load_reference_products(path)
            texts = [f"{p.brand} {p.product_name}. {p.text}" for p in products]
            self._emb = np.asarray(self._model.encode(texts, normalize_embeddings=True, convert_to_numpy=True))
            self._products = products
            self._cache_key = key

    def match(self, text: str, brand_hint: str | None = None) -> MatchResult:
        self._ensure_ready()
        idx = list(range(len(self._products)))
        filtered = False
        if brand_hint:
            hint = brand_hint.strip().lower()
            sub = [i for i in idx if hint in self._products[i].brand.lower() or self._products[i].brand.lower() in hint]
            if sub:
                idx, filtered = sub, True
        q = np.asarray(self._model.encode([text], normalize_embeddings=True, convert_to_numpy=True))[0]  # type: ignore[union-attr]
        sims = self._emb[idx] @ q  # type: ignore[index]
        order = np.argsort(-sims)[:3]
        cands = []
        for o in order:
            p = self._products[idx[int(o)]]
            cands.append({"id": p.id, "brand": p.brand, "product_name": p.product_name,
                          "score": round(float(sims[int(o)]), 3), "barcodes": p.barcodes})
        return MatchResult(cands[0], cands, filtered)
